import { beforeAll, describe, expect, it } from "bun:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

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

async function setup(user: TestUser) {
  const org = await createOrganization(user, "Idem Org");
  const orgId = org.id;

  const template = await request("POST", `/organizations/${orgId}/templates`, {
    user,
    body: {
      name: `Template ${Date.now()}`,
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
    `/organizations/${orgId}/templates/${templateBody.id}/versions/${versionId}/publish`,
    { user }
  );

  const account = privateKeyToAccount(generatePrivateKey());
  const challenge = await request(
    "POST",
    `/organizations/${orgId}/wallets/challenge`,
    { user, body: { address: account.address, chainId } }
  );
  const { message } = await json<{ message: string }>(challenge);
  const signature = await account.signMessage({ message });
  const wallet = await request("POST", `/organizations/${orgId}/wallets`, {
    user,
    body: { address: account.address, message, signature, label: "Primary" },
  });
  const walletId = (await json<{ id: string }>(wallet)).id;

  return { orgId, templateVersionId: versionId, walletId };
}

describe("Idempotency-Key", () => {
  let user: TestUser;
  let orgId: string;
  let templateVersionId: string;
  let walletId: string;

  beforeAll(async () => {
    user = await createTestUser("idem");
    const setupResult = await setup(user);
    orgId = setupResult.orgId;
    templateVersionId = setupResult.templateVersionId;
    walletId = setupResult.walletId;
  });

  it("replays the stored response for the same key and body", async () => {
    const key = `idem-${Date.now()}`;
    const body = {
      templateVersionId,
      issuerWalletId: walletId,
      fields: { recipient_name: "Ada", course_title: "CS" },
    };

    const first = await request("POST", `/organizations/${orgId}/documents`, {
      user,
      body,
      headers: { "idempotency-key": key },
    });
    expect(first.status).toBe(200);
    const firstBody = await json(first);

    const second = await request("POST", `/organizations/${orgId}/documents`, {
      user,
      body,
      headers: { "idempotency-key": key },
    });
    expect(second.status).toBe(200);
    const secondBody = await json(second);
    expect(secondBody).toEqual(firstBody);
  });

  it("returns 422 when the key is reused with a different body", async () => {
    const key = `idem-diff-${Date.now()}`;

    await request("POST", `/organizations/${orgId}/documents`, {
      user,
      body: {
        templateVersionId,
        issuerWalletId: walletId,
        fields: { recipient_name: "Ada", course_title: "CS" },
      },
      headers: { "idempotency-key": key },
    });

    const second = await request("POST", `/organizations/${orgId}/documents`, {
      user,
      body: {
        templateVersionId,
        issuerWalletId: walletId,
        fields: { recipient_name: "Grace", course_title: "Math" },
      },
      headers: { "idempotency-key": key },
    });
    expect(second.status).toBe(422);
  });

  it("returns 422 for keys shorter than 8 characters", async () => {
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
        headers: { "idempotency-key": "short" },
      }
    );
    expect(response.status).toBe(422);
  });

  it("ignores keys on non-POST methods", async () => {
    const response = await request("GET", `/organizations/${orgId}/documents`, {
      user,
      headers: { "idempotency-key": `get-${Date.now()}` },
    });
    expect(response.status).toBe(200);
  });
});
