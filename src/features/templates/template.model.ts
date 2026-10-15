import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import {
  templateVersionStatus,
  templateVersions,
  templates,
} from "../../db/schema/template.schema";

export const TemplateSelectSchema = createSelectSchema(templates);
export const TemplateVersionSelectSchema = createSelectSchema(templateVersions);

const templateName = z.string().trim().min(2).max(120);

export const FieldTypeSchema = z.enum([
  "text",
  "number",
  "date",
  "email",
  "enum",
]);

export const FieldDefinitionSchema = z
  .object({
    key: z
      .string()
      .regex(
        /^[a-z][a-z0-9_]{0,63}$/,
        "Field key must start with a lowercase letter and contain only lowercase letters, digits, and underscores"
      ),
    label: z.string().trim().min(1).max(100),
    maxLength: z.number().int().positive().max(10_000).optional(),
    options: z.array(z.string().min(1).max(200)).min(1).max(50).optional(),
    pattern: z
      .string()
      .max(200)
      .refine(
        (value) => {
          try {
            return new RegExp(value) instanceof RegExp;
          } catch {
            return false;
          }
        },
        { message: "pattern must be a valid regular expression" }
      )
      .optional(),
    required: z.boolean().default(true),
    type: FieldTypeSchema,
  })
  .refine(
    (field) => {
      if (field.type === "enum") {
        return Array.isArray(field.options) && field.options.length > 0;
      }
      return field.options === undefined;
    },
    { message: "options is required for enum fields and forbidden otherwise" }
  );

export const FieldSchemaSchema = z
  .object({
    fields: z.array(FieldDefinitionSchema).min(1).max(100),
  })
  .refine(
    (data) => {
      const keys = data.fields.map((f) => f.key);
      return new Set(keys).size === keys.length;
    },
    { message: "Field keys must be unique within a template version" }
  );

export const LayoutSchema = z
  .string()
  .min(1)
  .max(500 * 1024)
  .refine((value) => value.trimStart().startsWith("<svg"), {
    message: "Layout must be an SVG document",
  });

export const OrganizationParamsSchema = z.object({
  organizationId: z.string().min(1),
});

export const TemplateIdParamsSchema = OrganizationParamsSchema.extend({
  templateId: z.string().min(1),
});

export const TemplateVersionParamsSchema = TemplateIdParamsSchema.extend({
  versionId: z.string().min(1),
});

export const TemplateListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const TemplateCreateSchema = z.object({
  description: z.string().trim().max(2000).nullable().optional(),
  fieldSchema: FieldSchemaSchema.optional(),
  layout: LayoutSchema,
  name: templateName,
});

export const TemplateUpdateSchema = z
  .object({
    description: z.string().trim().max(2000).nullable().optional(),
    name: templateName.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const TemplateVersionCreateSchema = z.object({
  fieldSchema: FieldSchemaSchema.optional(),
  layout: LayoutSchema,
});

export const TemplateVersionUpdateSchema = z
  .object({
    fieldSchema: FieldSchemaSchema.optional(),
    layout: LayoutSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const TemplatePreviewSchema = z.object({
  data: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.null()])
  ),
});

export const TemplatePreviewResponseSchema = z.object({
  svg: z.string(),
});

export const TemplateListResponseSchema = z.object({
  data: z.array(TemplateSelectSchema),
  meta: z.object({
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
  }),
});

export const TemplateDetailsResponseSchema = TemplateSelectSchema.extend({
  versions: z.array(TemplateVersionSelectSchema),
});

export const TemplateVersionsResponseSchema = z.array(
  TemplateVersionSelectSchema
);

export const TemplateVersionStatusSchema = z.enum(
  templateVersionStatus.enumValues
);

export type FieldDefinitionType = z.infer<typeof FieldDefinitionSchema>;
export type FieldSchemaType = z.infer<typeof FieldSchemaSchema>;
export type FieldTypeType = z.infer<typeof FieldTypeSchema>;

export type TemplateCreateType = z.infer<typeof TemplateCreateSchema>;
export type TemplateUpdateType = z.infer<typeof TemplateUpdateSchema>;
export type TemplateVersionCreateType = z.infer<
  typeof TemplateVersionCreateSchema
>;
export type TemplateVersionUpdateType = z.infer<
  typeof TemplateVersionUpdateSchema
>;
export type TemplatePreviewType = z.infer<typeof TemplatePreviewSchema>;

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;

export type TemplateVersion = typeof templateVersions.$inferSelect;
export type NewTemplateVersion = typeof templateVersions.$inferInsert;
