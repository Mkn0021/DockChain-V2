import { z } from "zod";

export const FIELD_TYPES = ["text", "number", "date", "email", "enum"] as const;

export const templateFieldSchema = z.object({
  key: z
    .string()
    .min(1, "Key is required.")
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Lowercase letters, digits, underscores; must start with a letter."
    ),
  label: z.string().min(1, "Label is required."),
  type: z.enum(FIELD_TYPES),
  required: z.boolean().optional(),
  maxLength: z.number().int().positive().optional(),
  options: z.array(z.string().min(1)).optional(),
  pattern: z.string().optional(),
});

export const templateFieldSchemaObject = z.object({
  fields: z.array(templateFieldSchema).min(1, "Add at least one field."),
});

export const newTemplateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  description: z.string().trim().max(280).optional().or(z.literal("")),
  layout: z.string().min(1, "Upload an SVG template."),
  fieldSchema: templateFieldSchemaObject,
});

export type NewTemplateValues = z.infer<typeof newTemplateSchema>;
export type TemplateField = z.infer<typeof templateFieldSchema>;
