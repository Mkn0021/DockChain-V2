import { Elysia } from "elysia";

import { ErrorResponse } from "../../shared/models";
import {
  authPlugin,
  idempotencyPlugin,
  permissionPlugin,
} from "../../shared/plugins";
import {
  DocumentBulkCreateSchema,
  DocumentBulkResponseSchema,
  DocumentCreateSchema,
  DocumentDetailResponseSchema,
  DocumentIdParamsSchema,
  DocumentListQuerySchema,
  DocumentListResponseSchema,
  DocumentSelectSchema,
  DocumentUpdateSchema,
  OrganizationParamsSchema,
} from "./document.model";
import { DocumentService } from "./document.service";

export const documentController = new Elysia({
  prefix: "/organizations/:organizationId/documents",
})
  .use(authPlugin)
  .use(permissionPlugin)
  .use(idempotencyPlugin)

  .post(
    "/",
    ({ params, body, user }) =>
      DocumentService.create(params.organizationId, user.id, body),
    {
      auth: true,
      body: DocumentCreateSchema,
      detail: {
        description:
          "Creates a document. In ready mode, generates the salt, holder key, leaf, and encrypted payload. In draft mode, stores the encrypted fields without a leaf.",
        summary: "Create a document",
        tags: ["Documents"],
      },
      params: OrganizationParamsSchema,
      permission: { document: ["create"] },
      response: {
        200: DocumentSelectSchema,
        401: ErrorResponse,
        403: ErrorResponse,
        409: ErrorResponse,
        422: ErrorResponse,
      },
    }
  )

  .post(
    "/bulk",
    ({ params, body, user }) =>
      DocumentService.bulkCreate(params.organizationId, user.id, body),
    {
      auth: true,
      body: DocumentBulkCreateSchema,
      detail: {
        description: "Creates up to 500 documents atomically.",
        summary: "Bulk create documents",
        tags: ["Documents"],
      },
      params: OrganizationParamsSchema,
      permission: { document: ["create"] },
      response: {
        200: DocumentBulkResponseSchema,
        401: ErrorResponse,
        403: ErrorResponse,
        422: ErrorResponse,
      },
    }
  )

  .get(
    "/",
    ({ params, query }) =>
      DocumentService.list(params.organizationId, {
        batchId: query.batchId,
        createdFrom: query.createdFrom
          ? new Date(query.createdFrom)
          : undefined,
        createdTo: query.createdTo ? new Date(query.createdTo) : undefined,
        externalRef: query.externalRef,
        issuerWalletId: query.issuerWalletId,
        limit: query.limit,
        offset: query.offset,
        status: query.status,
        templateVersionId: query.templateVersionId,
      }),
    {
      auth: true,
      detail: { summary: "List documents", tags: ["Documents"] },
      params: OrganizationParamsSchema,
      permission: { document: ["read"] },
      query: DocumentListQuerySchema,
      response: {
        200: DocumentListResponseSchema,
        401: ErrorResponse,
        403: ErrorResponse,
      },
    }
  )

  .get(
    "/:documentId",
    ({ params }) =>
      DocumentService.getById(params.organizationId, params.documentId),
    {
      auth: true,
      detail: {
        description:
          "Returns decrypted fields and recipient, never salt or holder key.",
        summary: "Get a document",
        tags: ["Documents"],
      },
      params: DocumentIdParamsSchema,
      permission: { document: ["read"] },
      response: {
        200: DocumentDetailResponseSchema,
        404: ErrorResponse,
      },
    }
  )

  .patch(
    "/:documentId",
    ({ params, body }) =>
      DocumentService.update(params.organizationId, params.documentId, body),
    {
      auth: true,
      body: DocumentUpdateSchema,
      detail: {
        description:
          "Allowed only while the document is a draft. Use finalize to promote to ready.",
        summary: "Update a draft document",
        tags: ["Documents"],
      },
      params: DocumentIdParamsSchema,
      permission: { document: ["create"] },
      response: {
        200: DocumentSelectSchema,
        404: ErrorResponse,
        409: ErrorResponse,
        422: ErrorResponse,
      },
    }
  )

  .delete(
    "/:documentId",
    ({ params }) =>
      DocumentService.delete(params.organizationId, params.documentId),
    {
      auth: true,
      detail: {
        description:
          "Deletes a draft or ready document. Refuses once the status is batched or later.",
        summary: "Delete a document",
        tags: ["Documents"],
      },
      params: DocumentIdParamsSchema,
      permission: { document: ["create"] },
      response: {
        200: DocumentSelectSchema,
        404: ErrorResponse,
        409: ErrorResponse,
      },
    }
  );
