import { beforeAll, describe, expect, it } from "bun:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import {
  createOrganization,
  createTestUser,
  json,
  request,
  type TestUser,
} from "./helpers/test-app";

const chainId = 84532; // Base Sepolia

async function challengeAndSign(
  user: TestUser,
  orgId: string,
  privateKey: `0x${string}`
) {
  const account = privateKeyToAccount(privateKey);

  const challenge = await request(
    "POST",
    `/organizations/${orgId}/wallets/challenge`,
    {
      user,
      body: { address: account.address, chainId },
    }
  );
  expect(challenge.status).toBe(200);
  const { message } = await json<{ message: string }>(challenge);

  const signature = await account.signMessage({ message });

  return {
    address: account.address,
    message,
    signature,
  };
}

describe("POST /organizations/:organizationId/wallets/challenge", () => {
  let user: TestUser;
  let orgId: string;

  beforeAll(async () => {
    user = await createTestUser("wallet-challenge");
    orgId = (await createOrganization(user, "Wallet Challenge Org")).id;
  });

  it("returns 200 with a SIWE message", async () => {
    const account = privateKeyToAccount(
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    );
    const response = await request(
      "POST",
      `/organizations/${orgId}/wallets/challenge`,
      { user, body: { address: account.address, chainId } }
    );
    expect(response.status).toBe(200);
    const body = await json<{ message: string }>(response);
    expect(body.message).toContain(account.address.toLowerCase());
    expect(body.message).toContain(`Chain ID: ${chainId}`);
  });

  it("returns 422 for an invalid address", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/wallets/challenge`,
      { user, body: { address: "not-hex", chainId } }
    );
    expect(response.status).toBe(422);
  });
});

describe("POST /organizations/:organizationId/wallets", () => {
  let user: TestUser;
  let orgId: string;

  beforeAll(async () => {
    user = await createTestUser("wallet-register");
    orgId = (await createOrganization(user, "Wallet Register Org")).id;
  });

  it("registers a wallet with a valid signature", async () => {
    const signed = await challengeAndSign(user, orgId, generatePrivateKey());
    const response = await request("POST", `/organizations/${orgId}/wallets`, {
      user,
      body: { ...signed, label: "Primary" },
    });
    expect(response.status).toBe(200);
    const body = await json<{ address: string; label: string }>(response);
    expect(body.address).toBe(signed.address.toLowerCase());
    expect(body.label).toBe("Primary");
  });

  it("returns 409 when the address is registered in another org", async () => {
    const otherUser = await createTestUser("wallet-register-other");
    const otherOrg = (await createOrganization(otherUser, "Wallet Other Org"))
      .id;

    const signed = await challengeAndSign(user, orgId, generatePrivateKey());
    const first = await request("POST", `/organizations/${orgId}/wallets`, {
      user,
      body: signed,
    });
    expect(first.status).toBe(200);

    const signedOther = await challengeAndSign(
      otherUser,
      otherOrg,
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    );
    const second = await request("POST", `/organizations/${otherOrg}/wallets`, {
      user: otherUser,
      body: signedOther,
    });
    expect(second.status).toBe(409);
  });

  it("returns 422 for a replayed challenge", async () => {
    const signed = await challengeAndSign(user, orgId, generatePrivateKey());
    const first = await request("POST", `/organizations/${orgId}/wallets`, {
      user,
      body: signed,
    });
    expect(first.status).toBe(200);

    const second = await request("POST", `/organizations/${orgId}/wallets`, {
      user,
      body: signed,
    });
    expect(second.status).toBe(422);
  });

  it("returns 422 for a wrong signer", async () => {
    const signer = privateKeyToAccount(
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
    );
    const impostor = privateKeyToAccount(
      "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"
    );

    const challenge = await request(
      "POST",
      `/organizations/${orgId}/wallets/challenge`,
      { user, body: { address: signer.address, chainId } }
    );
    const { message } = await json<{ message: string }>(challenge);
    const signature = await impostor.signMessage({ message });

    const response = await request("POST", `/organizations/${orgId}/wallets`, {
      user,
      body: { address: signer.address, message, signature },
    });
    expect(response.status).toBe(422);
  });
});

describe("GET /organizations/:organizationId/wallets", () => {
  let user: TestUser;
  let orgId: string;

  beforeAll(async () => {
    user = await createTestUser("wallet-list");
    orgId = (await createOrganization(user, "Wallet List Org")).id;
  });

  it("lists wallets for the organization", async () => {
    const response = await request("GET", `/organizations/${orgId}/wallets`, {
      user,
    });
    expect(response.status).toBe(200);
    const body = await json<Array<{ id: string }>>(response);
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns 403 for an outsider", async () => {
    const outsider = await createTestUser("wallet-list-outsider");
    const response = await request("GET", `/organizations/${orgId}/wallets`, {
      user: outsider,
    });
    expect(response.status).toBe(403);
  });
});

describe("GET/PATCH /organizations/:organizationId/settings", () => {
  let user: TestUser;
  let orgId: string;

  beforeAll(async () => {
    user = await createTestUser("settings");
    orgId = (await createOrganization(user, "Settings Org")).id;
  });

  it("returns 200 with defaults created lazily", async () => {
    const response = await request("GET", `/organizations/${orgId}/settings`, {
      user,
    });
    expect(response.status).toBe(200);
    const body = await json<{ batchWindowMinutes: number }>(response);
    expect(body.batchWindowMinutes).toBe(60);
  });

  it("returns 422 for out-of-range batchWindowMinutes", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/settings`,
      { user, body: { batchWindowMinutes: 5 } }
    );
    expect(response.status).toBe(422);
  });

  it("updates settings", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/settings`,
      { user, body: { batchWindowMinutes: 120 } }
    );
    expect(response.status).toBe(200);
    const body = await json<{ batchWindowMinutes: number }>(response);
    expect(body.batchWindowMinutes).toBe(120);
  });
});
