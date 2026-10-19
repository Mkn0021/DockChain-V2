export interface ApiKeyMetadata {
  organizationId: string;
  permissions: Record<string, string[]>;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");

const parseJson = (value: string | null): unknown => {
  if (value === null) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const parsePermissions = (value: unknown): Record<string, string[]> => {
  if (!isObject(value)) {
    return {};
  }
  const out: Record<string, string[]> = {};
  for (const [key, item] of Object.entries(value)) {
    if (isStringArray(item)) {
      out[key] = item;
    }
  }
  return out;
};

export const parseApiKeyMetadata = (
  raw: string | null
): ApiKeyMetadata | null => {
  const parsed = parseJson(raw);
  if (!isObject(parsed)) {
    return null;
  }

  const { organizationId } = parsed;
  if (typeof organizationId !== "string" || organizationId.length === 0) {
    return null;
  }

  return {
    organizationId,
    permissions: parsePermissions(parsed.permissions),
  };
};

export const serializeApiKeyMetadata = (
  metadata: ApiKeyMetadata
): Record<string, unknown> => ({
  organizationId: metadata.organizationId,
  permissions: metadata.permissions,
});
