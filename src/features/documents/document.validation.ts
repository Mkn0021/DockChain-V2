import { z } from "zod";

import type { FieldSchemaJson } from "../templates/template.types";

import { AppError } from "../../shared/errors";

type FieldValue = string | number | boolean | null;

const validateWithSchema = (
  schema: z.ZodType,
  value: unknown,
  name: string
): void => {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw AppError.validation(
      result.error.issues[0]?.message ?? `Field "${name}" is invalid`
    );
  }
};

const validateField = (
  definition: FieldSchemaJson["fields"][number],
  value: FieldValue | undefined
): void => {
  const { key, label, type, required } = definition;
  const name = label || key;

  if (value === undefined || value === null || value === "") {
    if (required) {
      throw AppError.validation(`Field "${name}" is required`);
    }
    return;
  }

  const stringSchema = z
    .string()
    .max(
      definition.maxLength ?? Number.MAX_SAFE_INTEGER,
      `Field "${name}" exceeds maxLength (${definition.maxLength})`
    );

  switch (type) {
    case "text": {
      const schema =
        definition.pattern === undefined
          ? stringSchema
          : stringSchema.regex(
              new RegExp(definition.pattern),
              `Field "${name}" does not match the required pattern`
            );

      validateWithSchema(schema, value, name);
      break;
    }

    case "date": {
      validateWithSchema(
        stringSchema.refine((v) => !Number.isNaN(Date.parse(v)), {
          message: `Field "${name}" must be a valid date string`,
        }),
        value,
        name
      );
      break;
    }

    case "email": {
      validateWithSchema(
        z.email(`Field "${name}" must be a valid email`),
        value,
        name
      );
      break;
    }

    case "enum": {
      const options = definition.options ?? [];

      if (options.length === 0) {
        throw AppError.validation(
          `Field "${name}" has no allowed enum options`
        );
      }

      validateWithSchema(z.enum(options as [string, ...string[]]), value, name);
      break;
    }

    case "number": {
      validateWithSchema(
        z.number({
          message: `Field "${name}" must be a number`,
        }),
        value,
        name
      );
      break;
    }

    default: {
      throw AppError.validation(`Unsupported field type "${type}"`);
    }
  }
};

export const validateFieldsAgainstSchema = (
  fields: Record<string, FieldValue>,
  schema: FieldSchemaJson
): void => {
  const declared = new Set(schema.fields.map((f) => f.key));

  for (const key of Object.keys(fields)) {
    if (!declared.has(key)) {
      throw AppError.validation(
        `Unknown field "${key}" not defined in the template`
      );
    }
  }

  for (const definition of schema.fields) {
    validateField(definition, fields[definition.key]);
  }
};

export const normalizeFields = (
  fields: Record<string, FieldValue>,
  schema: FieldSchemaJson
): Record<string, FieldValue> => {
  const out: Record<string, FieldValue> = {};

  for (const definition of schema.fields) {
    const value = fields[definition.key];
    out[definition.key] =
      value === undefined || value === null || value === "" ? null : value;
  }

  return out;
};
