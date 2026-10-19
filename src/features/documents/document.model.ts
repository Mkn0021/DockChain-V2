import { createSelectSchema } from "drizzle-zod";
import { t } from "elysia";
import { z } from "zod";

import {
  documents,
  type documentStatus,
} from "../../db/schema/document.schema";

export const DocumentSelectSchema = createSelectSchema(documents);

export const DocumentStatusSchema = z.enum([
  "draft",
  "ready",
  "batched",
  "issued",
  "revoked",
]);

export const OrganizationParamsSchema = z.object({
  organizationId: z.string().min(1),
});

export const DocumentIdParamsSchema = OrganizationParamsSchema.extend({
  documentId: z.string().min(1),
});

export const DocumentListQuerySchema = z.object({
  batchId: z.string().min(1).optional(),
  createdFrom: z.iso.datetime().optional(),
  createdTo: z.iso.datetime().optional(),
  externalRef: z.string().min(1).optional(),
  issuerWalletId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: DocumentStatusSchema.optional(),
  templateId: z.string().min(1).optional(),
  templateVersionId: z.string().min(1).optional(),
});

// File cant be processed by zod, so we use Elysia's t.File for that.
export const DocumentImportSchema = t.Object({
  file: t.File({ maxSize: "5m" }),
  issuerWalletId: t.Optional(t.String()),
  templateVersionId: t.String(),
});

const FieldValuesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

export const RecipientSchema = z.object({
  email: z.email().max(320),
  name: z.string().trim().min(1).max(200),
});

export const DocumentCreateSchema = z.object({
  expiresAt: z.iso.datetime().optional(),
  externalRef: z.string().min(1).max(200).optional(),
  fields: FieldValuesSchema,
  issuerWalletId: z.string().min(1).optional(),
  mode: z.enum(["draft", "ready"]).default("ready"),
  recipient: RecipientSchema.optional(),
  templateVersionId: z.string().min(1),
});

export const DocumentUpdateSchema = z
  .object({
    expiresAt: z.iso.datetime().nullable().optional(),
    fields: FieldValuesSchema.optional(),
    finalize: z.literal(true).optional(),
    recipient: RecipientSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.fields !== undefined ||
      data.recipient !== undefined ||
      data.expiresAt !== undefined ||
      data.finalize === true,
    { message: "At least one field must be provided" }
  );

export const DocumentBulkCreateSchema = z.object({
  issuerWalletId: z.string().min(1).optional(),
  items: z
    .array(
      DocumentCreateSchema.omit({
        issuerWalletId: true,
        mode: true,
        templateVersionId: true,
      })
    )
    .min(1)
    .max(500),
  mode: z.enum(["draft", "ready"]).default("ready"),
  templateVersionId: z.string().min(1),
});

export const DocumentListResponseSchema = z.object({
  data: z.array(DocumentSelectSchema),
  meta: z.object({
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
  }),
});

export const DocumentDetailResponseSchema = DocumentSelectSchema.extend({
  fields: z.record(z.string(), z.unknown()),
  recipient: RecipientSchema.nullable(),
});

export const DocumentBulkResponseSchema = z.object({
  created: z.number(),
  documents: z.array(DocumentSelectSchema),
  errors: z
    .array(
      z.object({
        index: z.number(),
        message: z.string(),
      })
    )
    .optional(),
});

export const DocumentPdfQuerySchema = z.object({
  preview: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
});

export const DocumentPdfUrlResponseSchema = z.object({
  expiresIn: z.number(),
  key: z.string(),
  url: z.string(),
});

export const DocumentResendResponseSchema = z.object({
  attempts: z.number().int().nonnegative(),
  channel: z.literal("email"),
  createdAt: z.date(),
  documentId: z.string(),
  id: z.string(),
  lastError: z.string().nullable(),
  sentAt: z.date().nullable(),
  status: z.enum(["queued", "sent", "failed"]),
  updatedAt: z.date(),
});

export const ProofBundleSchema = z.object({
  blockNumber: z.string().nullable(),
  chainId: z.number(),
  claimedIssuedAt: z.number(),
  expiresAt: z.number(),
  fields: z.record(z.string(), z.unknown()),
  holderKey: z.string(),
  issuer: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  leaf: z.string().regex(/^0x[0-9a-f]{64}$/),
  leafIndex: z.number().int().nonnegative(),
  proof: z.array(z.string()),
  recipient: z
    .object({
      email: z.string(),
      name: z.string(),
    })
    .nullable(),
  registry: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  root: z.string().regex(/^0x[0-9a-f]{64}$/),
  salt: z.string(),
  schemaHash: z.string().regex(/^0x[0-9a-f]{64}$/),
  txHash: z.string().nullable(),
  version: z.literal(1),
  windowEnd: z.number(),
  windowStart: z.number(),
});

export type ProofBundleType = z.infer<typeof ProofBundleSchema>;

export type DocumentCreateType = z.infer<typeof DocumentCreateSchema>;
export type DocumentUpdateType = z.infer<typeof DocumentUpdateSchema>;
export type DocumentBulkCreateType = z.infer<typeof DocumentBulkCreateSchema>;
export type DocumentImportType = typeof DocumentImportSchema.static;
export type DocumentPdfUrlResponseType = z.infer<
  typeof DocumentPdfUrlResponseSchema
>;
export type DocumentResendResponseType = z.infer<
  typeof DocumentResendResponseSchema
>;
export type RecipientType = z.infer<typeof RecipientSchema>;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentStatus = (typeof documentStatus.enumValues)[number];
