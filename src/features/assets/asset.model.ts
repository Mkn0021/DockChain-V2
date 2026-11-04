import { t } from "elysia";

export const OrganizationParamsSchema = t.Object({
  organizationId: t.String({ minLength: 1 }),
});

export const AssetIdParamsSchema = t.Object({
  assetId: t.String({ format: "uuid" }),
  organizationId: t.String({ minLength: 1 }),
});

export const AssetUploadSchema = t.Object({
  file: t.File({ maxSize: "2m" }),
});

export const AssetResponseSchema = t.Object({
  createdAt: t.Date(),
  createdBy: t.Optional(t.Union([t.String(), t.Null()])),
  filename: t.String(),
  id: t.String({ format: "uuid" }),
  mimeType: t.String(),
  organizationId: t.String(),
  sha256: t.String(),
  size: t.Number(),
  url: t.String(),
});

export const AssetListResponseSchema = t.Array(AssetResponseSchema);
export const AssetDeleteResponseSchema = t.Object({ id: t.String() });

export type AssetResponseType = typeof AssetResponseSchema.static;
