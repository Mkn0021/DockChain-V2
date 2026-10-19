import { beforeAll, describe, expect, it } from "bun:test";

import {
  createOrganization,
  createTestUser,
  json,
  request,
  type TestUser,
} from "./helpers/test-app";

const validEvents = ["document.issued"];

describe("POST /organizations/:organizationId/webhooks", () => {
  let user: TestUser;
  let orgId: string;

  beforeAll(async () => {
    user = await createTestUser("webhook-create");
    orgId = (await createOrganization(user, "Webhook Create Org")).id;
  });

  it("returns 200 with the endpoint and secret", async () => {
    const response = await request("POST", `/organizations/${orgId}/webhooks`, {
      user,
      body: { events: validEvents, url: "https://example.com/hook" },
    });
    expect(response.status).toBe(200);

    const body = await json<{
      endpoint: { id: string; url: string };
      secret: string;
    }>(response);
    expect(body.endpoint.url).toBe("https://example.com/hook");
    expect(body.secret).toMatch(/^whsec_[0-9a-f]{64}$/);
  });

  it("returns 422 for a non-https URL", async () => {
    const response = await request("POST", `/organizations/${orgId}/webhooks`, {
      user,
      body: { events: validEvents, url: "http://example.com/hook" },
    });
    expect(response.status).toBe(422);
  });

  it("returns 422 for localhost", async () => {
    const response = await request("POST", `/organizations/${orgId}/webhooks`, {
      user,
      body: { events: validEvents, url: "https://localhost/hook" },
    });
    expect(response.status).toBe(422);
  });

  it("returns 422 for an unknown event", async () => {
    const response = await request("POST", `/organizations/${orgId}/webhooks`, {
      user,
      body: { events: ["not.an.event"], url: "https://example.com/hook" },
    });
    expect(response.status).toBe(422);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request("POST", `/organizations/${orgId}/webhooks`, {
      body: { events: validEvents, url: "https://example.com/hook" },
    });
    expect(response.status).toBe(401);
  });
});

describe("GET /organizations/:organizationId/webhooks", () => {
  let user: TestUser;
  let orgId: string;

  beforeAll(async () => {
    user = await createTestUser("webhook-list");
    orgId = (await createOrganization(user, "Webhook List Org")).id;

    await request("POST", `/organizations/${orgId}/webhooks`, {
      user,
      body: { events: validEvents, url: "https://example.com/hook" },
    });
  });

  it("returns 200 with the listed endpoints", async () => {
    const response = await request("GET", `/organizations/${orgId}/webhooks`, {
      user,
    });
    expect(response.status).toBe(200);

    const body = await json<Array<{ id: string }>>(response);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request("GET", `/organizations/${orgId}/webhooks`);
    expect(response.status).toBe(401);
  });
});

describe("POST /organizations/:organizationId/webhooks/:endpointId/rotate-secret", () => {
  let user: TestUser;
  let orgId: string;
  let endpointId: string;
  let originalSecret: string;

  beforeAll(async () => {
    user = await createTestUser("webhook-rotate");
    orgId = (await createOrganization(user, "Webhook Rotate Org")).id;

    const response = await request("POST", `/organizations/${orgId}/webhooks`, {
      user,
      body: { events: validEvents, url: "https://example.com/hook" },
    });
    const body = await json<{
      endpoint: { id: string };
      secret: string;
    }>(response);
    endpointId = body.endpoint.id;
    originalSecret = body.secret;
  });

  it("returns 200 with a new secret", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/webhooks/${endpointId}/rotate-secret`,
      { user }
    );
    expect(response.status).toBe(200);

    const body = await json<{ secret: string }>(response);
    expect(body.secret).toMatch(/^whsec_[0-9a-f]{64}$/);
    expect(body.secret).not.toBe(originalSecret);
  });
});
