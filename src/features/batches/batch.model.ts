import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import type { batchStatus } from "../../db/schema/batch.schema";
import { batches } from "../../db/schema/batch.schema";

export const BatchSelectSchema = createSelectSchema(batches);

export const BatchStatusSchema = z.enum([
  "open",
  "awaiting_signature",
  "signed",
  "submitted",
  "confirmed",
  "failed",
  "cancelled",
]);

export const OrganizationParamsSchema = z.object({
  organizationId: z.string().min(1),
});

export const BatchIdParamsSchema = OrganizationParamsSchema.extend({
  batchId: z.string().min(1),
});

export const BatchListQuerySchema = z.object({
  issuerWalletId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: BatchStatusSchema.optional(),
});

export const BatchSealSchema = z.object({
  issuerWalletId: z.string().min(1),
});

export const BatchSignatureSchema = z.object({
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/, "Signature must be hex"),
});

export const BatchListResponseSchema = z.object({
  data: z.array(BatchSelectSchema),
  meta: z.object({
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
  }),
});

export type BatchSealType = z.infer<typeof BatchSealSchema>;
export type BatchSignatureType = z.infer<typeof BatchSignatureSchema>;

export type Batch = typeof batches.$inferSelect;
export type NewBatch = typeof batches.$inferInsert;
export type BatchStatus = (typeof batchStatus.enumValues)[number];
