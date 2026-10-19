import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { documents } from "../../db/schema/document.schema";

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
  items: z
    .array(DocumentCreateSchema.omit({ mode: true, templateVersionId: true }))
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

export type DocumentCreateType = z.infer<typeof DocumentCreateSchema>;
export type DocumentUpdateType = z.infer<typeof DocumentUpdateSchema>;
export type DocumentBulkCreateType = z.infer<typeof DocumentBulkCreateSchema>;
export type RecipientType = z.infer<typeof RecipientSchema>;
