import { Elysia } from "elysia";

import {
  hasOrganizationPermission,
  type OrganizationPermissions,
} from "../../auth/organization-access";

export const permissionPlugin = new Elysia({
  name: "plugin.permission",
}).macro({
  permission: (permissions: OrganizationPermissions) => ({
    async resolve({ request, params, status }) {
      const { organizationId } = params as { organizationId?: string };

      if (!organizationId) {
        return status(400, { message: "organizationId is required" });
      }

      const allowed = await hasOrganizationPermission(
        request.headers,
        organizationId,
        permissions
      );

      if (!allowed) {
        return status(403, { message: "Forbidden" });
      }

      return { organizationId };
    },
  }),
});
