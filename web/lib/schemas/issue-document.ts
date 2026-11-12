import { z } from "zod";

import type { DocumentFieldDef } from "@/lib/schemas/parse-field";

export function buildIssueDocumentSchema(fields: DocumentFieldDef[]) {
  const shape: Record<string, z.ZodType<string, string>> = {};

  for (const field of fields) {
    let base: z.ZodType<string, string>;

    if (field.type === "number") {
      base = z
        .string()
        .refine(
          (v) => v === "" || !Number.isNaN(Number(v)),
          "Must be a number"
        );
    } else if (field.type === "email") {
      base = z.string().email("Enter a valid email");
    } else if (field.type === "date") {
      base = z
        .string()
        .refine(
          (v) => v === "" || !Number.isNaN(Date.parse(v)),
          "Invalid date"
        );
    } else if (field.type === "enum") {
      const options = (field.options ?? []) as [string, ...string[]];
      base =
        options.length > 0
          ? z.enum(options, { message: "Select an option" })
          : z.string();
    } else {
      base = z.string();
    }

    if (field.required) {
      base = base.refine(
        (v) => v !== undefined && v !== null && String(v).trim().length > 0,
        "Required"
      );
    }

    const { maxLength } = field;
    if (maxLength && field.type !== "enum") {
      base = base.refine(
        (v) => typeof v !== "string" || v.length <= maxLength,
        `Max ${maxLength} characters`
      );
    }

    const { pattern } = field;
    if (pattern && field.type !== "enum") {
      base = base.refine(
        (v) => typeof v !== "string" || v === "" || new RegExp(pattern).test(v),
        "Invalid format"
      );
    }

    shape[field.key] = base;
  }

  return z.object(shape);
}

export type IssueDocumentFormValues = Record<string, string>;
