import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import {
  webhookDeliveries,
  webhookEndpoints,
} from "../../db/schema/webhook.schema";

export const WebhookEndpointSelectSchema = createSelectSchema(webhookEndpoints);

export const WebhookDeliverySelectSchema =
  createSelectSchema(webhookDeliveries);

export const WebhookEventSchema = z.enum([
  "document.issued",
  "document.revoked",
  "batch.awaiting_signature",
  "batch.confirmed",
  "batch.failed",
  "wallet.compromised",
]);

export const OrganizationParamsSchema = z.object({
  organizationId: z.string().min(1),
});

export const WebhookEndpointIdParamsSchema = OrganizationParamsSchema.extend({
  endpointId: z.string().min(1),
});

export const WebhookDeliveryIdParamsSchema = OrganizationParamsSchema.extend({
  deliveryId: z.string().min(1),
});

export const WebhookEndpointCreateSchema = z.object({
  events: z.array(WebhookEventSchema).min(1),
  url: z.string().url(),
});

export const WebhookEndpointUpdateSchema = z
  .object({
    events: z.array(WebhookEventSchema).min(1).optional(),
    status: z.enum(["active", "disabled"]).optional(),
    url: z.string().url().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const WebhookEndpointCreateResponseSchema = z.object({
  endpoint: WebhookEndpointSelectSchema,
  secret: z.string(),
});

export const WebhookSecretResponseSchema = z.object({
  secret: z.string(),
});

export const WebhookDeliveryListResponseSchema = z.object({
  data: z.array(WebhookDeliverySelectSchema),
  meta: z.object({
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
  }),
});

export const WebhookDeliveryListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type WebhookEndpointCreateType = z.infer<
  typeof WebhookEndpointCreateSchema
>;
export type WebhookEndpointUpdateType = z.infer<
  typeof WebhookEndpointUpdateSchema
>;
