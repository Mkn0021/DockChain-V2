import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

const statement = {
  ...defaultStatements,

  apiKey: ["read", "manage"],
  asset: ["create", "read", "delete"],
  batch: ["read", "seal", "sign", "cancel"],
  document: ["create", "read", "revoke"],
  settings: ["read", "update"],
  template: ["create", "read", "update", "publish", "delete"],
  wallet: ["create", "read", "update", "delete"],
  webhook: ["read", "manage"],
} as const;

const ac = createAccessControl(statement);

const owner = ac.newRole({
  ac: ["create", "read", "update", "delete"],
  apiKey: ["read", "manage"],
  asset: ["create", "read", "delete"],
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
});

const admin = ac.newRole({
  ac: ["create", "read", "update", "delete"],
  apiKey: ["read", "manage"],
  asset: ["create", "read", "delete"],
  batch: ["read", "seal", "sign", "cancel"],
  document: ["create", "read", "revoke"],
  invitation: ["create", "cancel"],
  member: ["create", "update", "delete"],
  organization: ["update"],
  settings: ["read", "update"],
  team: ["create", "update", "delete"],
  template: ["create", "read", "update", "publish", "delete"],
  wallet: ["create", "read", "update", "delete"],
  webhook: ["read", "manage"],
});

const issuer = ac.newRole({
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
});

const viewer = ac.newRole({
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
});

export const organizationAccessControl = ac;

export const organizationRoles = {
  admin,
  issuer,
  owner,
  viewer,
};
