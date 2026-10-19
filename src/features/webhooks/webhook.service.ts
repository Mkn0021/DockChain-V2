import type { Json } from "drizzle-zod";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import {
  webhookDeliveries,
  webhookEndpoints,
} from "../../db/schema/webhook.schema";
import { webhookDeliveryQueue } from "../../queues/queues/webhook-delivery.queue";
import { AppError } from "../../shared/errors";
import { AuditService } from "../audit/audit.service";
import { isWebhookEvent, type WebhookEvent } from "./webhook.events";
import { assertUrlIsPublic } from "./webhook.safety";
import {
  decryptSecret,
  encryptSecret,
  generateWebhookSecret,
  parseSecretCiphertext,
  serializeSecretCiphertext,
} from "./webhook.secret";

const encodeSecret = async (secret: string): Promise<string> => {
  const { ciphertext, kekId } = await encryptSecret(secret);
  return serializeSecretCiphertext(ciphertext, kekId);
};

export const WebhookService = {
  async create(
    organizationId: string,
    createdBy: string,
    data: {
      events: string[];
      url: string;
    }
  ) {
    if (data.events.length === 0) {
      throw AppError.validation("At least one event is required");
    }
    for (const event of data.events) {
      if (!isWebhookEvent(event)) {
        throw AppError.validation(`Unknown event: ${event}`);
      }
    }

    await assertUrlIsPublic(data.url).catch((error) => {
      throw AppError.validation(
        error instanceof Error ? error.message : "Invalid webhook URL"
      );
    });

    const secret = generateWebhookSecret();
    const secretEnc = await encodeSecret(secret);

    const [endpoint] = await db
      .insert(webhookEndpoints)
      .values({
        createdBy,
        events: data.events,
        organizationId,
        secretEnc,
        url: data.url,
      })
      .returning();

    if (!endpoint) {
      throw AppError.internal("Failed to create webhook endpoint");
    }

    await AuditService.record({
      action: "webhook.created",
      actorId: createdBy,
      actorType: "user",
      organizationId,
      targetId: endpoint.id,
      targetType: "webhook_endpoint",
    });

    return { endpoint, secret };
  },

  async delete(organizationId: string, endpointId: string) {
    const endpoint = await WebhookService.getById(organizationId, endpointId);

    await db
      .delete(webhookEndpoints)
      .where(eq(webhookEndpoints.id, endpointId));

    await AuditService.record({
      action: "webhook.deleted",
      actorType: "system",
      organizationId,
      targetId: endpointId,
      targetType: "webhook_endpoint",
    });

    return endpoint;
  },

  async emit(organizationId: string, event: WebhookEvent, payload: Json) {
    if (!isWebhookEvent(event)) {
      throw new Error(`Unknown event: ${event}`);
    }

    const endpoints = await db
      .select()
      .from(webhookEndpoints)
      .where(
        and(
          eq(webhookEndpoints.organizationId, organizationId),
          eq(webhookEndpoints.status, "active")
        )
      );

    const matching = endpoints.filter((e) => e.events.includes(event));

    for (const endpoint of matching) {
      const [delivery] = await db
        .insert(webhookDeliveries)
        .values({
          endpointId: endpoint.id,
          event,
          nextAttemptAt: new Date(),
          payload,
        })
        .returning();

      if (delivery) {
        await webhookDeliveryQueue.add("deliver", {
          deliveryId: delivery.id,
        });
      }
    }

    return { queued: matching.length };
  },

  async getById(organizationId: string, endpointId: string) {
    const [endpoint] = await db
      .select()
      .from(webhookEndpoints)
      .where(
        and(
          eq(webhookEndpoints.id, endpointId),
          eq(webhookEndpoints.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!endpoint) {
      throw AppError.notFound("Webhook endpoint not found");
    }

    return endpoint;
  },

  async getDecryptedSecret(
    organizationId: string,
    endpointId: string
  ): Promise<string> {
    const endpoint = await WebhookService.getById(organizationId, endpointId);
    const { ciphertext, kekId } = parseSecretCiphertext(endpoint.secretEnc);
    return decryptSecret(ciphertext, kekId);
  },

  async list(organizationId: string) {
    return await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.organizationId, organizationId))
      .orderBy(desc(webhookEndpoints.createdAt));
  },

  async listDeliveries(
    organizationId: string,
    endpointId: string,
    limit = 50,
    offset = 0
  ) {
    const endpoint = await WebhookService.getById(organizationId, endpointId);

    const rows = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.endpointId, endpoint.id))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.endpointId, endpoint.id));

    return {
      data: rows,
      meta: { limit, offset, total: Number(count) },
    };
  },

  async retryDelivery(organizationId: string, deliveryId: string) {
    const [delivery] = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.id, deliveryId))
      .limit(1);

    if (!delivery) {
      throw AppError.notFound("Delivery not found");
    }

    await WebhookService.getById(organizationId, delivery.endpointId);

    await db
      .update(webhookDeliveries)
      .set({
        nextAttemptAt: new Date(),
        status: "pending",
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    await webhookDeliveryQueue.add("deliver", { deliveryId });

    return { queued: true };
  },

  async rotateSecret(organizationId: string, endpointId: string) {
    await WebhookService.getById(organizationId, endpointId);

    const secret = generateWebhookSecret();
    const secretEnc = await encodeSecret(secret);

    await db
      .update(webhookEndpoints)
      .set({ secretEnc, updatedAt: new Date() })
      .where(eq(webhookEndpoints.id, endpointId));

    return { secret };
  },

  async test(organizationId: string, endpointId: string) {
    await WebhookService.getById(organizationId, endpointId);

    await WebhookService.emit(organizationId, "document.issued", {
      test: true,
      timestamp: new Date().toISOString(),
    });

    return { queued: true };
  },

  async update(
    organizationId: string,
    endpointId: string,
    data: {
      events?: string[];
      status?: "active" | "disabled";
      url?: string;
    }
  ) {
    await WebhookService.getById(organizationId, endpointId);

    if (data.events) {
      for (const event of data.events) {
        if (!isWebhookEvent(event)) {
          throw AppError.validation(`Unknown event: ${event}`);
        }
      }
    }

    if (data.url) {
      await assertUrlIsPublic(data.url).catch((error) => {
        throw AppError.validation(
          error instanceof Error ? error.message : "Invalid webhook URL"
        );
      });
    }

    const [updated] = await db
      .update(webhookEndpoints)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(webhookEndpoints.id, endpointId))
      .returning();

    if (!updated) {
      throw AppError.internal("Failed to update webhook endpoint");
    }

    return updated;
  },
};
