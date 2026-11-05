import { z } from "zod";

export const generalFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(64, "Name must be 64 characters or fewer."),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters.")
    .max(48, "Slug must be 48 characters or fewer.")
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*-?$/,
      "Use lowercase letters, numbers, and single hyphens only."
    )
    .refine((val) => !val.endsWith("-"), "Slug cannot end with a hyphen."),
});

export type GeneralFormValues = z.infer<typeof generalFormSchema>;
