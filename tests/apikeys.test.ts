import { beforeAll, describe, expect, it } from "bun:test";

import {
  createOrganization,
  createTestUser,
  json,
  request,
  type TestUser,
} from "./helpers/test-app";

describe("POST /organizations/:organizationId/api-keys", () => {
  let user: TestUser;
  let orgId: string;

  beforeAll(async () => {
    user = await createTestUser("apikey-create");
    orgId = (await createOrganization(user, "APIKey Create Org")).id;
  });

  it("returns 200 with the full key on creation", async () => {
    const response = await request("POST", `/organizations/${orgId}/api-keys`, {
      user,
      body: { name: "CI token" },
    });
    expect(response.status).toBe(200);

    const body = await json<{ id: string; key?: string }>(response);
    expect(body.id).toBeDefined();
    expect(body.key).toBeDefined();
    expect(typeof body.key).toBe("string");
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request("POST", `/organizations/${orgId}/api-keys`, {
      body: { name: "x" },
    });
    expect(response.status).toBe(401);
  });
});

describe("GET /organizations/:organizationId/api-keys", () => {
  let user: TestUser;
  let orgId: string;

  beforeAll(async () => {
    user = await createTestUser("apikey-list");
    orgId = (await createOrganization(user, "APIKey List Org")).id;

    await request("POST", `/organizations/${orgId}/api-keys`, {
      user,
      body: { name: "First key" },
    });
  });

  it("returns 200 without exposing full keys", async () => {
    const response = await request("GET", `/organizations/${orgId}/api-keys`, {
      user,
    });
    expect(response.status).toBe(200);

    const body = await json<Array<{ id: string; key?: string }>>(response);
    expect(body.length).toBeGreaterThanOrEqual(1);
    for (const key of body) {
      expect(key.key).toBeUndefined();
    }
  });
});

describe("x-api-key auth resolution", () => {
  let user: TestUser;
  let orgId: string;
  let fullKey: string;

  beforeAll(async () => {
    user = await createTestUser("apikey-auth");
    orgId = (await createOrganization(user, "APIKey Auth Org")).id;

    const response = await request("POST", `/organizations/${orgId}/api-keys`, {
      user,
      body: {
        name: "Auth test",
        permissions: {
          document: ["read"],
        },
      },
    });
    const body = await json<{ key: string }>(response);
    fullKey = body.key;
  });

  it("allows a request with the correct api key", async () => {
    const response = await request("GET", `/organizations/${orgId}/documents`, {
      headers: { "x-api-key": fullKey },
    });
    expect([200, 403]).toContain(response.status);
  });

  it("rejects a request with an invalid api key", async () => {
    const response = await request("GET", `/organizations/${orgId}/documents`, {
      headers: { "x-api-key": "invalid_key_value" },
    });
    expect([401, 403]).toContain(response.status);
  });
});
