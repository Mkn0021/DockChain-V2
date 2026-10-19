import { z } from "zod";

export const OrganizationParamsSchema = z.object({
  organizationId: z.string().min(1),
});

export const ApiKeyIdParamsSchema = OrganizationParamsSchema.extend({
  keyId: z.string().min(1),
});

export const ApiKeyMetadataSchema = z.object({
  organizationId: z.string(),
  permissions: z.record(z.string(), z.array(z.string())),
});

export const ApiKeyCreateSchema = z.object({
  expiresInDays: z.number().int().positive().max(3650).optional(),
  name: z.string().trim().min(1).max(100),
  permissions: z.record(z.string(), z.array(z.string())).optional(),
});

export const ApiKeyResponseSchema = z.object({
  createdAt: z.date(),
  expiresAt: z.date().nullable(),
  id: z.string(),
  key: z.string().optional(),
  metadata: ApiKeyMetadataSchema.nullable(),
  name: z.string().nullable(),
  prefix: z.string().nullable(),
  start: z.string().nullable(),
});

export const ApiKeyListResponseSchema = z.array(
  z.object({
    createdAt: z.date(),
    expiresAt: z.date().nullable(),
    id: z.string(),
    metadata: ApiKeyMetadataSchema.nullable(),
    name: z.string().nullable(),
    prefix: z.string().nullable(),
    start: z.string().nullable(),
  })
);

export type ApiKeyCreateType = z.infer<typeof ApiKeyCreateSchema>;
