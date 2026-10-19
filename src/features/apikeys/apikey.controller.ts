import { Elysia } from "elysia";

import { ErrorResponse } from "../../shared/models";
import { authPlugin, permissionPlugin } from "../../shared/plugins";
import {
  ApiKeyCreateSchema,
  ApiKeyIdParamsSchema,
  ApiKeyListResponseSchema,
  ApiKeyResponseSchema,
  OrganizationParamsSchema,
} from "./apikey.model";
import { ApiKeyService } from "./apikey.service";

export const apiKeyController = new Elysia({
  prefix: "/organizations/:organizationId/api-keys",
})
  .use(authPlugin)
  .use(permissionPlugin)

  .post(
    "/",
    ({ params, body, user }) =>
      ApiKeyService.create(params.organizationId, user.id, body),
    {
      auth: true,
      body: ApiKeyCreateSchema,
      detail: {
        description:
          "Creates an API key scoped to the organization. The full key is returned only once.",
        summary: "Create an API key",
        tags: ["API Keys"],
      },
      params: OrganizationParamsSchema,
      permission: { apiKey: ["manage"] },
      response: {
        200: ApiKeyResponseSchema,
        401: ErrorResponse,
        403: ErrorResponse,
        422: ErrorResponse,
      },
    }
  )

  .get("/", ({ params }) => ApiKeyService.list(params.organizationId), {
    auth: true,
    detail: { summary: "List API keys", tags: ["API Keys"] },
    params: OrganizationParamsSchema,
    permission: { apiKey: ["read"] },
    response: {
      200: ApiKeyListResponseSchema,
      401: ErrorResponse,
      403: ErrorResponse,
    },
  })

  .delete(
    "/:keyId",
    ({ params, user }) =>
      ApiKeyService.delete(params.organizationId, params.keyId, user.id),
    {
      auth: true,
      detail: { summary: "Delete an API key", tags: ["API Keys"] },
      params: ApiKeyIdParamsSchema,
      permission: { apiKey: ["manage"] },
    }
  );
