import { sanitize } from "isomorphic-dompurify";

import type { FieldSchemaType } from "./template.model";

import { AppError } from "../../shared/errors";
import { extractPlaceholders } from "./template.extract";

const ALLOWED_DATA_IMAGE_PREFIXES = [
  "data:image/png;base64,",
  "data:image/jpeg;base64,",
  "data:image/jpg;base64,",
  "data:image/webp;base64,",
];

const ASSET_REFERENCE = /^asset:[0-9a-f-]{36}$/i;

const isAllowedReference = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.startsWith("#")) {
    return true;
  }
  if (ASSET_REFERENCE.test(trimmed)) {
    return true;
  }
  return ALLOWED_DATA_IMAGE_PREFIXES.some((prefix) =>
    trimmed.toLowerCase().startsWith(prefix)
  );
};

const scanForbiddenReferences = (svg: string): string[] => {
  const offences: string[] = [];
  const attrRegex = /\s(href|xlink:href)\s*=\s*("([^"]*)"|'([^']*)')/gi;

  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(svg)) !== null) {
    const value = match[3] ?? match[4] ?? "";
    if (!isAllowedReference(value)) {
      offences.push(`${match[1]}="${value}"`);
    }
  }

  return offences;
};

const scanForbiddenElements = (svg: string): string[] => {
  const offences: string[] = [];
  for (const tag of ["script", "foreignObject"]) {
    const regex = new RegExp(`<${tag}[\\s>]`, "i");
    if (regex.test(svg)) {
      offences.push(`<${tag}>`);
    }
  }
  const eventHandlerRegex = /\son[a-z]+\s*=/i;
  if (eventHandlerRegex.test(svg)) {
    offences.push("event-handler attribute");
  }
  return offences;
};

export const sanitizeLayout = (svg: string): string => {
  const forbidden = [
    ...scanForbiddenElements(svg),
    ...scanForbiddenReferences(svg),
  ];

  if (forbidden.length > 0) {
    throw AppError.validation(
      `Layout contains forbidden content: ${forbidden.join(", ")}`
    );
  }

  const clean = sanitize(svg, {
    ADD_ATTR: ["target"],
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: [
      "onload",
      "onclick",
      "onerror",
      "onmouseover",
      "onfocus",
      "onblur",
      "onchange",
      "onsubmit",
    ],
    FORBID_TAGS: ["script", "foreignObject"],
    USE_PROFILES: { svg: true, svgFilters: true },
  });

  return clean;
};

export const collectAssetReferences = (svg: string): string[] => {
  const refs = new Set<string>();
  const regex = /asset:[0-9a-f-]{36}/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(svg)) !== null) {
    refs.add(match[0].slice("asset:".length).toLowerCase());
  }

  return [...refs];
};

export const validateLayoutAgainstSchema = (
  layout: string,
  fieldSchema: FieldSchemaType
): void => {
  const placeholders = extractPlaceholders(layout);
  const declared = new Set(fieldSchema.fields.map((f) => f.key));
  const declaredRequired = new Set(
    fieldSchema.fields.filter((f) => f.required).map((f) => f.key)
  );

  const unknownInLayout = placeholders.filter((p) => !declared.has(p));
  const missingRequired = [...declaredRequired].filter(
    (key) => !placeholders.includes(key)
  );

  const errors: string[] = [];
  if (unknownInLayout.length > 0) {
    errors.push(
      `Layout references fields not declared in the schema: ${unknownInLayout.join(", ")}`
    );
  }
  if (missingRequired.length > 0) {
    errors.push(
      `Required fields missing from the layout: ${missingRequired.join(", ")}`
    );
  }

  if (errors.length > 0) {
    throw AppError.validation(errors.join("; "));
  }
};

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export const renderLayout = (
  layout: string,
  values: Record<string, string | number | boolean | null>
): string =>
  layout.replaceAll(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, key: string) => {
    const normalized = key
      .trim()
      .toLowerCase()
      .replaceAll(/[\s-]+/g, "_");
    const value = values[normalized];
    if (value === undefined || value === null) {
      return "";
    }
    return escapeXml(String(value));
  });
