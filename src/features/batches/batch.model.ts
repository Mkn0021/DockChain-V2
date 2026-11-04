import { createSelectSchema } from "drizzle-typebox";
import { t } from "elysia";

import { batches, type batchStatus } from "../../db/schema/batch.schema";

export const BatchResponseSchema = createSelectSchema(batches);

export const BatchListResponseSchema = t.Object({
  data: t.Array(BatchResponseSchema),
  meta: t.Object({ limit: t.Number(), offset: t.Number(), total: t.Number() }),
});

const HexSchema = t.String({ pattern: "^0x[0-9a-fA-F]+$" });

export const BatchStatusSchema = t.Union([
  t.Literal("open"),
  t.Literal("awaiting_signature"),
  t.Literal("signed"),
  t.Literal("submitted"),
  t.Literal("confirmed"),
  t.Literal("failed"),
  t.Literal("cancelled"),
]);

export const OrganizationParamsSchema = t.Object({
  organizationId: t.String({ minLength: 1 }),
});

export const BatchIdParamsSchema = t.Object({
  batchId: t.String({ minLength: 1 }),
  organizationId: t.String({ minLength: 1 }),
});

export const BatchListQuerySchema = t.Object({
  issuerWalletId: t.Optional(t.String({ minLength: 1 })),
  limit: t.Integer({ default: 20, maximum: 100, minimum: 1 }),
  offset: t.Integer({ default: 0, minimum: 0 }),
  status: t.Optional(BatchStatusSchema),
});

export const BatchSealSchema = t.Object({
  issuerWalletId: t.String({ minLength: 1 }),
});

export const BatchSignatureSchema = t.Object({
  signature: t.String({ pattern: "^0x[0-9a-fA-F]+$" }),
});

export const BatchTypedDataResponseSchema = t.Object({
  domain: t.Object({
    chainId: t.Number(),
    name: t.String(),
    verifyingContract: HexSchema,
    version: t.String(),
  }),
  message: t.Object({
    count: t.Number(),
    dataHash: HexSchema,
    issuer: HexSchema,
    root: HexSchema,
    windowEnd: t.String(),
    windowStart: t.String(),
  }),
  primaryType: t.Literal("Anchor"),
  types: t.Object({
    Anchor: t.Array(t.Object({ name: t.String(), type: t.String() })),
  }),
});

export type BatchSealType = typeof BatchSealSchema.static;
export type BatchSignatureType = typeof BatchSignatureSchema.static;

export type Batch = typeof batches.$inferSelect;
export type NewBatch = typeof batches.$inferInsert;
export type BatchStatus = (typeof batchStatus.enumValues)[number];
