import { Elysia, t } from "elysia";

import { ErrorResponse } from "../../shared/models";
import { authPlugin, permissionPlugin } from "../../shared/plugins";
import {
  AssetIdParamsSchema,
  AssetListResponseSchema,
  OrganizationParamsSchema,
} from "./asset.model";
import { AssetService } from "./asset.service";

export const assetController = new Elysia({
  prefix: "/organizations/:organizationId/assets",
})
  .use(authPlugin)
  .use(permissionPlugin)

  .post(
    "/",
    async ({ params, body, user }) => {
      const { file } = body;

      if (!(file instanceof File)) {
        throw new Error("file field is required");
      }

      const bytes = new Uint8Array(await file.arrayBuffer());

      return AssetService.upload({
        bytes,
        filename: file.name || "upload",
        organizationId: params.organizationId,
        userId: user.id,
      });
    },
    {
      auth: true,
      body: t.Object({
        file: t.File({ maxSize: "2m" }),
      }),
      detail: {
        description:
          "Uploads an image asset (PNG, JPEG, or WebP, up to 2 MB). The MIME type is verified from magic bytes, not the Content-Type header.",
        summary: "Upload an asset",
        tags: ["Assets"],
      },
      params: OrganizationParamsSchema,
      permission: { asset: ["create"] },
      response: {
        401: ErrorResponse,
        403: ErrorResponse,
        409: ErrorResponse,
        422: ErrorResponse,
      },
    }
  )

  .get("/", ({ params }) => AssetService.list(params.organizationId), {
    auth: true,
    detail: {
      description:
        "Lists asset metadata for the organization with short-lived signed download URLs.",
      summary: "List assets",
      tags: ["Assets"],
    },
    params: OrganizationParamsSchema,
    permission: { asset: ["read"] },
    response: {
      200: AssetListResponseSchema,
      401: ErrorResponse,
      403: ErrorResponse,
    },
  })

  .delete(
    "/:assetId",
    ({ params }) => AssetService.remove(params.organizationId, params.assetId),
    {
      auth: true,
      detail: {
        description:
          "Deletes an asset. Returns 409 when any template version in the organization references it as asset:<id>.",
        summary: "Delete an asset",
        tags: ["Assets"],
      },
      params: AssetIdParamsSchema,
      permission: { asset: ["delete"] },
      response: {
        401: ErrorResponse,
        403: ErrorResponse,
        404: ErrorResponse,
        409: ErrorResponse,
      },
    }
  );
