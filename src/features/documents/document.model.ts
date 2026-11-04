import { createSelectSchema } from "drizzle-typebox";
import { t } from "elysia";

import {
  documents,
  type documentStatus,
} from "../../db/schema/document.schema";

// ── Response schemas (derived) ─────────────────────────────────────────────

export const DocumentResponseSchema = createSelectSchema(documents);

export const DocumentListResponseSchema = t.Object({
  data: t.Array(DocumentResponseSchema),
  meta: t.Object({ limit: t.Number(), offset: t.Number(), total: t.Number() }),
});

const RecipientObjectSchema = t.Object({
  email: t.String({ format: "email", maxLength: 320 }),
  name: t.String({ maxLength: 200, minLength: 1 }),
});

export const DocumentDetailResponseSchema = t.Composite([
  DocumentResponseSchema,
  t.Object({
    fields: t.Record(t.String(), t.Any()),
    recipient: t.Union([RecipientObjectSchema, t.Null()]),
  }),
]);

export const DocumentBulkResponseSchema = t.Object({
  created: t.Number(),
  documents: t.Array(DocumentResponseSchema),
  errors: t.Optional(
    t.Array(t.Object({ index: t.Number(), message: t.String() }))
  ),
});

export const DocumentPdfUrlResponseSchema = t.Object({
  expiresIn: t.Number(),
  key: t.String(),
  url: t.String(),
});

export const DocumentResendResponseSchema = t.Object({
  attempts: t.Number(),
  channel: t.Literal("email"),
  createdAt: t.Date(),
  documentId: t.String(),
  id: t.String(),
  lastError: t.Union([t.String(), t.Null()]),
  sentAt: t.Union([t.Date(), t.Null()]),
  status: t.Union([
    t.Literal("queued"),
    t.Literal("sent"),
    t.Literal("failed"),
  ]),
  updatedAt: t.Date(),
});

const HexAddress = t.String({ pattern: "^0x[0-9a-fA-F]{40}$" });
const HexHash = t.String({ pattern: "^0x[0-9a-f]{64}$" });

export const ProofBundleSchema = t.Object({
  blockNumber: t.Union([t.String(), t.Null()]),
  chainId: t.Number(),
  claimedIssuedAt: t.Number(),
  expiresAt: t.Number(),
  fields: t.Record(t.String(), t.Any()),
  holderKey: t.String(),
  issuer: HexAddress,
  issuerDomain: t.Optional(t.String()),
  leaf: HexHash,
  leafIndex: t.Integer({ minimum: 0 }),
  proof: t.Array(t.String()),
  recipient: t.Union([RecipientObjectSchema, t.Null()]),
  registry: HexAddress,
  root: HexHash,
  salt: t.String(),
  schemaHash: HexHash,
  txHash: t.Union([t.String(), t.Null()]),
  version: t.Literal(1),
  windowEnd: t.Number(),
  windowStart: t.Number(),
});

// ── Params ─────────────────────────────────────────────────────────────────

export const OrganizationParamsSchema = t.Object({
  organizationId: t.String({ minLength: 1 }),
});

export const DocumentIdParamsSchema = t.Object({
  documentId: t.String({ minLength: 1 }),
  organizationId: t.String({ minLength: 1 }),
});

// ── Query ──────────────────────────────────────────────────────────────────

export const DocumentStatusSchema = t.Union([
  t.Literal("draft"),
  t.Literal("ready"),
  t.Literal("batched"),
  t.Literal("issued"),
  t.Literal("revoked"),
]);

export const DocumentListQuerySchema = t.Object({
  batchId: t.Optional(t.String({ minLength: 1 })),
  createdFrom: t.Optional(t.Date()),
  createdTo: t.Optional(t.Date()),
  externalRef: t.Optional(t.String({ minLength: 1 })),
  issuerWalletId: t.Optional(t.String({ minLength: 1 })),
  limit: t.Integer({ default: 20, maximum: 100, minimum: 1 }),
  offset: t.Integer({ default: 0, minimum: 0 }),
  status: t.Optional(DocumentStatusSchema),
  templateId: t.Optional(t.String({ minLength: 1 })),
  templateVersionId: t.Optional(t.String({ minLength: 1 })),
});

export const DocumentPdfQuerySchema = t.Object({
  preview: t.Optional(
    t.Union([t.Literal("true"), t.Literal("false"), t.Boolean()])
  ),
});

// ── Request bodies ─────────────────────────────────────────────────────────

const FieldValuesSchema = t.Record(
  t.String(),
  t.Union([t.String(), t.Number(), t.Boolean(), t.Null()])
);

export const RecipientSchema = t.Object({
  email: t.String({ format: "email", maxLength: 320 }),
  name: t.String({ maxLength: 200, minLength: 1 }),
});

const DocumentCreateCore = {
  expiresAt: t.Optional(t.Date()),
  externalRef: t.Optional(t.String({ maxLength: 200, minLength: 1 })),
  fields: FieldValuesSchema,
  recipient: t.Optional(RecipientSchema),
};

export const DocumentCreateSchema = t.Object({
  ...DocumentCreateCore,
  issuerWalletId: t.Optional(t.String({ minLength: 1 })),
  mode: t.Optional(
    t.Union([t.Literal("draft"), t.Literal("ready")], { default: "ready" })
  ),
  templateVersionId: t.String({ minLength: 1 }),
});

export const DocumentUpdateSchema = t.Object(
  {
    expiresAt: t.Optional(t.Union([t.Date(), t.Null()])),
    fields: t.Optional(FieldValuesSchema),
    finalize: t.Optional(t.Literal(true)),
    recipient: t.Optional(t.Union([RecipientSchema, t.Null()])),
  },
  { minProperties: 1 }
);

export const DocumentBulkCreateSchema = t.Object({
  issuerWalletId: t.Optional(t.String({ minLength: 1 })),
  items: t.Array(t.Object(DocumentCreateCore), { maxItems: 500, minItems: 1 }),
  mode: t.Optional(
    t.Union([t.Literal("draft"), t.Literal("ready")], { default: "ready" })
  ),
  templateVersionId: t.String({ minLength: 1 }),
});

export const DocumentImportSchema = t.Object({
  file: t.File({ maxSize: "5m" }),
  issuerWalletId: t.Optional(t.String()),
  templateVersionId: t.String(),
});

// ── Type helpers ───────────────────────────────────────────────────────────

export type ProofBundleType = typeof ProofBundleSchema.static;
export type DocumentCreateType = typeof DocumentCreateSchema.static;
export type DocumentUpdateType = typeof DocumentUpdateSchema.static;
export type DocumentBulkCreateType = typeof DocumentBulkCreateSchema.static;
export type DocumentImportType = typeof DocumentImportSchema.static;
export type DocumentPdfUrlResponseType =
  typeof DocumentPdfUrlResponseSchema.static;
export type DocumentResendResponseType =
  typeof DocumentResendResponseSchema.static;
export type RecipientType = typeof RecipientSchema.static;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentStatus = (typeof documentStatus.enumValues)[number];
