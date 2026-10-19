import { Elysia } from "elysia";

import { ErrorResponse } from "../../shared/models";
import { authPlugin, permissionPlugin } from "../../shared/plugins";
import {
  AuditLogListQuerySchema,
  AuditLogListResponseSchema,
  OrganizationParamsSchema,
} from "./audit.model";
import { AuditService } from "./audit.service";

export const auditController = new Elysia({
  prefix: "/organizations/:organizationId/audit-logs",
})
  .use(authPlugin)
  .use(permissionPlugin)

  .get(
    "/",
    ({ params, query }) => AuditService.list(params.organizationId, query),
    {
      auth: true,
      detail: {
        summary: "List audit log entries",
        tags: ["Audit"],
      },
      params: OrganizationParamsSchema,
      permission: { auditLog: ["read"] },
      query: AuditLogListQuerySchema,
      response: {
        200: AuditLogListResponseSchema,
        401: ErrorResponse,
        403: ErrorResponse,
      },
    }
  );
