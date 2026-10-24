import { afterAll, describe, expect, it } from "bun:test";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// 1. Set env FIRST.
process.env.CHAIN_ID = "31337";
process.env.CONFIRMATIONS = "1";
process.env.INDEXER_POLL_MS = "1000";

// 2. Dynamic import of chain helpers.
const { HARDHAT_ISSUER_KEY, deployRegistry, startHardhatNode } =
  await import("../chain/helpers");

const node = await startHardhatNode();
const registryCtx = await deployRegistry(node.rpcUrl);

process.env.REGISTRY_ADDRESS = registryCtx.address;
process.env.RPC_URLS = node.rpcUrl;
process.env.RELAYER_PRIVATE_KEY = HARDHAT_ISSUER_KEY;

const { db } = await import("../../src/db");
const { indexerState } = await import("../../src/db/schema/chain.schema");
await db.delete(indexerState);

// 3. Import the app, then start the BullMQ workers.
const { app } = await import("../../src/app");
await import("../../src/queues/workers/index");

afterAll(async () => {
  await node.kill();
});

// ---------- helpers ----------

let counter = 0;
const uniqueSuffix = () => {
  counter += 1;
  return `${Date.now()}-${counter}`;
};

interface RequestOptions {
  body?: unknown;
  cookie?: string;
  headers?: Record<string, string>;
  query?: Record<string, string | number>;
}

async function request(
  method: string,
  path: string,
  options: RequestOptions = {}
): Promise<Response> {
  const url = new URL(`http://localhost${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, String(value));
    }
  }

  const headers = new Headers(options.headers ?? {});
  if (options.cookie) headers.set("cookie", options.cookie);

  const isFormData = options.body instanceof FormData;
  if (options.body !== undefined && !isFormData) {
    headers.set("content-type", "application/json");
  }

  return app.handle(
    new Request(url.toString(), {
      body:
        options.body === undefined
          ? undefined
          : isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body),
      headers,
      method,
    })
  );
}

async function signUpAndCreateOrg(prefix: string) {
  const suffix = uniqueSuffix();
  const email = `${prefix}-${suffix}@test.local`;
  const password = "test-password-1234";

  const signUp = await app.handle(
    new Request("http://localhost/auth/sign-up/email", {
      body: JSON.stringify({ email, name: prefix, password }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  if (signUp.status !== 200) {
    throw new Error(`sign-up failed: ${signUp.status} ${await signUp.text()}`);
  }

  const signIn = await app.handle(
    new Request("http://localhost/auth/sign-in/email", {
      body: JSON.stringify({ email, password }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  if (signIn.status !== 200) {
    throw new Error(`sign-in failed: ${signIn.status} ${await signIn.text()}`);
  }

  const setCookie = signIn.headers.get("set-cookie");
  if (!setCookie) throw new Error("no session cookie");
  const cookie = setCookie.split(";")[0]!;

  const orgResponse = await request("POST", "/organizations", {
    body: { name: `${prefix} Org`, slug: `${prefix}-${suffix}` },
    cookie,
  });
  if (orgResponse.status !== 200) {
    throw new Error(
      `create org failed: ${orgResponse.status} ${await orgResponse.text()}`
    );
  }
  const org = (await orgResponse.json()) as { id: string };

  return { cookie, orgId: org.id };
}

async function pollUntil<T>(
  fn: () => Promise<T>,
  done: (value: T) => boolean,
  timeoutMs = 30_000,
  intervalMs = 500
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: T | undefined;
  while (Date.now() < deadline) {
    last = await fn();
    if (done(last)) return last;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(
    `pollUntil timed out after ${timeoutMs}ms; last value: ${JSON.stringify(last)}`
  );
}

const SVG_LAYOUT = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <text x="20" y="40">Certificate</text>
  <text x="20" y="80">{{recipient_name}}</text>
  <text x="20" y="120">{{course_title}}</text>
</svg>`;

const FIELD_SCHEMA = {
  fields: [
    {
      key: "recipient_name",
      label: "Recipient Name",
      required: true,
      type: "text" as const,
    },
    {
      key: "course_title",
      label: "Course Title",
      required: true,
      type: "text" as const,
    },
  ],
};

// ---------- tests ----------

describe("document flow end-to-end (HTTP only)", () => {
  let ownerCookie: string;
  let orgId: string;
  let templateVersionId: string;
  let walletId: string;
  let documentId: string;
  let batchId: string;
  let leaf: string;
  let issuerAccount: ReturnType<typeof privateKeyToAccount>;

  it("1. signs up, creates an org, registers an issuer wallet, publishes a template", async () => {
    const { cookie, orgId: newOrgId } = await signUpAndCreateOrg("e2e");
    ownerCookie = cookie;
    orgId = newOrgId;

    // Fresh issuer account per run so the (address, chainId) unique index
    // never collides across runs.
    issuerAccount = privateKeyToAccount(
      keccak256(toBytes(`e2e-issuer-${uniqueSuffix()}`))
    );
    await node.rpcCall("hardhat_setBalance", [
      issuerAccount.address,
      "0x56BC75E2D63100000",
    ]);

    const challenge = await request(
      "POST",
      `/organizations/${orgId}/wallets/challenge`,
      {
        body: { address: issuerAccount.address, chainId: 31_337 },
        cookie: ownerCookie,
      }
    );
    if (challenge.status !== 200) {
      throw new Error(
        `wallet challenge failed: ${challenge.status} ${await challenge.text()}`
      );
    }
    const { message } = (await challenge.json()) as { message: string };

    const signature = await issuerAccount.signMessage({ message });

    const register = await request("POST", `/organizations/${orgId}/wallets`, {
      body: {
        address: issuerAccount.address,
        label: "E2E issuer",
        message,
        signature,
      },
      cookie: ownerCookie,
    });
    if (register.status !== 200) {
      throw new Error(
        `wallet register failed: ${register.status} ${await register.text()}`
      );
    }
    walletId = ((await register.json()) as { id: string }).id;

    const template = await request(
      "POST",
      `/organizations/${orgId}/templates`,
      {
        body: {
          fieldSchema: FIELD_SCHEMA,
          layout: SVG_LAYOUT,
          name: `e2e-template-${uniqueSuffix()}`,
        },
        cookie: ownerCookie,
      }
    );
    if (template.status !== 200) {
      throw new Error(
        `template create failed: ${template.status} ${await template.text()}`
      );
    }
    const tpl = (await template.json()) as {
      id: string;
      versions: { id: string }[];
    };
    templateVersionId = tpl.versions[0]!.id;

    const publish = await request(
      "POST",
      `/organizations/${orgId}/templates/${tpl.id}/versions/${templateVersionId}/publish`,
      { cookie: ownerCookie }
    );
    if (publish.status !== 200) {
      throw new Error(
        `template publish failed: ${publish.status} ${await publish.text()}`
      );
    }
  }, 30_000);

  it("2. creates a document, seals a batch, signs, submits, and confirms", async () => {
    const created = await request("POST", `/organizations/${orgId}/documents`, {
      body: {
        fields: { course_title: "CS", recipient_name: "Ada Lovelace" },
        issuerWalletId: walletId,
        templateVersionId,
      },
      cookie: ownerCookie,
    });
    if (created.status !== 200) {
      throw new Error(
        `document create failed: ${created.status} ${await created.text()}`
      );
    }
    const doc = (await created.json()) as { id: string; leaf: string | null };
    documentId = doc.id;
    expect(doc.leaf).toMatch(/^0x[0-9a-f]{64}$/);
    leaf = doc.leaf!;

    const sealed = await request(
      "POST",
      `/organizations/${orgId}/batches/seal`,
      { body: { issuerWalletId: walletId }, cookie: ownerCookie }
    );
    if (sealed.status !== 200) {
      throw new Error(
        `batch seal failed: ${sealed.status} ${await sealed.text()}`
      );
    }
    const batch = (await sealed.json()) as {
      id: string;
      typedData: {
        domain: Record<string, unknown>;
        message: Record<string, unknown>;
        primaryType: "Anchor";
        types: { Anchor: { name: string; type: string }[] };
      };
    };
    batchId = batch.id;

    const signature = await createWalletClient({
      account: issuerAccount,
      transport: http(node.rpcUrl),
    }).signTypedData({
      domain: batch.typedData.domain as Parameters<
        typeof issuerAccount.signTypedData
      >[0]["domain"],
      message: batch.typedData.message as Parameters<
        typeof issuerAccount.signTypedData
      >[0]["message"],
      primaryType: "Anchor",
      types: batch.typedData.types as Parameters<
        typeof issuerAccount.signTypedData
      >[0]["types"],
    });

    const submitted = await request(
      "POST",
      `/organizations/${orgId}/batches/${batchId}/signature`,
      { body: { signature }, cookie: ownerCookie }
    );
    if (submitted.status !== 200) {
      throw new Error(
        `signature submit failed: ${submitted.status} ${await submitted.text()}`
      );
    }

    await pollUntil(
      async () => {
        const response = await request(
          "GET",
          `/organizations/${orgId}/batches/${batchId}`,
          { cookie: ownerCookie }
        );
        return (await response.json()) as { status: string };
      },
      (b) => b.status === "submitted" || b.status === "failed",
      30_000
    );

    // With CONFIRMATIONS=1 the indexer needs a block after the anchor block.
    await node.rpcCall("hardhat_mine", ["0x1"]);

    const confirmed = await pollUntil(
      async () => {
        const response = await request(
          "GET",
          `/organizations/${orgId}/batches/${batchId}`,
          { cookie: ownerCookie }
        );
        return (await response.json()) as {
          status: string;
          lastError: string | null;
          attempts: number;
        };
      },
      (b) => b.status === "confirmed" || b.status === "failed",
      30_000
    );
    if (confirmed.status === "failed") {
      throw new Error(`batch failed: ${confirmed.lastError}`);
    }
    expect(confirmed.status).toBe("confirmed");
  }, 40_000);

  it("3. fetches the bundle and verifies it through both endpoints", async () => {
    const bundleResponse = await request(
      "GET",
      `/organizations/${orgId}/documents/${documentId}/bundle`,
      { cookie: ownerCookie }
    );
    if (bundleResponse.status !== 200) {
      throw new Error(
        `bundle fetch failed: ${bundleResponse.status} ${await bundleResponse.text()}`
      );
    }
    const bundle = (await bundleResponse.json()) as Record<string, unknown>;

    const byLeaf = await request("GET", `/verify/${leaf}`, {
      query: { live: "true" },
    });
    if (byLeaf.status !== 200) {
      throw new Error(
        `verify by leaf failed: ${byLeaf.status} ${await byLeaf.text()}`
      );
    }
    expect(((await byLeaf.json()) as { status: string }).status).toBe(
      "unverified-issuer"
    );

    const byBundle = await request("POST", "/verify/bundle", {
      body: { bundle },
    });
    if (byBundle.status !== 200) {
      throw new Error(
        `verify bundle failed: ${byBundle.status} ${await byBundle.text()}`
      );
    }
    const byBundleBody = (await byBundle.json()) as {
      status: string;
      checks: { name: string; ok: boolean }[];
    };
    expect(byBundleBody.status).toBe("valid");
    expect(byBundleBody.checks.every((c) => c.ok)).toBe(true);
  }, 30_000);

  it("4. revokes, verifies again, and sees revoked", async () => {
    const prepare = await request(
      "POST",
      `/organizations/${orgId}/documents/${documentId}/revoke/prepare`,
      { body: { mode: "direct", reasonCode: "fraud" }, cookie: ownerCookie }
    );
    if (prepare.status !== 200) {
      throw new Error(
        `revoke prepare failed: ${prepare.status} ${await prepare.text()}`
      );
    }
    const prepared = (await prepare.json()) as {
      data: Hex;
      from: string;
      revocationId: string;
      to: string;
      mode: "direct";
    };
    expect(prepared.mode).toBe("direct");

    const txHash = await createWalletClient({
      account: issuerAccount,
      transport: http(node.rpcUrl),
    }).sendTransaction({
      chain: null,
      data: prepared.data,
      to: prepared.to as `0x${string}`,
    });
    await createPublicClient({
      transport: http(node.rpcUrl),
    }).waitForTransactionReceipt({ hash: txHash });

    const revokeSubmit = await request(
      "POST",
      `/organizations/${orgId}/documents/${documentId}/revoke`,
      {
        body: { revocationId: prepared.revocationId, txHash },
        cookie: ownerCookie,
      }
    );
    if (revokeSubmit.status !== 200) {
      throw new Error(
        `revoke submit failed: ${revokeSubmit.status} ${await revokeSubmit.text()}`
      );
    }

    // Same reason as step 2: give the indexer a fresh block to see the
    // revocation event.
    await node.rpcCall("hardhat_mine", ["0x1"]);

    await pollUntil(
      async () => {
        const response = await request("GET", `/verify/${leaf}`, {
          query: { live: "true" },
        });
        return (await response.json()) as { status: string };
      },
      (r) => r.status === "revoked",
      30_000
    );
  }, 40_000);
});
