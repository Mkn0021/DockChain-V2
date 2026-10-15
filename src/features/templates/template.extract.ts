import type { FieldDefinitionType, FieldTypeType } from "./template.model";

import { AppError } from "../../shared/errors";

const PLACEHOLDER_REGEX = /\{\{\s*([^{}]+?)\s*\}\}/g;

export const extractPlaceholders = (layout: string): string[] => {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  PLACEHOLDER_REGEX.lastIndex = 0;

  while ((match = PLACEHOLDER_REGEX.exec(layout)) !== null) {
    const [placeholder] = match;
    if (placeholder !== undefined) {
      found.add(placeholder);
    }
  }

  return [...found];
};

export const normalizeKey = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replaceAll(/[\s-]+/g, "_")
    .replaceAll(/[^a-z0-9_]/g, "")
    .replace(/^_+/, "")
    .replace(/_+$/, "");

const inferType = (key: string): FieldTypeType => {
  if (key === "date" || key.endsWith("_date")) {
    return "date";
  }
  if (key === "email" || key.endsWith("_email")) {
    return "email";
  }
  if (
    key === "amount" ||
    key === "count" ||
    key === "quantity" ||
    key.endsWith("_count")
  ) {
    return "number";
  }
  return "text";
};

const labelFromKey = (key: string): string =>
  key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const extractFields = (layout: string): FieldDefinitionType[] => {
  const raw = extractPlaceholders(layout);
  const normalized: FieldDefinitionType[] = [];
  const seen = new Map<string, string>();

  for (const placeholder of raw) {
    const key = normalizeKey(placeholder);

    if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) {
      throw AppError.validation(
        `Placeholder "${placeholder}" cannot be normalized to a valid field key`
      );
    }

    const previous = seen.get(key);
    if (previous !== undefined && previous !== placeholder) {
      throw AppError.validation(
        `Placeholder collision: "${placeholder}" and "${previous}" both normalize to "${key}"`
      );
    }
    if (seen.has(key)) {
      continue;
    }
    seen.set(key, placeholder);

    normalized.push({
      key,
      label: labelFromKey(key),
      required: true,
      type: inferType(key),
    });
  }

  return normalized;
};
