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

export const OrganizationSelectSchema = createSelectSchema(organizations);
export const OrganizationInsertSchema = createInsertSchema(organizations);
const OrganizationDatabaseUpdateSchema = createUpdateSchema(organizations);

export const MemberSelectSchema = createSelectSchema(members);
export const InvitationSelectSchema = createSelectSchema(invitations);

const organizationId = OrganizationSelectSchema.shape.id;
const memberId = MemberSelectSchema.shape.id;
const invitationId = InvitationSelectSchema.shape.id;

const organizationName = z.string().trim().min(2).max(120);
const organizationSlug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const AssignableRoleSchema = z.enum(["admin", "issuer", "viewer"]);
export const OrganizationRoleSchema = z.enum([
  "owner",
  "admin",
  "issuer",
  "viewer",
]);

export const OrganizationIdParamsSchema = z.object({
  organizationId,
});

export const MemberIdParamsSchema = z.object({
  memberId,
  organizationId,
});

export const InvitationIdParamsSchema = z.object({
  invitationId,
});

export const OrganizationInvitationParamsSchema =
  InvitationIdParamsSchema.extend({ organizationId });

export const OrganizationCreateSchema = OrganizationInsertSchema.pick({
  name: true,
  slug: true,
}).extend({
  name: organizationName,
  slug: organizationSlug,
});

export const OrganizationUpdateSchema = OrganizationDatabaseUpdateSchema.pick({
  logo: true,
  name: true,
  slug: true,
})
  .extend({
    name: organizationName.optional(),
    slug: organizationSlug.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const MemberRoleUpdateSchema = z.object({
  role: AssignableRoleSchema,
});

export const InvitationCreateSchema = z.object({
  email: z.email(),
  role: AssignableRoleSchema.default("viewer"),
});

export const OrganizationListMembersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const SetActiveOrganizationSchema = z.object({
  organizationId: organizationId.nullable(),
});

export type OrganizationCreateType = z.infer<typeof OrganizationCreateSchema>;
export type OrganizationUpdateType = z.infer<typeof OrganizationUpdateSchema>;
export type MemberRoleUpdateType = z.infer<typeof MemberRoleUpdateSchema>;
export type InvitationCreateType = z.infer<typeof InvitationCreateSchema>;

export type OrganizationType = typeof organizations.$inferSelect;
export type NewOrganizationType = typeof organizations.$inferInsert;
export type MemberType = typeof members.$inferSelect;
export type InvitationType = typeof invitations.$inferSelect;
