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
  DocumentImportSchema,
  type DocumentImportType,
  DocumentListQuerySchema,
  DocumentListResponseSchema,
  DocumentSelectSchema,
  DocumentUpdateSchema,
  OrganizationParamsSchema,
  ProofBundleSchema,
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
  )

  .get(
    "/:documentId/bundle",
    ({ params }) =>
      DocumentService.getBundle(params.organizationId, params.documentId),
    {
      auth: true,
      detail: {
        description:
          "Returns the proof bundle: leaf, Merkle proof, holder key, salt, fields, and the on-chain metadata needed to verify the document independently.",
        summary: "Get a document's proof bundle",
        tags: ["Documents"],
      },
      params: DocumentIdParamsSchema,
      permission: { document: ["read"] },
      response: {
        200: ProofBundleSchema,
        404: ErrorResponse,
        409: ErrorResponse,
      },
    }
  )

  .post(
    "/import",
    async ({ params, body, user }) => {
      const form = body as DocumentImportType;
      const text = await form.file.text();

      return DocumentService.importCsv(params.organizationId, user.id, {
        csv: text,
        issuerWalletId: form.issuerWalletId,
        templateVersionId: form.templateVersionId,
      });
    },
    {
      auth: true,
      body: DocumentImportSchema,
      detail: {
        description:
          "Accepts a multipart CSV with a header row matching the template field keys. Optional columns: recipient_name, recipient_email, expires_at, external_ref.",
        summary: "Import documents from CSV",
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
  );
