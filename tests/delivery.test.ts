import { beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";

import { db } from "../src/db";
import { batches } from "../src/db/schema/batch.schema";
import { documents } from "../src/db/schema/document.schema";
import {
  createOrganization,
  createTestUser,
  json,
  request,
  type TestUser,
} from "./helpers/test-app";

const chainId = 84532;

const validLayout = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <text x="20" y="80">{{recipient_name}}</text>
  <text x="20" y="120">{{course_title}}</text>
</svg>`;

const validFieldSchema = {
  fields: [
    {
      key: "recipient_name",
      label: "Recipient Name",
      type: "text" as const,
      required: true,
    },
    {
      key: "course_title",
      label: "Course Title",
      type: "text" as const,
      required: true,
    },
  ],
};

async function setup(user: TestUser, suffix = "Delivery") {
  const org = await createOrganization(user, `${suffix} Org`);

  const template = await request("POST", `/organizations/${org.id}/templates`, {
    user,
    body: {
      name: `Template ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      layout: validLayout,
      fieldSchema: validFieldSchema,
    },
  });
  const templateBody = await json<{
    id: string;
    versions: Array<{ id: string }>;
  }>(template);
  const versionId = templateBody.versions[0]!.id;

  await request(
    "POST",
    `/organizations/${org.id}/templates/${templateBody.id}/versions/${versionId}/publish`,
    { user }
  );

  const hash = createHash("sha256").update(user.email).digest();
  const privateKey = `0x${Buffer.from(hash).toString("hex")}` as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  const challenge = await request(
    "POST",
    `/organizations/${org.id}/wallets/challenge`,
    { user, body: { address: account.address, chainId } }
  );
  const { message } = await json<{ message: string }>(challenge);
  const signature = await account.signMessage({ message });

  const wallet = await request("POST", `/organizations/${org.id}/wallets`, {
    user,
    body: { address: account.address, message, signature, label: "Primary" },
  });
  const walletId = (await json<{ id: string }>(wallet)).id;

  return { account, orgId: org.id, templateVersionId: versionId, walletId };
}

async function createReadyDocument(
  user: TestUser,
  orgId: string,
  templateVersionId: string,
  walletId: string,
  withRecipient = true
): Promise<string> {
  const response = await request("POST", `/organizations/${orgId}/documents`, {
    user,
    body: {
      fields: { course_title: "CS", recipient_name: "Ada Lovelace" },
      issuerWalletId: walletId,
      recipient: withRecipient
        ? { email: "ada@test.local", name: "Ada Lovelace" }
        : undefined,
      templateVersionId,
    },
  });
  expect(response.status).toBe(200);
  return (await json<{ id: string }>(response)).id;
}

async function markIssued(batchId: string) {
  await db
    .update(batches)
    .set({
      blockNumber: "12345678",
      blockTimestamp: new Date(),
      confirmedAt: new Date(),
      status: "confirmed",
      txHash: `0x${"aa".repeat(32)}`,
    })
    .where(eq(batches.id, batchId));

  await db
    .update(documents)
    .set({ status: "issued", updatedAt: new Date() })
    .where(eq(documents.batchId, batchId));
}

async function sealAndSign(
  user: TestUser,
  account: ReturnType<typeof privateKeyToAccount>,
  orgId: string,
  walletId: string
): Promise<{ batchId: string; documentIds: string[] }> {
  const sealed = await request("POST", `/organizations/${orgId}/batches/seal`, {
    user,
    body: { issuerWalletId: walletId },
  });
  expect(sealed.status).toBe(200);

  const sealedBody = await json<{
    id: string;
    typedData: {
      domain: Record<string, unknown>;
      message: Record<string, unknown>;
      primaryType: string;
      types: Record<string, Array<{ name: string; type: string }>>;
    };
  }>(sealed);
  const batchId = sealedBody.id;

  const signature = await account.signTypedData({
    domain: sealedBody.typedData.domain as Parameters<
      typeof account.signTypedData
    >[0]["domain"],
    message: sealedBody.typedData.message as Parameters<
      typeof account.signTypedData
    >[0]["message"],
    primaryType: "Anchor",
    types: sealedBody.typedData.types as Parameters<
      typeof account.signTypedData
    >[0]["types"],
  });

  const submitted = await request(
    "POST",
    `/organizations/${orgId}/batches/${batchId}/signature`,
    { user, body: { signature } }
  );
  expect(submitted.status).toBe(200);

  await markIssued(batchId);

  const docsResponse = await request(
    "GET",
    `/organizations/${orgId}/documents`,
    { user, query: { batchId } }
  );
  const docsBody = await json<{ data: Array<{ id: string }> }>(docsResponse);

  return { batchId, documentIds: docsBody.data.map((d) => d.id) };
}

// ===========================================================================
// GET /documents/:id/bundle
// ===========================================================================

describe("GET /organizations/:organizationId/documents/:documentId/bundle", () => {
  let user: TestUser;
  let orgId: string;
  let templateVersionId: string;
  let walletId: string;
  let documentId: string;

  beforeAll(async () => {
    user = await createTestUser("bundle");
    const s = await setup(user, "Bundle");
    orgId = s.orgId;
    templateVersionId = s.templateVersionId;
    walletId = s.walletId;

    documentId = await createReadyDocument(
      user,
      orgId,
      templateVersionId,
      walletId
    );
    await sealAndSign(user, s.account, orgId, walletId);
  });

  it("returns 200 with the full proof bundle", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/documents/${documentId}/bundle`,
      { user }
    );
    expect(response.status).toBe(200);

    const body = await json<{
      version: number;
      chainId: number;
      registry: string;
      issuer: string;
      root: string;
      leaf: string;
      leafIndex: number;
      proof: string[];
      holderKey: string;
      salt: string;
      fields: Record<string, unknown>;
      recipient: { email: string; name: string } | null;
      claimedIssuedAt: number;
      expiresAt: number;
      schemaHash: string;
      txHash: string | null;
      blockNumber: string | null;
      windowStart: number;
      windowEnd: number;
    }>(response);

    expect(body.version).toBe(1);
    expect(body.chainId).toBe(chainId);
    expect(body.registry).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(body.issuer).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(body.root).toMatch(/^0x[0-9a-f]{64}$/);
    expect(body.leaf).toMatch(/^0x[0-9a-f]{64}$/);
    expect(body.leafIndex).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(body.proof)).toBe(true);
    expect(typeof body.holderKey).toBe("string");
    expect(body.holderKey.length).toBeGreaterThan(0);
    expect(typeof body.salt).toBe("string");
    expect(body.salt.length).toBeGreaterThan(0);
    expect(body.fields).toEqual({
      course_title: "CS",
      recipient_name: "Ada Lovelace",
    });
    expect(body.recipient).toEqual({
      email: "ada@test.local",
      name: "Ada Lovelace",
    });
    expect(body.claimedIssuedAt).toBeGreaterThan(0);
    expect(body.schemaHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(body.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(body.blockNumber).toBe("12345678");
  });

  it("returns 409 for a ready but unbatched document", async () => {
    const unbatched = await createReadyDocument(
      user,
      orgId,
      templateVersionId,
      walletId
    );

    const response = await request(
      "GET",
      `/organizations/${orgId}/documents/${unbatched}/bundle`,
      { user }
    );
    expect(response.status).toBe(409);
  });

  it("returns 404 for a nonexistent document", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/documents/does-not-exist/bundle`,
      { user }
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 for cross-org access", async () => {
    const other = await createTestUser("bundle-other");
    const otherSetup = await setup(other, "BundleOther");

    const response = await request(
      "GET",
      `/organizations/${otherSetup.orgId}/documents/${documentId}/bundle`,
      { user: other }
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/documents/${documentId}/bundle`
    );
    expect(response.status).toBe(401);
  });
});

// ===========================================================================
// GET /documents/:id/pdf
// ===========================================================================

describe("GET /organizations/:organizationId/documents/:documentId/pdf", () => {
  let user: TestUser;
  let orgId: string;
  let documentId: string;

  beforeAll(async () => {
    user = await createTestUser("pdf");
    const s = await setup(user, "Pdf");
    orgId = s.orgId;

    documentId = await createReadyDocument(
      user,
      orgId,
      s.templateVersionId,
      s.walletId
    );
    await sealAndSign(user, s.account, orgId, s.walletId);
  });

  it("returns a signed URL for an issued document", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/documents/${documentId}/pdf`,
      { user }
    );
    expect(response.status).toBe(200);

    const body = await json<{ url: string; key: string; expiresIn: number }>(
      response
    );
    expect(body.url).toContain("pdf/");
    expect(body.key).toBe(`pdf/${documentId}.pdf`);
    expect(body.expiresIn).toBeGreaterThan(0);
  });

  it("returns a watermarked PDF inline for preview=true", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/documents/${documentId}/pdf`,
      { user, query: { preview: "true" } }
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");

    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(0);
    expect(bytes[0]).toBe(0x25);
    expect(bytes[1]).toBe(0x50);
    expect(bytes[2]).toBe(0x44);
    expect(bytes[3]).toBe(0x46);
  });

  it("returns 404 for a nonexistent document", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/documents/does-not-exist/pdf`,
      { user }
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/documents/${documentId}/pdf`
    );
    expect(response.status).toBe(401);
  });
});

// ===========================================================================
// POST /documents/:id/resend
// ===========================================================================

describe("POST /organizations/:organizationId/documents/:documentId/resend", () => {
  let user: TestUser;
  let orgId: string;
  let issuedDocumentId: string;
  let readyDocumentId: string;
  let noRecipientUser: TestUser;
  let noRecipientOrgId: string;
  let noRecipientDocumentId: string;

  beforeAll(async () => {
    user = await createTestUser("resend");
    const s = await setup(user, "Resend");
    orgId = s.orgId;

    issuedDocumentId = await createReadyDocument(
      user,
      orgId,
      s.templateVersionId,
      s.walletId
    );
    await sealAndSign(user, s.account, orgId, s.walletId);

    readyDocumentId = await createReadyDocument(
      user,
      orgId,
      s.templateVersionId,
      s.walletId
    );

    noRecipientUser = await createTestUser("resend-no-recipient");
    const ns = await setup(noRecipientUser, "ResendNoRecipient");
    noRecipientOrgId = ns.orgId;

    noRecipientDocumentId = await createReadyDocument(
      noRecipientUser,
      noRecipientOrgId,
      ns.templateVersionId,
      ns.walletId,
      false
    );
    await sealAndSign(
      noRecipientUser,
      ns.account,
      noRecipientOrgId,
      ns.walletId
    );
  });

  it("returns 200 and enqueues a delivery for an issued document", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents/${issuedDocumentId}/resend`,
      { user }
    );
    expect(response.status).toBe(200);

    const body = await json<{
      id: string;
      documentId: string;
      status: string;
      channel: string;
    }>(response);
    expect(body.id).toBeDefined();
    expect(body.documentId).toBe(issuedDocumentId);
    expect(body.status).toBe("queued");
    expect(body.channel).toBe("email");
  });

  it("returns 409 for a document that is not yet issued", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents/${readyDocumentId}/resend`,
      { user }
    );
    expect(response.status).toBe(409);
  });

  it("returns 422 when the document has no recipient email", async () => {
    const response = await request(
      "POST",
      `/organizations/${noRecipientOrgId}/documents/${noRecipientDocumentId}/resend`,
      { user: noRecipientUser }
    );
    expect(response.status).toBe(422);
  });

  it("returns 404 for a nonexistent document", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents/does-not-exist/resend`,
      { user }
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents/${issuedDocumentId}/resend`
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 for an outsider", async () => {
    const outsider = await createTestUser("resend-outsider");
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents/${issuedDocumentId}/resend`,
      { user: outsider }
    );
    expect(response.status).toBe(403);
  });
});

// ===========================================================================
// QR URL format (unit)
// ===========================================================================

describe("QR URL builder", () => {
  it("puts the holder key in the URL fragment", async () => {
    const { buildVerifyUrl } =
      await import("../src/features/documents/document.qr");

    const url = buildVerifyUrl({
      chainId: 84532,
      holderKey: "aGVsbG8td29ybGQ=",
      issuer: "0x0000000000000000000000000000000000000001",
      leaf: "0x1111111111111111111111111111111111111111111111111111111111111111",
      registry: "0x0000000000000000000000000000000000000002",
    });

    expect(url).toContain("/verify?");
    expect(url).toContain("c=84532");
    expect(url).toContain("i=0x0000000000000000000000000000000000000001");
    expect(url).toContain(
      "l=0x1111111111111111111111111111111111111111111111111111111111111111"
    );
    expect(url).toContain("r=0x0000000000000000000000000000000000000002");
    expect(url).toContain("#k=");
    expect(url.split("#k=")[1]).toBe("aGVsbG8td29ybGQ");
  });

  it("base64url-encodes the holder key without padding", async () => {
    const { buildVerifyUrl } =
      await import("../src/features/documents/document.qr");

    const url = buildVerifyUrl({
      chainId: 1,
      holderKey: "ab+/cd==",
      issuer: "0x0000000000000000000000000000000000000001",
      leaf: "0x1111111111111111111111111111111111111111111111111111111111111111",
      registry: "0x0000000000000000000000000000000000000002",
    });

    const fragment = url.split("#k=")[1]!;
    expect(fragment).not.toContain("+");
    expect(fragment).not.toContain("/");
    expect(fragment).not.toContain("=");
  });
});

// ===========================================================================
// Bundle round trip (integration)
// ===========================================================================

describe("Bundle round trip", () => {
  it("recomputes a leaf that verifies against the proof", async () => {
    const { computeLeaf } = await import("../src/shared/crypto");
    const { verifyProof } = await import("../src/shared/merkle");

    const user = await createTestUser("roundtrip");
    const s = await setup(user, "Roundtrip");

    const docId = await createReadyDocument(
      user,
      s.orgId,
      s.templateVersionId,
      s.walletId
    );
    await sealAndSign(user, s.account, s.orgId, s.walletId);

    const bundleResponse = await request(
      "GET",
      `/organizations/${s.orgId}/documents/${docId}/bundle`,
      { user }
    );
    expect(bundleResponse.status).toBe(200);

    const bundle = await json<{
      chainId: number;
      registry: `0x${string}`;
      issuer: `0x${string}`;
      root: `0x${string}`;
      leaf: `0x${string}`;
      proof: string[];
      holderKey: string;
      salt: string;
      fields: Record<string, unknown>;
      claimedIssuedAt: number;
      expiresAt: number;
      schemaHash: `0x${string}`;
    }>(bundleResponse);

    const recomputedLeaf = computeLeaf({
      chainId: bundle.chainId,
      claimedIssuedAt: bundle.claimedIssuedAt,
      expiresAt: bundle.expiresAt,
      fields: bundle.fields,
      issuerAddress: bundle.issuer,
      registryAddress: bundle.registry,
      salt: new Uint8Array(Buffer.from(bundle.salt, "base64")),
      schemaHash: bundle.schemaHash,
    });

    expect(recomputedLeaf).toBe(bundle.leaf);
    expect(verifyProof(bundle.root, bundle.leaf, bundle.proof)).toBe(true);
  });
});
