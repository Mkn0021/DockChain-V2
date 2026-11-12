import { templateFieldSchemaObject } from "@/lib/schemas/template";

export interface DocumentFieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "email" | "enum";
  required: boolean;
  maxLength?: number;
  options?: string[];
  pattern?: string;
}

export type DocumentFieldValues = Record<
  string,
  string | number | boolean | null
>;

export function parseFieldSchema(raw: unknown): DocumentFieldDef[] {
  const result = templateFieldSchemaObject.safeParse(raw);
  if (!result.success) {
    return [];
  }
  return result.data.fields.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required ?? false,
    maxLength: field.maxLength,
    options: field.options,
    pattern: field.pattern,
  }));
}

export function inputTypeForField(
  field: DocumentFieldDef
): "text" | "number" | "date" | "email" {
  if (field.type === "date") {
    return "date";
  }
  if (field.type === "email") {
    return "email";
  }
  if (field.type === "number") {
    return "number";
  }
  return "text";
}
