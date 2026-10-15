import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

const statement = {
  ...defaultStatements,

  asset: ["create", "read", "delete"],
  document: ["create", "read", "revoke"],
  settings: ["read", "update"],
  template: ["create", "read", "update", "publish", "delete"],
  wallet: ["create", "read", "delete"],
} as const;

const ac = createAccessControl(statement);

const owner = ac.newRole({
  ac: ["create", "read", "update", "delete"],
  asset: ["create", "read", "delete"],
  document: ["create", "read", "revoke"],
  invitation: ["create", "cancel"],
  member: ["create", "update", "delete"],
  organization: ["update", "delete"],
  settings: ["read", "update"],
  team: ["create", "update", "delete"],
  template: ["create", "read", "update", "publish", "delete"],
  wallet: ["create", "read", "delete"],
});

const admin = ac.newRole({
  ac: ["create", "read", "update", "delete"],
  asset: ["create", "read", "delete"],
  document: ["create", "read", "revoke"],
  invitation: ["create", "cancel"],
  member: ["create", "update", "delete"],
  organization: ["update"],
  settings: ["read", "update"],
  team: ["create", "update", "delete"],
  template: ["create", "read", "update", "publish", "delete"],
  wallet: ["create", "read", "delete"],
});

const issuer = ac.newRole({
  ac: ["read"],
  asset: ["create", "read", "delete"],
  document: ["create", "read", "revoke"],
  invitation: [],
  member: [],
  organization: [],
  settings: ["read"],
  team: [],
  template: ["create", "read", "update", "publish"],
  wallet: ["read"],
});

const viewer = ac.newRole({
  ac: ["read"],
  asset: ["read"],
  document: ["read"],
  invitation: [],
  member: [],
  organization: [],
  settings: ["read"],
  team: [],
  template: ["read"],
  wallet: ["read"],
});

export const organizationAccessControl = ac;

export const organizationRoles = {
  admin,
  issuer,
  owner,
  viewer,
};
