import { beforeAll, describe, expect, it } from "bun:test";

import {
  createOrganization,
  createTestUser,
  json,
  request,
  type TestUser,
} from "./helpers/test-app";

const validContract = {
  compilerVersion: "0.8.24",
  contractName: "UniversityCertificate",
  sourceCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract UniversityCertificate {
  address public owner;
  constructor() { owner = msg.sender; }
}`,
};

async function createTemplate(
  user: TestUser,
  organizationId: string,
  overrides: Partial<
    typeof validContract & { name: string; description?: string }
  > = {}
) {
  const payload = {
    name: `Template ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: "Test template",
    ...validContract,
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
        contractName: string;
        compilerVersion: string;
        sourceCode: string;
      }>;
    }>(response);

    expect(body.name).toBe(payload.name);
    expect(body.organizationId).toBe(orgId);
    expect(body.createdBy).toBe(user.id);
    expect(body.versions).toHaveLength(1);
    expect(body.versions[0]!.version).toBe(1);
    expect(body.versions[0]!.status).toBe("draft");
    expect(body.versions[0]!.contractName).toBe(validContract.contractName);
    expect(body.versions[0]!.compilerVersion).toBe(
      validContract.compilerVersion
    );
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates`,
      { body: { name: "NoAuth", ...validContract } }
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

  it("returns 422 for an invalid contractName starting with a digit", async () => {
    const { response } = await createTemplate(user, orgId, {
      contractName: "123Invalid",
    });
    expect(response.status).toBe(422);
  });

  it("returns 422 for a contractName with spaces", async () => {
    const { response } = await createTemplate(user, orgId, {
      contractName: "Invalid Name",
    });
    expect(response.status).toBe(422);
  });

  it("returns 200 for a contractName starting with underscore", async () => {
    const { response } = await createTemplate(user, orgId, {
      contractName: "_PrivateContract",
    });
    expect(response.status).toBe(200);
  });

  it("returns 200 for a contractName with $", async () => {
    const { response } = await createTemplate(user, orgId, {
      contractName: "$Contract",
    });
    expect(response.status).toBe(200);
  });

  it("returns 422 for an invalid compilerVersion format", async () => {
    const { response } = await createTemplate(user, orgId, {
      compilerVersion: "0.8",
    });
    expect(response.status).toBe(422);
  });

  it("returns 422 for a non-numeric compilerVersion", async () => {
    const { response } = await createTemplate(user, orgId, {
      compilerVersion: "latest",
    });
    expect(response.status).toBe(422);
  });

  it("returns 422 for an empty sourceCode", async () => {
    const { response } = await createTemplate(user, orgId, { sourceCode: "" });
    expect(response.status).toBe(422);
  });

  it("returns 422 when contractName is missing", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates`,
      {
        user,
        body: {
          name: "Missing Contract",
          compilerVersion: "0.8.24",
          sourceCode: "contract X {}",
        },
      }
    );
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
    templateId = (await json<{ id: string }>(created.response)).id;
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
    templateId = (await json<{ id: string }>(created.response)).id;
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
    templateId = (await json<{ id: string }>(created.response)).id;
  });

  it("returns 200 and creates version 2", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions`,
      {
        user,
        body: {
          ...validContract,
          sourceCode: "contract UniversityCertificate { uint256 public n; }",
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
              ...validContract,
              sourceCode: `contract Concurrent${i} {}`,
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

  it("returns 422 for an invalid contractName", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions`,
      { user, body: { ...validContract, contractName: "123Bad" } }
    );
    expect(response.status).toBe(422);
  });

  it("returns 404 for a nonexistent template", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/does-not-exist/versions`,
      { user, body: validContract }
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
      { user, body: validContract }
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions`,
      { body: validContract }
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
    templateId = (await json<{ id: string }>(created.response)).id;

    await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions`,
      { user, body: validContract }
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

  it("returns 200 when updating draft source", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}`,
      { user, body: { sourceCode: "contract UpdatedDraft {}" } }
    );
    expect(response.status).toBe(200);

    const body = await json<{ sourceCode: string }>(response);
    expect(body.sourceCode).toBe("contract UpdatedDraft {}");
  });

  it("returns 200 when updating compilerVersion", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}`,
      { user, body: { compilerVersion: "0.8.25" } }
    );
    expect(response.status).toBe(200);
  });

  it("returns 200 when updating contractName", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}`,
      { user, body: { contractName: "RenamedContract" } }
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
      { user, body: { sourceCode: "contract X {}" } }
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
      { user, body: { sourceCode: "contract ShouldFail {}" } }
    );
    expect(edit.status).toBe(409);
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(
      "PATCH",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}`,
      { body: { sourceCode: "contract X {}" } }
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

  it("returns 200 and sets publishedAt", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}/publish`,
      { user }
    );
    expect(response.status).toBe(200);

    const body = await json<{
      status: string;
      publishedAt: string | null;
    }>(response);
    expect(body.status).toBe("published");
    expect(body.publishedAt).not.toBeNull();
  });

  it("returns 409 when publishing twice", async () => {
    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${templateId}/versions/${versionId}/publish`,
      { user }
    );
    expect(response.status).toBe(409);
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
    const fresh = await createTemplate(user, orgId, {
      name: `NoAuth ${Date.now()}`,
    });
    const freshBody = await json<{
      id: string;
      versions: Array<{ id: string }>;
    }>(fresh.response);

    const response = await request(
      "POST",
      `/organizations/${orgId}/templates/${freshBody.id}/versions/${freshBody.versions[0]!.id}/publish`
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
    templateId = (await json<{ id: string }>(created.response)).id;
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

  it("returns 200 and hides archived templates from the list", async () => {
    const response = await request("GET", `/organizations/${orgId}/templates`, {
      user,
    });
    expect(response.status).toBe(200);
    const body = await json<{ data: Array<{ id: string }> }>(response);
    expect(body.data.find((t) => t.id === templateId)).toBeUndefined();
  });

  it("returns 200 when fetching the archived template by ID", async () => {
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
      { user, body: validContract }
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    const fresh = await createTemplate(user, orgId, {
      name: `Archive NoAuth ${Date.now()}`,
    });
    const freshBody = await json<{ id: string }>(fresh.response);

    const response = await request(
      "DELETE",
      `/organizations/${orgId}/templates/${freshBody.id}`
    );
    expect(response.status).toBe(401);
  });
});

// ===========================================================================
// Template isolation
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
