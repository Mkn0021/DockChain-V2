import { beforeAll, describe, expect, it } from "bun:test";

import {
  createOrganization,
  createTestUser,
  json,
  request,
  type TestUser,
} from "./helpers/test-app";

describe("GET /organizations/:organizationId/audit-logs", () => {
  let user: TestUser;
  let orgId: string;

  beforeAll(async () => {
    user = await createTestUser("audit-list");
    orgId = (await createOrganization(user, "Audit List Org")).id;

    // Trigger an audited action
    await request("POST", `/organizations/${orgId}/webhooks`, {
      user,
      body: {
        events: ["document.issued"],
        url: "https://example.com/hook",
      },
    });
  });

  it("returns 200 with the listed audit entries", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/audit-logs`,
      { user }
    );
    expect(response.status).toBe(200);

    const body = await json<{
      data: Array<{ action: string; id: string }>;
      meta: { limit: number; offset: number; total: number };
    }>(response);

    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it("filters by action", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/audit-logs`,
      { user, query: { action: "webhook.created" } }
    );
    expect(response.status).toBe(200);

    const body = await json<{ data: Array<{ action: string }> }>(response);
    for (const entry of body.data) {
      expect(entry.action).toBe("webhook.created");
    }
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request("GET", `/organizations/${orgId}/audit-logs`);
    expect(response.status).toBe(401);
  });

  it("returns 403 for an outsider", async () => {
    const outsider = await createTestUser("audit-outsider");
    const response = await request(
      "GET",
      `/organizations/${orgId}/audit-logs`,
      { user: outsider }
    );
    expect(response.status).toBe(403);
  });
});
