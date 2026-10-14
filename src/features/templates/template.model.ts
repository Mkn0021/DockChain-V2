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

const contractName = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/);

const compilerVersion = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, "Use a compiler version such as 0.8.24");

const sourceCode = z.string().min(1).max(200_000);

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
  compilerVersion,
  contractName,

  description: z.string().trim().max(2000).nullable().optional(),
  name: templateName,
  sourceCode,
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
  compilerVersion,
  contractName,
  sourceCode,
});

export const TemplateVersionUpdateSchema = z
  .object({
    compilerVersion: compilerVersion.optional(),
    contractName: contractName.optional(),
    sourceCode: sourceCode.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
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

export type TemplateCreateType = z.infer<typeof TemplateCreateSchema>;
export type TemplateUpdateType = z.infer<typeof TemplateUpdateSchema>;
export type TemplateVersionCreateType = z.infer<
  typeof TemplateVersionCreateSchema
>;
export type TemplateVersionUpdateType = z.infer<
  typeof TemplateVersionUpdateSchema
>;

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;

export type TemplateVersion = typeof templateVersions.$inferSelect;
export type NewTemplateVersion = typeof templateVersions.$inferInsert;
