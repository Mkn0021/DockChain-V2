import { z } from "zod";

export const OrganizationParamsSchema = z.object({
  organizationId: z.string().min(1),
});

export const AssetIdParamsSchema = OrganizationParamsSchema.extend({
  assetId: z.string().uuid(),
});

export const AssetResponseSchema = z.object({
  createdAt: z.date(),
  createdBy: z.string().nullable(),
  filename: z.string(),
  id: z.string().uuid(),
  mimeType: z.string(),
  organizationId: z.string(),
  sha256: z.string(),
  size: z.number(),
  url: z.string(),
});

export const AssetListResponseSchema = z.array(AssetResponseSchema);

export type AssetResponseType = z.infer<typeof AssetResponseSchema>;
