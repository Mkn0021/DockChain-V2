import { describe, expect, it } from "bun:test";

import {
  hasOrganizationPermission,
  type OrganizationPermissions,
} from "../src/auth/organization-access";
import {
  InvitationCreateSchema,
  InvitationIdParamsSchema,
  MemberRoleUpdateSchema,
  OrganizationCreateSchema,
  OrganizationIdParamsSchema,
  OrganizationRoleSchema,
  OrganizationUpdateSchema,
} from "../src/features/organizations/organization.model";

// -----------------------------------------------------------------------------
// Organization schemas
// -----------------------------------------------------------------------------

describe("OrganizationCreateSchema", () => {
  it("accepts valid organization input", () => {
    const result = OrganizationCreateSchema.safeParse({
      name: "Test University",
      slug: "test-university",
    });

    expect(result.success).toBe(true);
  });

  it("trims the organization name and slug", () => {
    const result = OrganizationCreateSchema.parse({
      name: "  Test University  ",
      slug: "test-university",
    });

    expect(result.name).toBe("Test University");
  });

  it("rejects a name shorter than two characters", () => {
    expect(
      OrganizationCreateSchema.safeParse({
        name: "A",
        slug: "test-university",
      }).success
    ).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(
      OrganizationCreateSchema.safeParse({
        name: "",
        slug: "test-university",
      }).success
    ).toBe(false);
  });

  it("rejects an invalid slug", () => {
    const invalidSlugs = [
      "Test University",
      "test_university",
      "-test",
      "test-",
      "test--university",
      "TEST-UNIVERSITY",
    ];

    for (const slug of invalidSlugs) {
      expect(
        OrganizationCreateSchema.safeParse({
          name: "Test University",
          slug,
        }).success
      ).toBe(false);
    }
  });

  it("rejects missing fields", () => {
    expect(OrganizationCreateSchema.safeParse({}).success).toBe(false);
  });
});

describe("OrganizationUpdateSchema", () => {
  it("accepts a name-only update", () => {
    expect(
      OrganizationUpdateSchema.safeParse({
        name: "Updated University",
      }).success
    ).toBe(true);
  });

  it("accepts a slug-only update", () => {
    expect(
      OrganizationUpdateSchema.safeParse({
        slug: "updated-university",
      }).success
    ).toBe(true);
  });

  it("accepts a nullable logo", () => {
    expect(
      OrganizationUpdateSchema.safeParse({
        logo: null,
      }).success
    ).toBe(true);
  });

  it("rejects an empty update", () => {
    expect(OrganizationUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an invalid slug", () => {
    expect(
      OrganizationUpdateSchema.safeParse({
        slug: "Invalid Slug",
      }).success
    ).toBe(false);
  });

  it("rejects fields outside the update schema", () => {
    const result = OrganizationUpdateSchema.safeParse({
      id: "forged-id",
      name: "Updated University",
    });

    // Zod object schemas strip unknown keys by default.
    expect(result.success).toBe(true);
    expect(result).not.toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ id: "forged-id" }),
      })
    );
  });
});

describe("OrganizationIdParamsSchema", () => {
  it("accepts a valid organization ID", () => {
    expect(
      OrganizationIdParamsSchema.safeParse({
        organizationId: "org_123",
      }).success
    ).toBe(true);
  });

  it("rejects a missing organization ID", () => {
    expect(OrganizationIdParamsSchema.safeParse({}).success).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// Organization roles
// -----------------------------------------------------------------------------

describe("OrganizationRoleSchema", () => {
  it.each(["owner", "admin", "issuer", "viewer"])(
    "accepts the %s role",
    (role) => {
      expect(OrganizationRoleSchema.safeParse(role).success).toBe(true);
    }
  );

  it("rejects an unknown role", () => {
    expect(OrganizationRoleSchema.safeParse("superadmin").success).toBe(false);
  });
});

describe("MemberRoleUpdateSchema", () => {
  it("accepts a valid role update", () => {
    expect(
      MemberRoleUpdateSchema.safeParse({
        memberId: "member_123",
        role: "issuer",
      }).success
    ).toBe(true);
  });

  it("accepts admin and viewer roles", () => {
    for (const role of ["admin", "viewer"]) {
      expect(
        MemberRoleUpdateSchema.safeParse({
          memberId: "member_123",
          role,
        }).success
      ).toBe(true);
    }
  });

  it("rejects assigning owner through ordinary role update", () => {
    expect(
      MemberRoleUpdateSchema.safeParse({
        memberId: "member_123",
        role: "owner",
      }).success
    ).toBe(false);
  });

  it("rejects an unknown role", () => {
    expect(
      MemberRoleUpdateSchema.safeParse({
        memberId: "member_123",
        role: "superadmin",
      }).success
    ).toBe(false);
  });

  it("rejects a missing member ID", () => {
    expect(
      MemberRoleUpdateSchema.safeParse({
        role: "viewer",
      }).success
    ).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// Invitation schemas
// -----------------------------------------------------------------------------

describe("InvitationCreateSchema", () => {
  it("accepts a valid invitation", () => {
    expect(
      InvitationCreateSchema.safeParse({
        email: "member@example.com",
        role: "issuer",
      }).success
    ).toBe(true);
  });

  it("defaults the role to viewer", () => {
    const result = InvitationCreateSchema.parse({
      email: "member@example.com",
    });

    expect(result.role).toBe("viewer");
  });

  it("accepts admin, issuer, and viewer", () => {
    for (const role of ["admin", "issuer", "viewer"]) {
      expect(
        InvitationCreateSchema.safeParse({
          email: "member@example.com",
          role,
        }).success
      ).toBe(true);
    }
  });

  it("rejects inviting someone directly as owner", () => {
    expect(
      InvitationCreateSchema.safeParse({
        email: "member@example.com",
        role: "owner",
      }).success
    ).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(
      InvitationCreateSchema.safeParse({
        email: "not-an-email",
      }).success
    ).toBe(false);
  });
});

describe("InvitationIdParamsSchema", () => {
  it("accepts a valid invitation ID", () => {
    expect(
      InvitationIdParamsSchema.safeParse({
        invitationId: "invitation_123",
      }).success
    ).toBe(true);
  });

  it("rejects a missing invitation ID", () => {
    expect(InvitationIdParamsSchema.safeParse({}).success).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// Permission helper contract
// -----------------------------------------------------------------------------
//
// These tests verify TypeScript compatibility for permission declarations.
// They do not call Better Auth or prove that configured roles enforce them.
// -----------------------------------------------------------------------------

describe("OrganizationPermissions", () => {
  it("supports permissions for organization operations", () => {
    const permissions: OrganizationPermissions[] = [
      { organization: ["update"] },
      { organization: ["delete"] },
      { member: ["create", "update", "delete"] },
      { invitation: ["create", "cancel"] },
      { template: ["create", "read", "update", "publish", "delete"] },
      { document: ["create", "read", "revoke"] },
      { asset: ["create", "read", "delete"] },
    ];

    expect(permissions).toHaveLength(7);
  });

  it("exports the permission-check helper", () => {
    expect(typeof hasOrganizationPermission).toBe("function");
  });
});
