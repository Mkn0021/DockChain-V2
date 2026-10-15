import { beforeAll, describe, expect, it } from "bun:test";

import {
  createOrganization,
  createTestUser,
  json,
  request,
  type TestUser,
} from "./helpers/test-app";

const validLayout = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="400" height="200" fill="#f5f5f5" />
  <text x="20" y="40">Certificate</text>
  <text x="20" y="80">{{recipient_name}}</text>
  <text x="20" y="120">{{course_title}}</text>
  <text x="20" y="160">{{issued_date}}</text>
</svg>`;

const validFieldSchema = {
  fields: [
    {
      key: "recipient_name",
      label: "Recipient Name",
      type: "text",
      required: true,
    },
    {
      key: "course_title",
      label: "Course Title",
      type: "text",
      required: true,
    },
    {
      key: "issued_date",
      label: "Issued Date",
      type: "date",
      required: true,
    },
  ],
};

async function createTemplate(
  user: TestUser,
  organizationId: string,
  overrides: Partial<{
    name: string;
    description: string | null;
    layout: string;
    fieldSchema: typeof validFieldSchema;
  }> = {}
) {
  const payload = {
    name: `Template ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: "Test template",
    layout: validLayout,
    fieldSchema: validFieldSchema,
    ...overrides,
  };
  const response = await request(
    "POST",
    `/organizations/${organizationId}/templates`,
    { user, body: payload }
  );
  return { payload, response };
}

// ===========================================================================
// POST /organizations/:organizationId/templates
// ===========================================================================

describe("POST /organizations/:organizationId/templates", () => {
  let user: TestUser;
  let orgId: string;

  beforeAll(async () => {
    user = await createTestUser("tpl-create");
    orgId = (await createOrganization(user, "Tpl Create Org")).id;
  });

  it("returns 200 and creates version 1 as draft", async () => {
    const { payload, response } = await createTemplate(user, orgId);
    expect(response.status).toBe(200);

    const body = await json<{
      id: string;
      name: string;
      organizationId: string;
      createdBy: string;
      versions: Array<{
        id: string;
        version: number;
        status: string;
        layout: string;
        fieldSchema: typeof validFieldSchema;
        schemaHash: string | null;
      }>;
    }>(response);

    expect(body.name).toBe(payload.name);
    expect(body.organizationId).toBe(orgId);
    expect(body.createdBy).toBe(user.id);
    expect(body.versions).toHaveLength(1);
    expect(body.versions[0]!.version).toBe(1);
    expect(body.versions[0]!.status).toBe("draft");
    expect(body.versions[0]!.layout).toContain("<svg");
    expect(body.versions[0]!.fieldSchema.fields).toHaveLength(3);
    expect(body.versions[0]!.schemaHash).toBeNull();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates`,
      {
        body: {
          name: "NoAuth",
          layout: validLayout,
          fieldSchema: validFieldSchema,
        },
      }
    );
    expect(response.status).toBe(401);
  });

  it("returns 422 for a missing name", async () => {
    const { response } = await createTemplate(user, orgId, { name: "" });
    expect(response.status).toBe(422);
  });

  it("returns 422 for a name shorter than 2 characters", async () => {
    const { response } = await createTemplate(user, orgId, { name: "A" });
    expect(response.status).toBe(422);
  });

  it("returns 422 for non-SVG layout", async () => {
    const { response } = await createTemplate(user, orgId, {
      layout: "<html><body>not svg</body></html>",
    });
    expect(response.status).toBe(422);
  });

  it("returns 422 for a layout with a script tag", async () => {
    const { response } = await createTemplate(user, orgId, {
      layout: `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><text>{{recipient_name}}</text><text>{{course_title}}</text><text>{{issued_date}}</text></svg>`,
    });
    expect(response.status).toBe(422);
  });

  it("returns 422 for a layout with an external href", async () => {
    const { response } = await createTemplate(user, orgId, {
      layout: `<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.com/x.png" /><text>{{recipient_name}}</text><text>{{course_title}}</text><text>{{issued_date}}</text></svg>`,
    });
    expect(response.status).toBe(422);
  });

  it("returns 422 when a required field is missing from the layout", async () => {
    const { response } = await createTemplate(user, orgId, {
      layout: `<svg xmlns="http://www.w3.org/2000/svg"><text>{{recipient_name}}</text><text>{{course_title}}</text></svg>`,
    });
    expect(response.status).toBe(422);
  });

  it("returns 422 when the layout references an unknown field", async () => {
    const { response } = await createTemplate(user, orgId, {
      layout: `<svg xmlns="http://www.w3.org/2000/svg"><text>{{recipient_name}}</text><text>{{course_title}}</text><text>{{issued_date}}</text><text>{{mystery}}</text></svg>`,
    });
    expect(response.status).toBe(422);
  });

  it("derives the field schema from the layout when omitted", async () => {
    const payload = {
      name: `Derived ${Date.now()}`,
      layout: `<svg xmlns="http://www.w3.org/2000/svg"><text>{{recipient_name}}</text><text>{{issued_date}}</text></svg>`,
    };
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates`,
      { user, body: payload }
    );
    expect(response.status).toBe(200);

    const body = await json<{
      versions: Array<{
        fieldSchema: { fields: Array<{ key: string; type: string }> };
      }>;
    }>(response);

    const fields = body.versions[0]!.fieldSchema.fields;
    expect(fields.map((f) => f.key).sort()).toEqual([
      "issued_date",
      "recipient_name",
    ]);
    const dateField = fields.find((f) => f.key === "issued_date");
    expect(dateField?.type).toBe("date");
  });

  it("returns 422 for a duplicate field key", async () => {
    const { response } = await createTemplate(user, orgId, {
      fieldSchema: {
        fields: [
          { key: "recipient_name", label: "A", type: "text", required: true },
          { key: "recipient_name", label: "B", type: "text", required: true },
        ],
      },
    });
    expect(response.status).toBe(422);
  });

  it("returns 422 for an enum without options", async () => {
    const { response } = await createTemplate(user, orgId, {
      fieldSchema: {
        fields: [
          {
            key: "grade",
            label: "Grade",
            type: "enum",
            required: true,
          },
          { key: "recipient_name", label: "R", type: "text", required: true },
        ],
      },
    });
    expect(response.status).toBe(422);
  });

  it("returns 403 or 404 for a nonexistent organization", async () => {
    const { response } = await createTemplate(user, "org_does_not_exist");
    expect([403, 404]).toContain(response.status);
  });

  it("returns 403 when the user is not in the organization", async () => {
    const otherUser = await createTestUser("tpl-create-other");
    const otherOrg = (await createOrganization(otherUser, "Other Create Org"))
      .id;

    const { response } = await createTemplate(user, otherOrg);
    expect(response.status).toBe(403);
  });

  it("returns 409 for a duplicate name in the same org", async () => {
    const name = `Duplicate ${Date.now()}`;
    const first = await createTemplate(user, orgId, { name });
    expect(first.response.status).toBe(200);

    const second = await createTemplate(user, orgId, { name });
    expect(second.response.status).toBe(409);
  });
});

// ===========================================================================
// GET /organizations/:organizationId/templates
// ===========================================================================

describe("GET /organizations/:organizationId/templates", () => {
  let user: TestUser;
  let orgId: string;

  beforeAll(async () => {
    user = await createTestUser("tpl-list");
    orgId = (await createOrganization(user, "Tpl List Org")).id;

    for (let i = 0; i < 3; i += 1) {
      await createTemplate(user, orgId, { name: `Listed ${i} ${Date.now()}` });
    }
  });

  it("returns 200 with the listed templates", async () => {
    const response = await request("GET", `/organizations/${orgId}/templates`, {
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
    const first = await request("GET", `/organizations/${orgId}/templates`, {
      user,
      query: { limit: 1, offset: 0 },
    });
    const second = await request("GET", `/organizations/${orgId}/templates`, {
      user,
      query: { limit: 1, offset: 1 },
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const firstBody = await json<{ data: Array<{ id: string }> }>(first);
    const secondBody = await json<{ data: Array<{ id: string }> }>(second);
    expect(firstBody.data[0]!.id).not.toBe(secondBody.data[0]!.id);
  });

  it("returns 422 for limit = 0", async () => {
    const response = await request("GET", `/organizations/${orgId}/templates`, {
      user,
      query: { limit: 0 },
    });
    expect(response.status).toBe(422);
  });

  it("returns 422 for limit > 100", async () => {
    const response = await request("GET", `/organizations/${orgId}/templates`, {
      user,
      query: { limit: 500 },
    });
    expect(response.status).toBe(422);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request("GET", `/organizations/${orgId}/templates`);
    expect(response.status).toBe(401);
  });

  it("returns 403 for an outsider", async () => {
    const outsider = await createTestUser("tpl-list-outsider");
    const response = await request("GET", `/organizations/${orgId}/templates`, {
      user: outsider,
    });
    expect(response.status).toBe(403);
  });

  it("returns 403 or 404 for a nonexistent organization", async () => {
    const response = await request(
      "GET",
      "/organizations/does-not-exist/templates",
      { user }
    );
    expect([403, 404]).toContain(response.status);
  });
});

// ===========================================================================
// GET /organizations/:organizationId/templates/:templateId
// ===========================================================================

describe("GET /organizations/:organizationId/templates/:templateId", () => {
  let user: TestUser;
  let orgId: string;
  let templateId: string;

  beforeAll(async () => {
    user = await createTestUser("tpl-get");
    orgId = (await createOrganization(user, "Tpl Get Org")).id;

    const created = await createTemplate(user, orgId);
    const body = await json<{ id: string }>(created.response);
    templateId = body.id;
  });

  it("returns 200 with the template and versions", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/templates/${templateId}`,
      { user }
    );
    expect(response.status).toBe(200);

    const body = await json<{
      id: string;
      versions: Array<{ version: number; status: string }>;
    }>(response);
    expect(body.id).toBe(templateId);
    expect(body.versions[0]!.version).toBe(1);
    expect(body.versions[0]!.status).toBe("draft");
  });

  it("returns 404 for a nonexistent template", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/templates/does-not-exist`,
      { user }
    );
    expect(response.status).toBe(404);
  });

  it("returns 403 or 404 for a nonexistent organization", async () => {
    const response = await request(
      "GET",
      "/organizations/does-not-exist/templates/some-id",
      { user }
    );
    expect([403, 404]).toContain(response.status);
  });

  it("returns 404 for cross-org access", async () => {
    const other = await createTestUser("tpl-get-other");
    const otherOrg = (await createOrganization(other, "Other Get Org")).id;
    const otherTpl = await createTemplate(other, otherOrg);
    const otherBody = await json<{ id: string }>(otherTpl.response);

    const response = await request(
      "GET",
      `/organizations/${orgId}/templates/${otherBody.id}`,
      { user }
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/templates/${templateId}`
    );
    expect(response.status).toBe(401);
  });
});

// ===========================================================================
// PATCH /organizations/:organizationId/templates/:templateId
// ===========================================================================

describe("PATCH /organizations/:organizationId/templates/:templateId", () => {
  let user: TestUser;
  let orgId: string;
  let templateId: string;

  beforeAll(async () => {
    user = await createTestUser("tpl-patch");
    orgId = (await createOrganization(user, "Tpl Patch Org")).id;

    const created = await createTemplate(user, orgId);
    const body = await json<{ id: string }>(created.response);
    templateId = body.id;
  });

  it("returns 200 when updating name", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${templateId}`,
      { user, body: { name: "Updated Name" } }
    );
    expect(response.status).toBe(200);
  });

  it("returns 200 when updating description", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${templateId}`,
      { user, body: { description: "Updated" } }
    );
    expect(response.status).toBe(200);
  });

  it("returns 200 when setting description to null", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${templateId}`,
      { user, body: { description: null } }
    );
    expect(response.status).toBe(200);
  });

  it("returns 422 for an empty body", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${templateId}`,
      { user, body: {} }
    );
    expect(response.status).toBe(422);
  });

  it("returns 404 for a nonexistent template", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/does-not-exist`,
      { user, body: { name: "Nope" } }
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 for cross-org access", async () => {
    const other = await createTestUser("tpl-patch-other");
    const otherOrg = (await createOrganization(other, "Other Patch Org")).id;
    const otherTpl = await createTemplate(other, otherOrg);
    const otherBody = await json<{ id: string }>(otherTpl.response);

    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${otherBody.id}`,
      { user, body: { name: "Stolen" } }
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${templateId}`,
      { body: { name: "Nope" } }
    );
    expect(response.status).toBe(401);
  });
});

// ===========================================================================
// POST .../templates/:templateId/versions
// ===========================================================================

describe("POST .../templates/:templateId/versions", () => {
  let user: TestUser;
  let orgId: string;
  let templateId: string;

  beforeAll(async () => {
    user = await createTestUser("tpl-version");
    orgId = (await createOrganization(user, "Tpl Version Org")).id;

    const created = await createTemplate(user, orgId);
    const body = await json<{ id: string }>(created.response);
    templateId = body.id;
  });

  it("returns 200 and creates version 2", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions`,
      {
        user,
        body: {
          layout: validLayout.replace("Certificate", "Version 2"),
          fieldSchema: validFieldSchema,
        },
      }
    );
    expect(response.status).toBe(200);

    const body = await json<{ version: number; status: string }>(response);
    expect(body.version).toBe(2);
    expect(body.status).toBe("draft");
  });

  it("returns 200 for 5 concurrent creates with unique versions", async () => {
    const parallel = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        request(
          "POST",
          `/organizations/${orgId}/templates/${templateId}/versions`,
          {
            user,
            body: {
              layout: validLayout.replace("Certificate", `Concurrent ${i}`),
              fieldSchema: validFieldSchema,
            },
          }
        )
      )
    );

    parallel.forEach((r) => expect(r.status).toBe(200));

    const versions = await Promise.all(
      parallel.map((r) => json<{ version: number }>(r))
    );
    const numbers = versions.map((v) => v.version);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("returns 422 for a non-SVG layout", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions`,
      {
        user,
        body: { layout: "<div>nope</div>" },
      }
    );
    expect(response.status).toBe(422);
  });

  it("returns 404 for a nonexistent template", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/does-not-exist/versions`,
      { user, body: { layout: validLayout } }
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 for cross-org access", async () => {
    const other = await createTestUser("tpl-version-other");
    const otherOrg = (await createOrganization(other, "Other Version Org")).id;
    const otherTpl = await createTemplate(other, otherOrg);
    const otherBody = await json<{ id: string }>(otherTpl.response);

    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${otherBody.id}/versions`,
      { user, body: { layout: validLayout } }
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions`,
      { body: { layout: validLayout } }
    );
    expect(response.status).toBe(401);
  });
});

// ===========================================================================
// GET .../templates/:templateId/versions
// ===========================================================================

describe("GET .../templates/:templateId/versions", () => {
  let user: TestUser;
  let orgId: string;
  let templateId: string;

  beforeAll(async () => {
    user = await createTestUser("tpl-versions-list");
    orgId = (await createOrganization(user, "Tpl Versions List Org")).id;

    const created = await createTemplate(user, orgId);
    const body = await json<{ id: string }>(created.response);
    templateId = body.id;

    await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions`,
      { user, body: { layout: validLayout, fieldSchema: validFieldSchema } }
    );
  });

  it("returns 200 with versions in descending order", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/templates/${templateId}/versions`,
      { user }
    );
    expect(response.status).toBe(200);

    const body = await json<Array<{ version: number }>>(response);
    expect(body.length).toBe(2);
    expect(body[0]!.version).toBeGreaterThan(body[1]!.version);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/templates/${templateId}/versions`
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 for cross-org access", async () => {
    const other = await createTestUser("tpl-versions-list-other");
    const otherOrg = (await createOrganization(other, "Other VL Org")).id;
    const otherTpl = await createTemplate(other, otherOrg);
    const otherBody = await json<{ id: string }>(otherTpl.response);

    const response = await request(
      "GET",
      `/organizations/${orgId}/templates/${otherBody.id}/versions`,
      { user }
    );
    expect(response.status).toBe(404);
  });
});

// ===========================================================================
// PATCH .../templates/:templateId/versions/:versionId
// ===========================================================================

describe("PATCH .../templates/:templateId/versions/:versionId", () => {
  let user: TestUser;
  let orgId: string;
  let templateId: string;
  let versionId: string;

  beforeAll(async () => {
    user = await createTestUser("tpl-ver-patch");
    orgId = (await createOrganization(user, "Tpl Ver Patch Org")).id;

    const created = await createTemplate(user, orgId);
    const body = await json<{
      id: string;
      versions: Array<{ id: string }>;
    }>(created.response);
    templateId = body.id;
    versionId = body.versions[0]!.id;
  });

  it("returns 200 when updating draft layout", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}`,
      {
        user,
        body: {
          layout: validLayout.replace("Certificate", "Updated"),
        },
      }
    );
    expect(response.status).toBe(200);
  });

  it("returns 200 when updating field schema", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}`,
      { user, body: { fieldSchema: validFieldSchema } }
    );
    expect(response.status).toBe(200);
  });

  it("returns 422 for an empty body", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}`,
      { user, body: {} }
    );
    expect(response.status).toBe(422);
  });

  it("returns 404 for a nonexistent version", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${templateId}/versions/does-not-exist`,
      { user, body: { layout: validLayout } }
    );
    expect(response.status).toBe(404);
  });

  it("returns 409 when editing a published version", async () => {
    const publish = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}/publish`,
      { user }
    );
    expect(publish.status).toBe(200);

    const edit = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}`,
      { user, body: { layout: validLayout } }
    );
    expect(edit.status).toBe(409);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}`,
      { body: { layout: validLayout } }
    );
    expect(response.status).toBe(401);
  });
});

// ===========================================================================
// POST .../templates/:templateId/versions/:versionId/publish
// ===========================================================================

describe("POST .../templates/:templateId/versions/:versionId/publish", () => {
  let user: TestUser;
  let orgId: string;
  let templateId: string;
  let versionId: string;

  beforeAll(async () => {
    user = await createTestUser("tpl-publish");
    orgId = (await createOrganization(user, "Tpl Publish Org")).id;

    const created = await createTemplate(user, orgId);
    const body = await json<{
      id: string;
      versions: Array<{ id: string }>;
    }>(created.response);
    templateId = body.id;
    versionId = body.versions[0]!.id;
  });

  it("returns 200, sets publishedAt and computes schemaHash", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}/publish`,
      { user }
    );
    expect(response.status).toBe(200);

    const body = await json<{
      status: string;
      publishedAt: string | null;
      schemaHash: string | null;
    }>(response);
    expect(body.status).toBe("published");
    expect(body.publishedAt).not.toBeNull();
    expect(body.schemaHash).not.toBeNull();
    expect(body.schemaHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("keeps schemaHash immutable after publish", async () => {
    const fresh = await createTemplate(user, orgId, {
      name: `Immutable ${Date.now()}`,
    });
    const freshBody = await json<{
      id: string;
      versions: Array<{ id: string }>;
    }>(fresh.response);

    const first = await request(
      "POST",
      `/organizations/${orgId}/templates/${freshBody.id}/versions/${freshBody.versions[0]!.id}/publish`,
      { user }
    );
    expect(first.status).toBe(200);
    const firstHash = (await json<{ schemaHash: string }>(first)).schemaHash;

    const second = await request(
      "GET",
      `/organizations/${orgId}/templates/${freshBody.id}`,
      { user }
    );
    const secondBody = await json<{
      versions: Array<{ schemaHash: string }>;
    }>(second);
    expect(secondBody.versions[0]!.schemaHash).toBe(firstHash);
  });

  it("returns 409 when publishing twice", async () => {
    const fresh = await createTemplate(user, orgId, {
      name: `Twice ${Date.now()}`,
    });
    const freshBody = await json<{
      id: string;
      versions: Array<{ id: string }>;
    }>(fresh.response);

    const first = await request(
      "POST",
      `/organizations/${orgId}/templates/${freshBody.id}/versions/${freshBody.versions[0]!.id}/publish`,
      { user }
    );
    expect(first.status).toBe(200);

    const second = await request(
      "POST",
      `/organizations/${orgId}/templates/${freshBody.id}/versions/${freshBody.versions[0]!.id}/publish`,
      { user }
    );
    expect(second.status).toBe(409);
  });

  it("returns 404 for a nonexistent version", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions/does-not-exist/publish`,
      { user }
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions/does-not-exist/publish`
    );
    expect(response.status).toBe(401);
  });
});

// ===========================================================================
// POST .../templates/:templateId/versions/:versionId/preview
// ===========================================================================

describe("POST .../templates/:templateId/versions/:versionId/preview", () => {
  let user: TestUser;
  let orgId: string;
  let templateId: string;
  let versionId: string;

  beforeAll(async () => {
    user = await createTestUser("tpl-preview");
    orgId = (await createOrganization(user, "Tpl Preview Org")).id;

    const created = await createTemplate(user, orgId);
    const body = await json<{
      id: string;
      versions: Array<{ id: string }>;
    }>(created.response);
    templateId = body.id;
    versionId = body.versions[0]!.id;
  });

  it("returns 200 and renders the SVG with values", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}/preview`,
      {
        user,
        body: {
          data: {
            course_title: "Computer Science",
            issued_date: "2026-01-15",
            recipient_name: "Ada Lovelace",
          },
        },
      }
    );
    expect(response.status).toBe(200);

    const body = await json<{ svg: string }>(response);
    expect(body.svg).toContain("Ada Lovelace");
    expect(body.svg).toContain("Computer Science");
    expect(body.svg).not.toContain("{{recipient_name}}");
  });

  it("escapes XML characters in values", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}/preview`,
      {
        user,
        body: {
          data: {
            course_title: "Web",
            issued_date: "2026-01-15",
            recipient_name: '<script>alert("x")</script>',
          },
        },
      }
    );
    expect(response.status).toBe(200);

    const body = await json<{ svg: string }>(response);
    expect(body.svg).not.toContain("<script>");
    expect(body.svg).toContain("&lt;script&gt;");
  });

  it("returns 422 when a required value is missing", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}/preview`,
      { user, body: { data: { recipient_name: "Ada" } } }
    );
    expect(response.status).toBe(422);
  });

  it("returns 404 for a nonexistent version", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions/does-not-exist/preview`,
      {
        user,
        body: {
          data: {
            course_title: "X",
            issued_date: "2026-01-15",
            recipient_name: "Y",
          },
        },
      }
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}/preview`,
      {
        body: {
          data: {
            course_title: "X",
            issued_date: "2026-01-15",
            recipient_name: "Y",
          },
        },
      }
    );
    expect(response.status).toBe(401);
  });
});

// ===========================================================================
// DELETE /organizations/:organizationId/templates/:templateId
// ===========================================================================

describe("DELETE /organizations/:organizationId/templates/:templateId", () => {
  let user: TestUser;
  let orgId: string;
  let templateId: string;

  beforeAll(async () => {
    user = await createTestUser("tpl-archive");
    orgId = (await createOrganization(user, "Tpl Archive Org")).id;

    const created = await createTemplate(user, orgId);
    const body = await json<{ id: string }>(created.response);
    templateId = body.id;
  });

  it("returns 200 and sets archivedAt", async () => {
    const response = await request(
      "DELETE",
      `/organizations/${orgId}/templates/${templateId}`,
      { user }
    );
    expect(response.status).toBe(200);

    const body = await json<{ archivedAt: string | null }>(response);
    expect(body.archivedAt).not.toBeNull();
  });

  it("hides the template from the list", async () => {
    const response = await request("GET", `/organizations/${orgId}/templates`, {
      user,
    });
    expect(response.status).toBe(200);
    const body = await json<{ data: Array<{ id: string }> }>(response);
    expect(body.data.find((t) => t.id === templateId)).toBeUndefined();
  });

  it("still returns the archived template via GET", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgId}/templates/${templateId}`,
      { user }
    );
    expect(response.status).toBe(200);
  });

  it("returns 404 when updating an archived template", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${templateId}`,
      { user, body: { name: "Should Fail" } }
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 when creating a version on an archived template", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions`,
      { user, body: { layout: validLayout } }
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "DELETE",
      `/organizations/${orgId}/templates/${templateId}`
    );
    expect(response.status).toBe(401);
  });
});

// ===========================================================================
// Template isolation across organizations
// ===========================================================================

describe("Template isolation across organizations", () => {
  let userA: TestUser;
  let userB: TestUser;
  let orgA: string;
  let orgB: string;
  let templateA: string;

  beforeAll(async () => {
    userA = await createTestUser("tpl-iso-a");
    userB = await createTestUser("tpl-iso-b");
    orgA = (await createOrganization(userA, "Iso A Org")).id;
    orgB = (await createOrganization(userB, "Iso B Org")).id;

    const created = await createTemplate(userA, orgA);
    templateA = (await json<{ id: string }>(created.response)).id;
  });

  it("returns 404 when B reads A's template", async () => {
    const response = await request(
      "GET",
      `/organizations/${orgB}/templates/${templateA}`,
      { user: userB }
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 when B patches A's template", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgB}/templates/${templateA}`,
      { user: userB, body: { name: "Stolen" } }
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 when B archives A's template", async () => {
    const response = await request(
      "DELETE",
      `/organizations/${orgB}/templates/${templateA}`,
      { user: userB }
    );
    expect(response.status).toBe(404);
  });

  it("hides B's templates from A's list", async () => {
    await createTemplate(userB, orgB, {
      name: `B Template ${Date.now()}`,
    });

    const response = await request("GET", `/organizations/${orgA}/templates`, {
      user: userA,
    });
    expect(response.status).toBe(200);

    const body = await json<{ data: Array<{ name: string }> }>(response);
    expect(
      body.data.find((t) => t.name.startsWith("B Template"))
    ).toBeUndefined();
  });
});
