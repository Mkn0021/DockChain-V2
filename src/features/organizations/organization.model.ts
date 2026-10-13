import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";

import {
  invitations,
  members,
  organizations,
} from "../../db/schema/auth.schema";

// Database-derived schemas
export const OrganizationSelectSchema = createSelectSchema(organizations);

export const OrganizationInsertSchema = createInsertSchema(organizations);

const OrganizationDatabaseUpdateSchema = createUpdateSchema(organizations);

export const MemberSelectSchema = createSelectSchema(members);

export const InvitationSelectSchema = createSelectSchema(invitations);

// Params
export const OrganizationIdParamsSchema = z.object({
  organizationId: OrganizationSelectSchema.shape.id,
});

export const MemberIdParamsSchema = z.object({
  memberId: MemberSelectSchema.shape.id,
  organizationId: OrganizationSelectSchema.shape.id,
});

export const InvitationIdParamsSchema = z.object({
  invitationId: InvitationSelectSchema.shape.id,
});

export const OrganizationInvitationParamsSchema =
  InvitationIdParamsSchema.extend({
    organizationId: OrganizationSelectSchema.shape.id,
  });

// Organization
export const OrganizationCreateSchema = OrganizationInsertSchema.pick({
  name: true,
  slug: true,
}).extend({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const OrganizationUpdateSchema = OrganizationDatabaseUpdateSchema.pick({
  logo: true,
  name: true,
  slug: true,
})
  .extend({
    name: z.string().trim().min(2).max(120).optional(),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// Member management
export const OrganizationRoleSchema = z.enum([
  "owner",
  "admin",
  "issuer",
  "viewer",
]);

// Prevent assigning ownership through ordinary role updates.
export const MemberRoleUpdateSchema = z.object({
  memberId: MemberSelectSchema.shape.id,
  role: z.enum(["admin", "issuer", "viewer"]),
});

// Invitations
export const InvitationCreateSchema = z.object({
  email: z.email(),
  role: z.enum(["admin", "issuer", "viewer"]).default("viewer"),
});

// Listing
export const OrganizationListMembersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Active organization
export const SetActiveOrganizationSchema = z.object({
  organizationId: OrganizationSelectSchema.shape.id.nullable(),
});

// Inferred types
export type OrganizationCreateType = z.infer<typeof OrganizationCreateSchema>;

export type OrganizationUpdateType = z.infer<typeof OrganizationUpdateSchema>;

export type MemberRoleUpdateType = z.infer<typeof MemberRoleUpdateSchema>;

export type InvitationCreateType = z.infer<typeof InvitationCreateSchema>;

export type OrganizationType = typeof organizations.$inferSelect;

export type NewOrganizationType = typeof organizations.$inferInsert;

export type MemberType = typeof members.$inferSelect;

export type InvitationType = typeof invitations.$inferSelect;
