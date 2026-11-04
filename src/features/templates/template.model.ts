import { createSelectSchema } from "drizzle-typebox";
import { t } from "elysia";

import {
  templateVersions,
  templates,
  type templateVersionStatus,
} from "../../db/schema/template.schema";

// ── Response schemas (derived) ─────────────────────────────────────────────

export const TemplateResponseSchema = createSelectSchema(templates);
export const TemplateVersionResponseSchema =
  createSelectSchema(templateVersions);

export const TemplateListResponseSchema = t.Object({
  data: t.Array(TemplateResponseSchema),
  meta: t.Object({ limit: t.Number(), offset: t.Number(), total: t.Number() }),
});

export const TemplateDetailsResponseSchema = t.Composite([
  TemplateResponseSchema,
  t.Object({ versions: t.Array(TemplateVersionResponseSchema) }),
]);

export const TemplateVersionsResponseSchema = t.Array(
  TemplateVersionResponseSchema
);

export const TemplatePreviewResponseSchema = t.Object({
  svg: t.String(),
});

// ── Params ─────────────────────────────────────────────────────────────────

export const OrganizationParamsSchema = t.Object({
  organizationId: t.String({ minLength: 1 }),
});

export const TemplateIdParamsSchema = t.Object({
  organizationId: t.String({ minLength: 1 }),
  templateId: t.String({ minLength: 1 }),
});

export const TemplateVersionParamsSchema = t.Object({
  organizationId: t.String({ minLength: 1 }),
  templateId: t.String({ minLength: 1 }),
  versionId: t.String({ minLength: 1 }),
});

// ── Query ──────────────────────────────────────────────────────────────────

export const TemplateListQuerySchema = t.Object({
  limit: t.Integer({ default: 20, maximum: 100, minimum: 1 }),
  offset: t.Integer({ default: 0, minimum: 0 }),
});

// ── Request bodies ─────────────────────────────────────────────────────────

const templateName = t.String({ maxLength: 120, minLength: 2 });

export const FieldTypeSchema = t.Union([
  t.Literal("text"),
  t.Literal("number"),
  t.Literal("date"),
  t.Literal("email"),
  t.Literal("enum"),
]) satisfies unknown;

export const FieldDefinitionSchema = t.Object({
  key: t.String({ pattern: "^[a-z][a-z0-9_]{0,63}$" }),
  label: t.String({ maxLength: 100, minLength: 1 }),
  maxLength: t.Optional(t.Integer({ exclusiveMinimum: 0, maximum: 10_000 })),
  options: t.Optional(
    t.Array(t.String({ maxLength: 200, minLength: 1 }), {
      maxItems: 50,
      minItems: 1,
    })
  ),
  pattern: t.Optional(t.String({ maxLength: 200 })),
  required: t.Boolean({ default: true }),
  type: FieldTypeSchema,
});

export const FieldSchemaSchema = t.Object({
  fields: t.Array(FieldDefinitionSchema, { maxItems: 100, minItems: 1 }),
});

export const LayoutSchema = t.String({
  maxLength: 500 * 1024,
  minLength: 1,
  pattern: "^\\s*<svg",
});

export const TemplateCreateSchema = t.Object({
  description: t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()])),
  fieldSchema: t.Optional(FieldSchemaSchema),
  layout: LayoutSchema,
  name: templateName,
});

export const TemplateUpdateSchema = t.Object(
  {
    description: t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()])),
    name: t.Optional(templateName),
  },
  { minProperties: 1 }
);

export const TemplateVersionCreateSchema = t.Object({
  fieldSchema: t.Optional(FieldSchemaSchema),
  layout: LayoutSchema,
});

export const TemplateVersionUpdateSchema = t.Object(
  {
    fieldSchema: t.Optional(FieldSchemaSchema),
    layout: t.Optional(LayoutSchema),
  },
  { minProperties: 1 }
);

export const TemplatePreviewSchema = t.Object({
  data: t.Record(
    t.String(),
    t.Union([t.String(), t.Number(), t.Boolean(), t.Null()])
  ),
});

// ── Type helpers ───────────────────────────────────────────────────────────

export type FieldDefinitionType = typeof FieldDefinitionSchema.static;
export type FieldSchemaType = typeof FieldSchemaSchema.static;
export type FieldTypeType = typeof FieldTypeSchema.static;

export type TemplateCreateType = typeof TemplateCreateSchema.static;
export type TemplateUpdateType = typeof TemplateUpdateSchema.static;
export type TemplateVersionCreateType =
  typeof TemplateVersionCreateSchema.static;
export type TemplateVersionUpdateType =
  typeof TemplateVersionUpdateSchema.static;
export type TemplatePreviewType = typeof TemplatePreviewSchema.static;

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
export type TemplateVersion = typeof templateVersions.$inferSelect;
export type NewTemplateVersion = typeof templateVersions.$inferInsert;
export type TemplateVersionStatus =
  (typeof templateVersionStatus.enumValues)[number];
