import { Elysia } from "elysia";

import { batchRelayQueue } from "../../queues";
import { AppError } from "../../shared/errors";
import { ErrorResponse } from "../../shared/models";
import { authPlugin, permissionPlugin } from "../../shared/plugins";
import {
  BatchIdParamsSchema,
  BatchListQuerySchema,
  BatchListResponseSchema,
  BatchSealSchema,
  BatchSelectSchema,
  BatchSignatureSchema,
  BatchTypedDataSchema,
  OrganizationParamsSchema,
} from "./batch.model";
import { BatchRepository } from "./batch.repository";
import { BatchService } from "./batch.service";
import { assertTransition } from "./batch.state";

export const batchController = new Elysia({
  prefix: "/organizations/:organizationId/batches",
})
  .use(authPlugin)
  .use(permissionPlugin)

  .post(
    "/seal",
    ({ params, body, user }) =>
      BatchService.sealNow(params.organizationId, body.issuerWalletId, user.id),
    {
      auth: true,
      body: BatchSealSchema,
      detail: {
        description:
          "Seals all ready documents for the given wallet into a new batch and uploads the encrypted package to S3. Returns 409 when there are no ready documents.",
        summary: "Seal a batch now",
        tags: ["Batches"],
      },
      params: OrganizationParamsSchema,
      permission: { batch: ["seal"] },
      response: {
        200: BatchSelectSchema,
        401: ErrorResponse,
        403: ErrorResponse,
        404: ErrorResponse,
        409: ErrorResponse,
        422: ErrorResponse,
      },
    }
  )

  .get(
    "/",
    ({ params, query }) =>
      BatchService.list(params.organizationId, {
        issuerWalletId: query.issuerWalletId,
        limit: query.limit,
        offset: query.offset,
        status: query.status,
      }),
    {
      auth: true,
      detail: { summary: "List batches", tags: ["Batches"] },
      params: OrganizationParamsSchema,
      permission: { batch: ["read"] },
      query: BatchListQuerySchema,
      response: {
        200: BatchListResponseSchema,
        401: ErrorResponse,
        403: ErrorResponse,
      },
    }
  )

  .get(
    "/:batchId",
    ({ params }) => BatchService.getById(params.organizationId, params.batchId),
    {
      auth: true,
      detail: { summary: "Get a batch", tags: ["Batches"] },
      params: BatchIdParamsSchema,
      permission: { batch: ["read"] },
      response: {
        200: BatchSelectSchema,
        404: ErrorResponse,
      },
    }
  )

  .get(
    "/:batchId/typed-data",
    ({ params }) =>
      BatchService.getTypedData(params.organizationId, params.batchId),
    {
      auth: true,
      detail: {
        description:
          "Returns the EIP-712 payload the issuer must sign to anchor this batch.",
        summary: "Get typed data for signing",
        tags: ["Batches"],
      },
      params: BatchIdParamsSchema,
      permission: { batch: ["read"] },
      response: {
        200: BatchTypedDataSchema,
        404: ErrorResponse,
        409: ErrorResponse,
      },
    }
  )

  .post(
    "/:batchId/signature",
    ({ params, body }) =>
      BatchService.submitSignature(
        params.organizationId,
        params.batchId,
        body.signature as `0x${string}`
      ),
    {
      auth: true,
      body: BatchSignatureSchema,
      detail: {
        description:
          "Stores the issuer's EIP-712 signature and transitions the batch to signed.",
        summary: "Submit the batch signature",
        tags: ["Batches"],
      },
      params: BatchIdParamsSchema,
      permission: { batch: ["sign"] },
      response: {
        200: BatchSelectSchema,
        404: ErrorResponse,
        409: ErrorResponse,
        422: ErrorResponse,
      },
    }
  )

  .post(
    "/:batchId/cancel",
    ({ params, user }) =>
      BatchService.cancel(params.organizationId, params.batchId, user.id),
    {
      auth: true,
      detail: {
        description:
          "Cancels an awaiting_signature batch and returns its documents to ready.",
        summary: "Cancel a batch",
        tags: ["Batches"],
      },
      params: BatchIdParamsSchema,
      permission: { batch: ["cancel"] },
      response: {
        200: BatchSelectSchema,
        404: ErrorResponse,
        409: ErrorResponse,
      },
    }
  )

  .post(
    "/:batchId/retry",
    async ({ params }) => {
      const batch = await BatchService.getById(
        params.organizationId,
        params.batchId
      );

      if (batch.status !== "failed") {
        throw AppError.conflict(
          `Only failed batches can be retried (was "${batch.status}")`
        );
      }

      assertTransition(batch.status, "signed");

      await BatchRepository.update(params.organizationId, params.batchId, {
        attempts: 0,
        lastError: null,
        status: "signed",
        updatedAt: new Date(),
      });

      await batchRelayQueue.add("submit", {
        batchId: params.batchId,
        organizationId: params.organizationId,
      });

      return BatchService.getById(params.organizationId, params.batchId);
    },
    {
      auth: true,
      detail: {
        description:
          "Requeues a failed batch for anchor submission. Only failed batches are eligible.",
        summary: "Retry a failed batch",
        tags: ["Batches"],
      },
      params: BatchIdParamsSchema,
      permission: { batch: ["sign"] },
      response: {
        200: BatchSelectSchema,
        404: ErrorResponse,
        409: ErrorResponse,
      },
    }
  );
