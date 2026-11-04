import { t } from "elysia";

export const OrganizationParamsSchema = t.Object({
  organizationId: t.String({ minLength: 1 }),
});

export const ApiKeyIdParamsSchema = t.Object({
  keyId: t.String({ minLength: 1 }),
  organizationId: t.String({ minLength: 1 }),
});

export const ApiKeyMetadataSchema = t.Object({
  organizationId: t.String(),
  permissions: t.Record(t.String(), t.Array(t.String())),
});

export const ApiKeyCreateSchema = t.Object({
  expiresInDays: t.Optional(t.Integer({ exclusiveMinimum: 0, maximum: 3650 })),
  name: t.String({ maxLength: 100, minLength: 1 }),
  permissions: t.Optional(t.Record(t.String(), t.Array(t.String()))),
});

export const ApiKeyResponseSchema = t.Object({
  createdAt: t.Date(),
  expiresAt: t.Union([t.Date(), t.Null()]),
  id: t.String(),
  key: t.Optional(t.String()),
  metadata: t.Optional(t.Union([ApiKeyMetadataSchema, t.Null()])),
  name: t.Optional(t.Union([t.String(), t.Null()])),
  prefix: t.Optional(t.Union([t.String(), t.Null()])),
  start: t.Optional(t.Union([t.String(), t.Null()])),
});

export const ApiKeyListResponseSchema = t.Array(ApiKeyResponseSchema);

export type ApiKeyCreateType = typeof ApiKeyCreateSchema.static;
export type ApiKeyResponseType = typeof ApiKeyResponseSchema.static;
