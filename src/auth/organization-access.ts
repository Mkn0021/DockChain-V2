import { defaultKeyHasher } from "better-auth/plugins";
import { eq } from "drizzle-orm";

import { apikeys, db } from "../db";
import { parseApiKeyMetadata } from "../features/apikeys/apikey.metadata";
import { auth } from "./index";

export type OrganizationPermissions = Partial<{
  ac: ("create" | "read" | "update" | "delete")[];
  apiKey: ("read" | "manage")[];
  asset: ("create" | "read" | "delete")[];
  auditLog: "read"[];
  batch: ("read" | "seal" | "sign" | "cancel")[];
  document: ("create" | "read" | "revoke")[];
  invitation: ("create" | "cancel")[];
  member: ("create" | "update" | "delete")[];
  organization: ("update" | "delete")[];
  settings: ("read" | "update")[];
  team: ("create" | "update" | "delete")[];
  template: ("create" | "read" | "update" | "publish" | "delete")[];
  wallet: ("create" | "read" | "update" | "delete")[];
  webhook: ("read" | "manage")[];
}>;

const resolveApiKeyContext = async (rawKey: string) => {
  const hashed = await defaultKeyHasher(rawKey);

  const [key] = await db
    .select()
    .from(apikeys)
    .where(eq(apikeys.key, hashed))
    .limit(1);

  if (!key) {
    return { enabled: false, metadata: null };
  }
  if (key.enabled === false) {
    return { enabled: false, metadata: null };
  }
  if (key.expiresAt && key.expiresAt < new Date()) {
    return { enabled: false, metadata: null };
  }

  return { enabled: true, metadata: parseApiKeyMetadata(key.metadata) };
};

export const hasOrganizationPermission = async (
  headers: Headers,
  organizationId: string,
  permissions: OrganizationPermissions
): Promise<boolean> => {
  const apiKeyHeader = headers.get("x-api-key");
  if (apiKeyHeader) {
    const { enabled, metadata } = await resolveApiKeyContext(apiKeyHeader);
    if (!enabled || !metadata) {
      return false;
    }
    if (metadata.organizationId !== organizationId) {
      return false;
    }
    return matchesPermissions(
      metadata.permissions as OrganizationPermissions,
      permissions
    );
  }

  try {
    const result = await auth.api.hasPermission({
      body: { organizationId, permissions },
      headers,
    });
    return result.success;
  } catch {
    return false;
  }
};

const matchesPermissions = (
  granted: OrganizationPermissions,
  required: OrganizationPermissions
): boolean => {
  for (const [resource, actions] of Object.entries(required)) {
    const grantedActions = granted[resource as keyof OrganizationPermissions];
    if (!grantedActions) {
      return false;
    }
    for (const action of actions ?? []) {
      if (!grantedActions.includes(action as never)) {
        return false;
      }
    }
  }
  return true;
};

export const isOrganizationMember = async (
  headers: Headers,
  organizationId: string
): Promise<boolean> => {
  const apiKeyHeader = headers.get("x-api-key");
  if (apiKeyHeader) {
    const { enabled, metadata } = await resolveApiKeyContext(apiKeyHeader);
    if (!enabled || !metadata) {
      return false;
    }
    return metadata.organizationId === organizationId;
  }

  try {
    const result = await auth.api.getFullOrganization({
      headers,
      query: { organizationId },
    });
    return Boolean(result);
  } catch {
    return false;
  }
};
