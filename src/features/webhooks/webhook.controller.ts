import { Elysia } from "elysia";

import { ErrorResponse } from "../../shared/models";
import { authPlugin, permissionPlugin } from "../../shared/plugins";
import {
  OrganizationParamsSchema,
  WebhookDeliveryIdParamsSchema,
  WebhookDeliveryListQuerySchema,
  WebhookDeliveryListResponseSchema,
  WebhookEndpointCreateResponseSchema,
  WebhookEndpointCreateSchema,
  WebhookEndpointIdParamsSchema,
  WebhookEndpointSelectSchema,
  WebhookEndpointUpdateSchema,
  WebhookSecretResponseSchema,
} from "./webhook.model";
import { WebhookService } from "./webhook.service";

export const webhookController = new Elysia({
  prefix: "/organizations/:organizationId/webhooks",
})
  .use(authPlugin)
  .use(permissionPlugin)

  .post(
    "/",
    ({ params, body, user }) =>
      WebhookService.create(params.organizationId, user.id, body),
    {
      auth: true,
      body: WebhookEndpointCreateSchema,
      detail: {
        description:
          "Creates a webhook endpoint. Returns the endpoint and the signing secret, which is shown only once.",
        summary: "Create a webhook endpoint",
        tags: ["Webhooks"],
      },
      params: OrganizationParamsSchema,
      permission: { webhook: ["manage"] },
      response: {
        200: WebhookEndpointCreateResponseSchema,
        401: ErrorResponse,
        403: ErrorResponse,
        422: ErrorResponse,
      },
    }
  )

  .get("/", ({ params }) => WebhookService.list(params.organizationId), {
    auth: true,
    detail: { summary: "List webhook endpoints", tags: ["Webhooks"] },
    params: OrganizationParamsSchema,
    permission: { webhook: ["read"] },
  })

  .get(
    "/:endpointId",
    ({ params }) =>
      WebhookService.getById(params.organizationId, params.endpointId),
    {
      auth: true,
      detail: { summary: "Get a webhook endpoint", tags: ["Webhooks"] },
      params: WebhookEndpointIdParamsSchema,
      permission: { webhook: ["read"] },
      response: {
        200: WebhookEndpointSelectSchema,
        404: ErrorResponse,
      },
    }
  )

  .patch(
    "/:endpointId",
    ({ params, body }) =>
      WebhookService.update(params.organizationId, params.endpointId, body),
    {
      auth: true,
      body: WebhookEndpointUpdateSchema,
      detail: { summary: "Update a webhook endpoint", tags: ["Webhooks"] },
      params: WebhookEndpointIdParamsSchema,
      permission: { webhook: ["manage"] },
      response: {
        200: WebhookEndpointSelectSchema,
        404: ErrorResponse,
        422: ErrorResponse,
      },
    }
  )

  .delete(
    "/:endpointId",
    ({ params }) =>
      WebhookService.delete(params.organizationId, params.endpointId),
    {
      auth: true,
      detail: { summary: "Delete a webhook endpoint", tags: ["Webhooks"] },
      params: WebhookEndpointIdParamsSchema,
      permission: { webhook: ["manage"] },
    }
  )

  .post(
    "/:endpointId/rotate-secret",
    ({ params }) =>
      WebhookService.rotateSecret(params.organizationId, params.endpointId),
    {
      auth: true,
      detail: {
        description:
          "Generates a new signing secret. The old secret stops working immediately.",
        summary: "Rotate a webhook secret",
        tags: ["Webhooks"],
      },
      params: WebhookEndpointIdParamsSchema,
      permission: { webhook: ["manage"] },
      response: {
        200: WebhookSecretResponseSchema,
        404: ErrorResponse,
      },
    }
  )

  .post(
    "/:endpointId/test",
    ({ params }) =>
      WebhookService.test(params.organizationId, params.endpointId),
    {
      auth: true,
      detail: {
        description: "Sends a test webhook delivery.",
        summary: "Send a test webhook",
        tags: ["Webhooks"],
      },
      params: WebhookEndpointIdParamsSchema,
      permission: { webhook: ["manage"] },
    }
  )

  .get(
    "/:endpointId/deliveries",
    ({ params, query }) =>
      WebhookService.listDeliveries(
        params.organizationId,
        params.endpointId,
        query.limit,
        query.offset
      ),
    {
      auth: true,
      detail: {
        summary: "List deliveries for a webhook endpoint",
        tags: ["Webhooks"],
      },
      params: WebhookEndpointIdParamsSchema,
      permission: { webhook: ["read"] },
      query: WebhookDeliveryListQuerySchema,
      response: {
        200: WebhookDeliveryListResponseSchema,
        404: ErrorResponse,
      },
    }
  )

  .post(
    "/deliveries/:deliveryId/retry",
    ({ params }) =>
      WebhookService.retryDelivery(params.organizationId, params.deliveryId),
    {
      auth: true,
      detail: {
        summary: "Retry a webhook delivery",
        tags: ["Webhooks"],
      },
      params: WebhookDeliveryIdParamsSchema,
      permission: { webhook: ["manage"] },
    }
  );
