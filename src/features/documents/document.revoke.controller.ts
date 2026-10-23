import { Elysia } from "elysia";

import { ErrorResponse } from "../../shared/models";
import { authPlugin, permissionPlugin } from "../../shared/plugins";
import { DocumentIdParamsSchema } from "./document.model";
import {
  RevokePrepareResponseSchema,
  RevokePrepareSchema,
  RevokeSubmitResponseSchema,
  RevokeSubmitSchema,
} from "./document.revoke.model";
import { DocumentRevokeService } from "./document.revoke.service";

export const documentRevokeController = new Elysia({
  prefix: "/organizations/:organizationId/documents",
})
  .use(authPlugin)
  .use(permissionPlugin)

  .post(
    "/:documentId/revoke/prepare",
    ({ params, body }) =>
      DocumentRevokeService.prepare(
        params.organizationId,
        params.documentId,
        body
      ),
    {
      auth: true,
      body: RevokePrepareSchema,
      detail: {
        description:
          "Builds the revocation payload. In direct mode, returns calldata for the issuer's wallet to sign. In signature mode, returns the EIP-712 typed data to sign.",
        summary: "Prepare a document revocation",
        tags: ["Documents", "Revocation"],
      },
      params: DocumentIdParamsSchema,
      permission: { document: ["revoke"] },
      response: {
        200: RevokePrepareResponseSchema,
        404: ErrorResponse,
        409: ErrorResponse,
        422: ErrorResponse,
      },
    }
  )

  .post(
    "/:documentId/revoke",
    ({ params, body }) =>
      DocumentRevokeService.submit(
        params.organizationId,
        params.documentId,
        body
      ),
    {
      auth: true,
      body: RevokeSubmitSchema,
      detail: {
        description:
          "Submits a prepared revocation. With `txHash`, verifies the direct transaction on-chain. With `signature`, verifies and enqueues a relay job.",
        summary: "Submit a document revocation",
        tags: ["Documents", "Revocation"],
      },
      params: DocumentIdParamsSchema,
      permission: { document: ["revoke"] },
      response: {
        200: RevokeSubmitResponseSchema,
        404: ErrorResponse,
        409: ErrorResponse,
        422: ErrorResponse,
      },
    }
  );
