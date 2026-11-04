import { createSelectSchema } from "drizzle-typebox";
import { t } from "elysia";

import {
  webhookDeliveries,
  webhookEndpoints,
} from "../../db/schema/webhook.schema";

// ── Response schemas (derived) ─────────────────────────────────────────────

export const WebhookEndpointResponseSchema =
  createSelectSchema(webhookEndpoints);
export const WebhookDeliveryResponseSchema =
  createSelectSchema(webhookDeliveries);

export const WebhookEndpointCreateResponseSchema = t.Object({
  endpoint: WebhookEndpointResponseSchema,
  secret: t.String(),
});

export const WebhookSecretResponseSchema = t.Object({
  secret: t.String(),
});

export const WebhookDeliveryListResponseSchema = t.Object({
  data: t.Array(WebhookDeliveryResponseSchema),
  meta: t.Object({ limit: t.Number(), offset: t.Number(), total: t.Number() }),
});

// ── Params ─────────────────────────────────────────────────────────────────

export const OrganizationParamsSchema = t.Object({
  organizationId: t.String({ minLength: 1 }),
});

export const WebhookEndpointIdParamsSchema = t.Object({
  endpointId: t.String({ minLength: 1 }),
  organizationId: t.String({ minLength: 1 }),
});

export const WebhookDeliveryIdParamsSchema = t.Object({
  deliveryId: t.String({ minLength: 1 }),
  organizationId: t.String({ minLength: 1 }),
});

// ── Query ──────────────────────────────────────────────────────────────────

export const WebhookDeliveryListQuerySchema = t.Object({
  limit: t.Integer({ default: 50, maximum: 100, minimum: 1 }),
  offset: t.Integer({ default: 0, minimum: 0 }),
});

// ── Request bodies ─────────────────────────────────────────────────────────

export const WebhookEventSchema = t.Union([
  t.Literal("document.issued"),
  t.Literal("document.revoked"),
  t.Literal("batch.awaiting_signature"),
  t.Literal("batch.confirmed"),
  t.Literal("batch.failed"),
  t.Literal("wallet.compromised"),
]);

export const WebhookEndpointCreateSchema = t.Object({
  events: t.Array(WebhookEventSchema, { minItems: 1 }),
  url: t.String({ format: "uri" }),
});

export const WebhookEndpointUpdateSchema = t.Object(
  {
    events: t.Optional(t.Array(WebhookEventSchema, { minItems: 1 })),
    status: t.Optional(t.Union([t.Literal("active"), t.Literal("disabled")])),
    url: t.Optional(t.String({ format: "uri" })),
  },
  { minProperties: 1 }
);

// ── Types ──────────────────────────────────────────────────────────────────

export type WebhookEndpointCreateType =
  typeof WebhookEndpointCreateSchema.static;
export type WebhookEndpointUpdateType =
  typeof WebhookEndpointUpdateSchema.static;
