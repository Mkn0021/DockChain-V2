import { Elysia } from "elysia";

import { ErrorResponse } from "../../shared/models";
import { authPlugin, permissionPlugin } from "../../shared/plugins";
import {
  OrganizationParamsSchema,
  SettingsSelectSchema,
  SettingsUpdateSchema,
} from "./settings.model";
import { SettingsService } from "./settings.service";

export const settingsController = new Elysia({
  prefix: "/organizations/:organizationId/settings",
})
  .use(authPlugin)
  .use(permissionPlugin)

  .get("/", ({ params }) => SettingsService.get(params.organizationId), {
    auth: true,
    detail: { summary: "Get organization settings", tags: ["Settings"] },
    params: OrganizationParamsSchema,
    permission: { settings: ["read"] },
    response: {
      200: SettingsSelectSchema,
      401: ErrorResponse,
      403: ErrorResponse,
    },
  })

  .patch(
    "/",
    ({ body, params }) => SettingsService.update(params.organizationId, body),
    {
      auth: true,
      body: SettingsUpdateSchema,
      detail: { summary: "Update organization settings", tags: ["Settings"] },
      params: OrganizationParamsSchema,
      permission: { settings: ["update"] },
      response: {
        200: SettingsSelectSchema,
        401: ErrorResponse,
        403: ErrorResponse,
        422: ErrorResponse,
      },
    }
  );
