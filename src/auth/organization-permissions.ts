import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

const statement = {
  ...defaultStatements,

  asset: ["create", "read", "delete"],
  document: ["create", "read", "revoke"],
  template: ["create", "read", "update", "publish", "delete"],
} as const;

const ac = createAccessControl(statement);

const owner = ac.newRole({
  ac: ["create", "read", "update", "delete"],
  asset: ["create", "read", "delete"],
  document: ["create", "read", "revoke"],
  invitation: ["create", "cancel"],
  member: ["create", "update", "delete"],

  organization: ["update", "delete"],
  team: ["create", "update", "delete"],
  template: ["create", "read", "update", "publish", "delete"],
});

const admin = ac.newRole({
  ac: ["create", "read", "update", "delete"],
  asset: ["create", "read", "delete"],
  document: ["create", "read", "revoke"],
  invitation: ["create", "cancel"],
  member: ["create", "update", "delete"],

  organization: ["update"],
  team: ["create", "update", "delete"],
  template: ["create", "read", "update", "publish", "delete"],
});

const issuer = ac.newRole({
  ac: ["read"],
  asset: ["create", "read", "delete"],
  document: ["create", "read", "revoke"],
  invitation: [],
  member: [],

  organization: [],
  team: [],
  template: ["create", "read", "update", "publish"],
});

const viewer = ac.newRole({
  ac: ["read"],
  asset: ["read"],
  document: ["read"],
  invitation: [],
  member: [],

  organization: [],
  team: [],
  template: ["read"],
});

export const organizationAccessControl = ac;

export const organizationRoles = {
  admin,
  issuer,
  owner,
  viewer,
};
