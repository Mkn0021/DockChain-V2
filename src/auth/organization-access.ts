import { auth } from "./index";

export type OrganizationPermissions = Partial<{
  organization: ("update" | "delete")[];
  member: ("create" | "update" | "delete")[];
  invitation: ("create" | "cancel")[];
  team: ("create" | "update" | "delete")[];
  ac: ("create" | "read" | "update" | "delete")[];
  asset: ("create" | "read" | "delete")[];
  batch: ("read" | "seal" | "sign" | "cancel")[];
  document: ("create" | "read" | "revoke")[];
  settings: ("read" | "update")[];
  template: ("create" | "read" | "update" | "publish" | "delete")[];
  wallet: ("create" | "read" | "update" | "delete")[];
}>;

export const hasOrganizationPermission = async (
  headers: Headers,
  organizationId: string,
  permissions: OrganizationPermissions
): Promise<boolean> => {
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

export const isOrganizationMember = async (
  headers: Headers,
  organizationId: string
): Promise<boolean> => {
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
