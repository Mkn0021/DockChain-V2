import { createSelectSchema } from "drizzle-typebox";
import { t } from "elysia";

import {
  invitations,
  members,
  organizations,
} from "../../db/schema/auth.schema";

// ── Response schemas (derived from Drizzle) ────────────────────────────────

export const OrganizationResponseSchema = createSelectSchema(organizations);
export const MemberResponseItemSchema = createSelectSchema(members);
export const InvitationResponseSchema = createSelectSchema(invitations);

export const OrganizationFullResponseSchema = t.Composite([
  OrganizationResponseSchema,
  t.Object({
    invitations: t.Array(InvitationResponseSchema),
    members: t.Array(MemberResponseItemSchema),
  }),
]);

export const MemberWithUserResponseSchema = t.Composite([
  MemberResponseItemSchema,
  t.Object({
    user: t.Object({
      email: t.String(),
      id: t.String(),
      image: t.Optional(t.Union([t.String(), t.Null()])),
      name: t.String(),
    }),
  }),
]);

export const MembersResponseSchema = t.Object({
  members: t.Array(MemberWithUserResponseSchema),
  total: t.Number(),
});

export const MemberResponseSchema = t.Object({
  member: MemberResponseItemSchema,
});

// ── Params ─────────────────────────────────────────────────────────────────

export const OrganizationIdParamsSchema = t.Object({
  organizationId: t.String({ minLength: 1 }),
});

export const MemberIdParamsSchema = t.Object({
  memberId: t.String({ minLength: 1 }),
  organizationId: t.String({ minLength: 1 }),
});

export const InvitationIdParamsSchema = t.Object({
  invitationId: t.String({ minLength: 1 }),
});

export const OrganizationInvitationParamsSchema = t.Object({
  invitationId: t.String({ minLength: 1 }),
  organizationId: t.String({ minLength: 1 }),
});

// ── Query ──────────────────────────────────────────────────────────────────

export const OrganizationListMembersQuerySchema = t.Object({
  limit: t.Integer({ default: 50, maximum: 100, minimum: 1 }),
  offset: t.Integer({ default: 0, minimum: 0 }),
});

// ── Request bodies ─────────────────────────────────────────────────────────

const organizationName = t.String({
  maxLength: 120,
  minLength: 2,
  pattern: "^\\S.*\\S$",
});

const organizationSlug = t.String({
  maxLength: 80,
  minLength: 2,
  pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
});

export const AssignableRoleSchema = t.Union([
  t.Literal("admin"),
  t.Literal("issuer"),
  t.Literal("viewer"),
]);

export const OrganizationCreateSchema = t.Object({
  name: organizationName,
  slug: organizationSlug,
});

export const OrganizationUpdateSchema = t.Object(
  {
    logo: t.Optional(t.String({ format: "uri" })),
    name: t.Optional(organizationName),
    slug: t.Optional(organizationSlug),
  },
  { minProperties: 1 }
);

export const MemberRoleUpdateSchema = t.Object({
  role: AssignableRoleSchema,
});

export const InvitationCreateSchema = t.Object({
  email: t.String({ format: "email" }),
  role: t.Optional(AssignableRoleSchema),
});

export const SetActiveOrganizationSchema = t.Object({
  organizationId: t.Union([t.String({ minLength: 1 }), t.Null()]),
});

// ── Type helpers (unchanged, derived from Drizzle) ─────────────────────────

export type OrganizationCreateType = typeof OrganizationCreateSchema.static;
export type OrganizationUpdateType = typeof OrganizationUpdateSchema.static;
export type MemberRoleUpdateType = typeof MemberRoleUpdateSchema.static;
export type InvitationCreateType = typeof InvitationCreateSchema.static;

export type OrganizationType = typeof organizations.$inferSelect;
export type NewOrganizationType = typeof organizations.$inferInsert;
export type MemberType = typeof members.$inferSelect;
export type InvitationType = typeof invitations.$inferSelect;
