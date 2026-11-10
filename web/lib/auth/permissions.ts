export const ORG_ROLES = ["owner", "admin", "issuer", "viewer"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export type Resource =
  | "ac"
  | "apiKey"
  | "asset"
  | "auditLog"
  | "batch"
  | "document"
  | "invitation"
  | "member"
  | "organization"
  | "settings"
  | "team"
  | "template"
  | "wallet"
  | "webhook";

export type Action =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "manage"
  | "seal"
  | "sign"
  | "cancel"
  | "publish"
  | "revoke";

type ActionSet = Partial<Record<Resource, readonly Action[]>>;

const OWNER: ActionSet = {
  ac: ["create", "read", "update", "delete"],
  apiKey: ["read", "manage"],
  asset: ["create", "read", "delete"],
  auditLog: ["read"],
  batch: ["read", "seal", "sign", "cancel"],
  document: ["create", "read", "revoke"],
  invitation: ["create", "cancel"],
  member: ["create", "update", "delete"],
  organization: ["update", "delete"],
  settings: ["read", "update"],
  team: ["create", "update", "delete"],
  template: ["create", "read", "update", "publish", "delete"],
  wallet: ["create", "read", "update", "delete"],
  webhook: ["read", "manage"],
};

const ADMIN: ActionSet = {
  ...OWNER,
  organization: ["update"],
};

const ISSUER: ActionSet = {
  ac: ["read"],
  asset: ["create", "read", "delete"],
  batch: ["read", "seal", "sign", "cancel"],
  document: ["create", "read", "revoke"],
  invitation: [],
  member: [],
  organization: [],
  settings: ["read"],
  team: [],
  template: ["create", "read", "update", "publish"],
  wallet: ["read"],
  webhook: ["read"],
};

const VIEWER: ActionSet = {
  ac: ["read"],
  asset: ["read"],
  batch: ["read"],
  document: ["read"],
  invitation: [],
  member: [],
  organization: [],
  settings: ["read"],
  team: [],
  template: ["read"],
  wallet: ["read"],
  webhook: ["read"],
};

const ROLE_MAP: Record<OrgRole, ActionSet> = {
  owner: OWNER,
  admin: ADMIN,
  issuer: ISSUER,
  viewer: VIEWER,
};

export function isOrgRole(value: string | null | undefined): value is OrgRole {
  return (
    value !== null &&
    value !== undefined &&
    (ORG_ROLES as readonly string[]).includes(value)
  );
}

export function can(
  role: string | null | undefined,
  resource: Resource,
  action: Action
): boolean {
  if (!isOrgRole(role)) {
    return false;
  }
  const actions = ROLE_MAP[role][resource];
  return Boolean(actions?.includes(action));
}
