import { beforeAll, describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";

import {
  createOrganization,
  createTestUser,
  json,
  request,
  type TestUser,
} from "./helpers/test-app";

const chainId = 84532;

const validLayout = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <text x="20" y="40">Certificate</text>
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

async function setupOrgWithPublishedTemplate(user: TestUser) {
  const org = await createOrganization(user, "Doc Org");

  const created = await request("POST", `/organizations/${org.id}/templates`, {
    user,
    body: {
      name: `Template ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      layout: validLayout,
      fieldSchema: validFieldSchema,
    },
  });
  expect(created.status).toBe(200);

  const templateBody = await json<{
    id: string;
    versions: Array<{ id: string }>;
  }>(created);
  const templateId = templateBody.id;
  const versionId = templateBody.versions[0]!.id;

  const published = await request(
    "POST",
    `/organizations/${org.id}/templates/${templateId}/versions/${versionId}/publish`,
    { user }
  );
  expect(published.status).toBe(200);

  return { orgId: org.id, templateId, versionId };
}

async function registerWallet(user: TestUser, orgId: string) {
  const hash = createHash("sha256").update(user.email).digest();
  const privateKey = `0x${Buffer.from(hash).toString("hex")}` as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  const challenge = await request(
    "POST",
    `/organizations/${orgId}/wallets/challenge`,
    { user, body: { address: account.address, chainId } }
  );
  expect(challenge.status).toBe(200);
  const { message } = await json<{ message: string }>(challenge);
  const signature = await account.signMessage({ message });

  const created = await request("POST", `/organizations/${orgId}/wallets`, {
    user,
    body: { address: account.address, message, signature, label: "Primary" },
  });
  expect(created.status).toBe(200);

  const walletBody = await json<{ id: string }>(created);
  return { walletId: walletBody.id, address: account.address };
}

// ===========================================================================
// POST /organizations/:organizationId/documents
// ===========================================================================

describe("POST /organizations/:organizationId/documents", () => {
  let user: TestUser;
  let orgId: string;
  let templateVersionId: string;
  let walletId: string;

  beforeAll(async () => {
    user = await createTestUser("doc-create");
    const setup = await setupOrgWithPublishedTemplate(user);
    orgId = setup.orgId;
    templateVersionId = setup.versionId;
    const wallet = await registerWallet(user, orgId);
    walletId = wallet.walletId;
  });

  it("returns 200 and creates a ready document", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents`,
      {
        user,
        body: {
          templateVersionId,
          issuerWalletId: walletId,
          fields: { recipient_name: "Ada", course_title: "CS" },
        },
      }
    );
    expect(response.status).toBe(200);

    const body = await json<{
      id: string;
      status: string;
      leaf: string | null;
      claimedIssuedAt: string | null;
      payloadEnc: string;
      kekId: string;
    }>(response);

    expect(body.status).toBe("ready");
    expect(body.leaf).toMatch(/^0x[0-9a-f]{64}$/);
    expect(body.claimedIssuedAt).not.toBeNull();
    expect(body.payloadEnc.length).toBeGreaterThan(0);
    expect(body.kekId.length).toBeGreaterThan(0);
  });

  it("returns 200 and creates a draft document without a leaf", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents`,
      {
        user,
        body: {
          templateVersionId,
          issuerWalletId: walletId,
          fields: { recipient_name: "Ada", course_title: "CS" },
          mode: "draft",
        },
      }
    );
    expect(response.status).toBe(200);

    const body = await json<{
      status: string;
      leaf: string | null;
      claimedIssuedAt: string | null;
    }>(response);
    expect(body.status).toBe("draft");
    expect(body.leaf).toBeNull();
    expect(body.claimedIssuedAt).toBeNull();
  });

  it("accepts an optional recipient", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents`,
      {
        user,
        body: {
          templateVersionId,
          issuerWalletId: walletId,
          fields: { recipient_name: "Ada", course_title: "CS" },
          recipient: { name: "Ada Lovelace", email: "ada@test.local" },
        },
      }
    );
    expect(response.status).toBe(200);
  });

  it("accepts an expiresAt", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents`,
      {
        user,
        body: {
          templateVersionId,
          issuerWalletId: walletId,
          fields: { recipient_name: "Ada", course_title: "CS" },
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        },
      }
    );
    expect(response.status).toBe(200);
    const body = await json<{ expiresAt: string | null }>(response);
    expect(body.expiresAt).not.toBeNull();
  });

  it("accepts an externalRef", async () => {
    const ref = `ref-${Date.now()}`;
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents`,
      {
        user,
        body: {
          templateVersionId,
          issuerWalletId: walletId,
          fields: { recipient_name: "Ada", course_title: "CS" },
          externalRef: ref,
        },
      }
    );
    expect(response.status).toBe(200);
    const body = await json<{ externalRef: string | null }>(response);
    expect(body.externalRef).toBe(ref);
  });

  it("uses the default wallet when issuerWalletId is omitted", async () => {
    // Set default wallet in settings
    await request("PATCH", `/organizations/${orgId}/settings`, {
      user,
      body: { defaultWalletId: walletId },
    });

    const response = await request(
      "POST",
      `/organizations/${orgId}/documents`,
      {
        user,
        body: {
          templateVersionId,
          fields: { recipient_name: "Ada", course_title: "CS" },
        },
      }
    );
    expect(response.status).toBe(200);
  });

  it("returns 422 when a required field is missing", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents`,
      {
        user,
        body: {
          templateVersionId,
          issuerWalletId: walletId,
          fields: { recipient_name: "Ada" },
        },
      }
    );
    expect(response.status).toBe(422);
  });

  it("returns 422 for an unknown field", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents`,
      {
        user,
        body: {
          templateVersionId,
          issuerWalletId: walletId,
          fields: {
            recipient_name: "Ada",
            course_title: "CS",
            mystery: "x",
          },
        },
      }
    );
    expect(response.status).toBe(422);
  });

  it("returns 404 for a nonexistent template version", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents`,
      {
        user,
        body: {
          templateVersionId: "does-not-exist",
          issuerWalletId: walletId,
          fields: { recipient_name: "A", course_title: "B" },
        },
      }
    );
    expect(response.status).toBe(404);
  });

  it("returns 409 when using an unpublished template version", async () => {
    const created = await request("POST", `/organizations/${orgId}/templates`, {
      user,
      body: {
        name: `Unpublished ${Date.now()}`,
        layout: validLayout,
        fieldSchema: validFieldSchema,
      },
    });
    const templateBody = await json<{
      id: string;
      versions: Array<{ id: string }>;
    }>(created);

    const response = await request(
      "POST",
      `/organizations/${orgId}/documents`,
      {
        user,
        body: {
          templateVersionId: templateBody.versions[0]!.id,
          issuerWalletId: walletId,
          fields: { recipient_name: "A", course_title: "B" },
        },
      }
    );
    expect(response.status).toBe(409);
  });

  it("returns 409 for a duplicate externalRef in the same org", async () => {
    const ref = `dup-${Date.now()}`;
    const first = await request("POST", `/organizations/${orgId}/documents`, {
      user,
      body: {
        templateVersionId,
        issuerWalletId: walletId,
        fields: { recipient_name: "A", course_title: "B" },
        externalRef: ref,
      },
    });
    expect(first.status).toBe(200);

    const second = await request("POST", `/organizations/${orgId}/documents`, {
      user,
      body: {
        templateVersionId,
        issuerWalletId: walletId,
        fields: { recipient_name: "C", course_title: "D" },
        externalRef: ref,
      },
    });
    expect(second.status).toBe(409);
  });

  it("returns 403 for an outsider", async () => {
    const outsider = await createTestUser("doc-outsider");
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents`,
      {
        user: outsider,
        body: {
          templateVersionId,
          issuerWalletId: walletId,
          fields: { recipient_name: "A", course_title: "B" },
        },
      }
    );
    expect(response.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents`,
      {
        body: {
          templateVersionId,
          issuerWalletId: walletId,
          fields: { recipient_name: "A", course_title: "B" },
        },
      }
    );
    expect(response.status).toBe(401);
  });
});

// ===========================================================================
// GET /organizations/:organizationId/documents/:documentId
// ===========================================================================

describe("GET /organizations/:organizationId/documents/:documentId", () => {
  let user: TestUser;
  let orgId: string;
  let documentId: string;

  beforeAll(async () => {
    user = await createTestUser("doc-get");
    const setup = await setupOrgWithPublishedTemplate(user);
    orgId = setup.orgId;
    const wallet = await registerWallet(user, orgId);

    const created = await request("POST", `/organizations/${orgId}/documents`, {
      user,
      body: {
        templateVersionId: setup.versionId,
        issuerWalletId: wallet.walletId,
        fields: { recipient_name: "Ada", course_title: "CS" },
        recipient: { name: "Ada Lovelace", email: "ada@test.local" },
      },
    });
    expect(created.status).toBe(200);
    documentId = (await json<{ id: string }>(created)).id;
  });

  it("returns 200 with decrypted fields and recipient", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/documents/${documentId}`,
      { user }
    );
    expect(response.status).toBe(200);

    const body = await json<{
      id: string;
      fields: Record<string, unknown>;
      recipient: { email: string; name: string } | null;
      payloadEnc: string;
      kekId: string;
    }>(response);

    expect(body.id).toBe(documentId);
    expect(body.fields).toEqual({
      recipient_name: "Ada",
      course_title: "CS",
    });
    expect(body.recipient).toEqual({
      email: "ada@test.local",
      name: "Ada Lovelace",
    });
    // Never expose salt or holderKey
    expect(body).not.toHaveProperty("salt");
    expect(body).not.toHaveProperty("holderKey");
  });

  it("returns 404 for a nonexistent document", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/documents/does-not-exist`,
      { user }
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 for cross-org access", async () => {
    const other = await createTestUser("doc-get-other");
    const otherOrg = await createOrganization(other, "Other Get Org");
    const otherSetup = await setupOrgWithPublishedTemplate(other);
    const otherWallet = await registerWallet(other, otherSetup.orgId);

    const otherCreated = await request(
      "POST",
      `/organizations/${otherSetup.orgId}/documents`,
      {
        user: other,
        body: {
          templateVersionId: otherSetup.versionId,
          issuerWalletId: otherWallet.walletId,
          fields: { recipient_name: "A", course_title: "B" },
        },
      }
    );
    const otherBody = await json<{ id: string }>(otherCreated);

    const response = await request(
      "GET",
      `/organizations/${orgId}/documents/${otherBody.id}`,
      { user }
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/documents/${documentId}`
    );
    expect(response.status).toBe(401);
  });
});

// ===========================================================================
// GET /organizations/:organizationId/documents
// ===========================================================================

describe("GET /organizations/:organizationId/documents", () => {
  let user: TestUser;
  let orgId: string;
  let templateVersionId: string;
  let walletId: string;

  beforeAll(async () => {
    user = await createTestUser("doc-list");
    const setup = await setupOrgWithPublishedTemplate(user);
    orgId = setup.orgId;
    templateVersionId = setup.versionId;
    const wallet = await registerWallet(user, orgId);
    walletId = wallet.walletId;

    for (let i = 0; i < 3; i += 1) {
      await request("POST", `/organizations/${orgId}/documents`, {
        user,
        body: {
          templateVersionId,
          issuerWalletId: walletId,
          fields: { recipient_name: `Ada ${i}`, course_title: "CS" },
        },
      });
    }
  });

  it("returns 200 with the listed documents", async () => {
    const response = await request("GET", `/organizations/${orgId}/documents`, {
      user,
    });
    expect(response.status).toBe(200);

    const body = await json<{
      data: Array<{ id: string }>;
      meta: { limit: number; offset: number; total: number };
    }>(response);
    expect(body.data.length).toBeGreaterThanOrEqual(3);
    expect(body.meta.total).toBeGreaterThanOrEqual(3);
  });

  it("returns 200 and respects limit/offset", async () => {
    const first = await request("GET", `/organizations/${orgId}/documents`, {
      user,
      query: { limit: 1, offset: 0 },
    });
    const second = await request("GET", `/organizations/${orgId}/documents`, {
      user,
      query: { limit: 1, offset: 1 },
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const firstBody = await json<{ data: Array<{ id: string }> }>(first);
    const secondBody = await json<{ data: Array<{ id: string }> }>(second);
    expect(firstBody.data[0]!.id).not.toBe(secondBody.data[0]!.id);
  });

  it("filters by status", async () => {
    const response = await request("GET", `/organizations/${orgId}/documents`, {
      user,
      query: { status: "ready" },
    });
    expect(response.status).toBe(200);

    const body = await json<{ data: Array<{ status: string }> }>(response);
    for (const doc of body.data) {
      expect(doc.status).toBe("ready");
    }
  });

  it("filters by templateVersionId", async () => {
    const response = await request("GET", `/organizations/${orgId}/documents`, {
      user,
      query: { templateVersionId },
    });
    expect(response.status).toBe(200);

    const body = await json<{
      data: Array<{ templateVersionId: string }>;
    }>(response);
    for (const doc of body.data) {
      expect(doc.templateVersionId).toBe(templateVersionId);
    }
  });

  it("returns 422 for an invalid status", async () => {
    const response = await request("GET", `/organizations/${orgId}/documents`, {
      user,
      query: { status: "not-a-status" },
    });
    expect(response.status).toBe(422);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request("GET", `/organizations/${orgId}/documents`);
    expect(response.status).toBe(401);
  });

  it("returns 403 for an outsider", async () => {
    const outsider = await createTestUser("doc-list-outsider");
    const response = await request("GET", `/organizations/${orgId}/documents`, {
      user: outsider,
    });
    expect(response.status).toBe(403);
  });
});

// ===========================================================================
// PATCH /organizations/:organizationId/documents/:documentId
// ===========================================================================

describe("PATCH /organizations/:organizationId/documents/:documentId", () => {
  let user: TestUser;
  let orgId: string;
  let templateVersionId: string;
  let walletId: string;

  beforeAll(async () => {
    user = await createTestUser("doc-patch");
    const setup = await setupOrgWithPublishedTemplate(user);
    orgId = setup.orgId;
    templateVersionId = setup.versionId;
    const wallet = await registerWallet(user, orgId);
    walletId = wallet.walletId;
  });

  async function createDraft(): Promise<string> {
    const created = await request("POST", `/organizations/${orgId}/documents`, {
      user,
      body: {
        templateVersionId,
        issuerWalletId: walletId,
        fields: { recipient_name: "Ada", course_title: "CS" },
        mode: "draft",
      },
    });
    expect(created.status).toBe(200);
    return (await json<{ id: string }>(created)).id;
  }

  it("returns 200 when updating fields on a draft", async () => {
    const documentId = await createDraft();
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/documents/${documentId}`,
      {
        user,
        body: {
          fields: { recipient_name: "Grace", course_title: "Math" },
        },
      }
    );
    expect(response.status).toBe(200);
  });

  it("returns 200 when updating recipient on a draft", async () => {
    const documentId = await createDraft();
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/documents/${documentId}`,
      {
        user,
        body: {
          recipient: { name: "Grace Hopper", email: "grace@test.local" },
        },
      }
    );
    expect(response.status).toBe(200);
  });

  it("returns 200 when finalize=true promotes to ready", async () => {
    const documentId = await createDraft();
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/documents/${documentId}`,
      { user, body: { finalize: true } }
    );
    expect(response.status).toBe(200);

    const body = await json<{ status: string; leaf: string | null }>(response);
    expect(body.status).toBe("ready");
    expect(body.leaf).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("returns 422 for an empty update", async () => {
    const documentId = await createDraft();
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/documents/${documentId}`,
      { user, body: {} }
    );
    expect(response.status).toBe(422);
  });

  it("returns 409 when editing a non-draft document", async () => {
    const created = await request("POST", `/organizations/${orgId}/documents`, {
      user,
      body: {
        templateVersionId,
        issuerWalletId: walletId,
        fields: { recipient_name: "Ada", course_title: "CS" },
        mode: "ready",
      },
    });
    const documentId = (await json<{ id: string }>(created)).id;

    const response = await request(
      "PATCH",
      `/organizations/${orgId}/documents/${documentId}`,
      {
        user,
        body: { fields: { recipient_name: "Grace", course_title: "Math" } },
      }
    );
    expect(response.status).toBe(409);
  });

  it("returns 404 for a nonexistent document", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/documents/does-not-exist`,
      { user, body: { fields: { recipient_name: "X", course_title: "Y" } } }
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    const documentId = await createDraft();
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/documents/${documentId}`,
      { body: { finalize: true } }
    );
    expect(response.status).toBe(401);
  });
});

// ===========================================================================
// DELETE /organizations/:organizationId/documents/:documentId
// ===========================================================================

describe("DELETE /organizations/:organizationId/documents/:documentId", () => {
  let user: TestUser;
  let orgId: string;
  let templateVersionId: string;
  let walletId: string;

  beforeAll(async () => {
    user = await createTestUser("doc-delete");
    const setup = await setupOrgWithPublishedTemplate(user);
    orgId = setup.orgId;
    templateVersionId = setup.versionId;
    const wallet = await registerWallet(user, orgId);
    walletId = wallet.walletId;
  });

  it("returns 200 when deleting a draft", async () => {
    const created = await request("POST", `/organizations/${orgId}/documents`, {
      user,
      body: {
        templateVersionId,
        issuerWalletId: walletId,
        fields: { recipient_name: "Ada", course_title: "CS" },
        mode: "draft",
      },
    });
    const documentId = (await json<{ id: string }>(created)).id;

    const response = await request(
      "DELETE",
      `/organizations/${orgId}/documents/${documentId}`,
      { user }
    );
    expect(response.status).toBe(200);
  });

  it("returns 200 when deleting a ready document", async () => {
    const created = await request("POST", `/organizations/${orgId}/documents`, {
      user,
      body: {
        templateVersionId,
        issuerWalletId: walletId,
        fields: { recipient_name: "Ada", course_title: "CS" },
        mode: "ready",
      },
    });
    const documentId = (await json<{ id: string }>(created)).id;

    const response = await request(
      "DELETE",
      `/organizations/${orgId}/documents/${documentId}`,
      { user }
    );
    expect(response.status).toBe(200);
  });

  it("returns 404 for a nonexistent document", async () => {
    const response = await request(
      "DELETE",
      `/organizations/${orgId}/documents/does-not-exist`,
      { user }
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    const created = await request("POST", `/organizations/${orgId}/documents`, {
      user,
      body: {
        templateVersionId,
        issuerWalletId: walletId,
        fields: { recipient_name: "Ada", course_title: "CS" },
        mode: "draft",
      },
    });
    const documentId = (await json<{ id: string }>(created)).id;

    const response = await request(
      "DELETE",
      `/organizations/${orgId}/documents/${documentId}`
    );
    expect(response.status).toBe(401);
  });
});

// ===========================================================================
// POST /organizations/:organizationId/documents/bulk
// ===========================================================================

describe("POST /organizations/:organizationId/documents/bulk", () => {
  let user: TestUser;
  let orgId: string;
  let templateVersionId: string;
  let walletId: string;

  beforeAll(async () => {
    user = await createTestUser("doc-bulk");
    const setup = await setupOrgWithPublishedTemplate(user);
    orgId = setup.orgId;
    templateVersionId = setup.versionId;
    const wallet = await registerWallet(user, orgId);
    walletId = wallet.walletId;
  });

  it("returns 200 and creates multiple documents", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents/bulk`,
      {
        user,
        body: {
          templateVersionId,
          issuerWalletId: walletId,
          items: [
            {
              fields: { recipient_name: "Ada", course_title: "CS" },
              issuerWalletId: walletId,
            },
            {
              fields: { recipient_name: "Grace", course_title: "Math" },
              issuerWalletId: walletId,
            },
            {
              fields: { recipient_name: "Alan", course_title: "Physics" },
              issuerWalletId: walletId,
            },
          ],
        },
      }
    );
    expect(response.status).toBe(200);

    const body = await json<{
      created: number;
      documents: Array<{ id: string }>;
    }>(response);
    expect(body.created).toBe(3);
    expect(body.documents).toHaveLength(3);
  });

  it("returns 422 when one item is invalid (atomic)", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents/bulk`,
      {
        user,
        body: {
          templateVersionId,
          items: [
            {
              fields: { recipient_name: "Ada", course_title: "CS" },
              issuerWalletId: walletId,
            },
            {
              fields: { recipient_name: "Grace" }, // missing course_title
              issuerWalletId: walletId,
            },
          ],
        },
      }
    );
    expect(response.status).toBe(422);
  });

  it("returns 422 for more than 500 items", async () => {
    const items = Array.from({ length: 501 }, (_, i) => ({
      fields: { recipient_name: `Person ${i}`, course_title: "CS" },
      issuerWalletId: walletId,
    }));

    const response = await request(
      "POST",
      `/organizations/${orgId}/documents/bulk`,
      { user, body: { templateVersionId, items } }
    );
    expect(response.status).toBe(422);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/documents/bulk`,
      {
        body: {
          templateVersionId,
          items: [
            {
              fields: { recipient_name: "Ada", course_title: "CS" },
              issuerWalletId: walletId,
            },
          ],
        },
      }
    );
    expect(response.status).toBe(401);
  });
});

// ===========================================================================
// Cross-tenant isolation
// ===========================================================================

describe("Document isolation across organizations", () => {
  let userA: TestUser;
  let userB: TestUser;
  let orgA: string;
  let orgB: string;
  let documentA: string;

  beforeAll(async () => {
    userA = await createTestUser("doc-iso-a");
    userB = await createTestUser("doc-iso-b");
    const setupA = await setupOrgWithPublishedTemplate(userA);
    const setupB = await setupOrgWithPublishedTemplate(userB);
    orgA = setupA.orgId;
    orgB = setupB.orgId;
    const walletA = await registerWallet(userA, orgA);
    await registerWallet(userB, orgB);

    const created = await request("POST", `/organizations/${orgA}/documents`, {
      user: userA,
      body: {
        templateVersionId: setupA.versionId,
        issuerWalletId: walletA.walletId,
        fields: { recipient_name: "Ada", course_title: "CS" },
      },
    });
    documentA = (await json<{ id: string }>(created)).id;
  });

  it("returns 404 when B reads A's document", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgB}/documents/${documentA}`,
      { user: userB }
    );
    expect(response.status).toBe(404);
  });

  it("returns 403 when B lists A's documents", async () => {
    const response = await request("GET", `/organizations/${orgA}/documents`, {
      user: userB,
    });
    expect(response.status).toBe(403);
  });

  it("returns 404 when B deletes A's document", async () => {
    const response = await request(
      "DELETE",
      `/organizations/${orgB}/documents/${documentA}`,
      { user: userB }
    );
    expect(response.status).toBe(404);
  });
});
