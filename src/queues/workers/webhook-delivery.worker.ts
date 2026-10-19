import { type Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";

import type { WebhookDeliveryJobDataType } from "../queues/webhook-delivery.queue";

import { db } from "../../db";
import {
  webhookDeliveries,
  webhookEndpoints,
} from "../../db/schema/webhook.schema";
import {
  decryptSecret,
  parseSecretCiphertext,
} from "../../features/webhooks/webhook.secret";
import { signPayload } from "../../features/webhooks/webhook.signing";
import { createBullMQConnection } from "../connection";

const BACKOFF_SCHEDULE_MS = [
  60_000,
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  12 * 60 * 60_000,
];

const processWebhookDelivery = async (job: Job<WebhookDeliveryJobDataType>) => {
  const { deliveryId } = job.data;

  const [delivery] = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.id, deliveryId))
    .limit(1);

  if (!delivery) {
    throw new Error(`Delivery ${deliveryId} not found`);
  }

  if (delivery.status === "delivered") {
    return { deliveryId, skipped: true };
  }

  const [endpoint] = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.id, delivery.endpointId))
    .limit(1);

  if (!endpoint || endpoint.status !== "active") {
    await db
      .update(webhookDeliveries)
      .set({ lastError: "Endpoint inactive or missing", status: "failed" })
      .where(eq(webhookDeliveries.id, deliveryId));
    return { deliveryId, skipped: true };
  }

  const { ciphertext, kekId } = parseSecretCiphertext(endpoint.secretEnc);
  const secret = await decryptSecret(ciphertext, kekId);

  const body = JSON.stringify(delivery.payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload(secret, timestamp, body);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(endpoint.url, {
      body,
      headers: {
        "content-type": "application/json",
        "x-dockchain-delivery": delivery.id,
        "x-dockchain-event": delivery.event,
        "x-dockchain-signature": signature,
        "x-dockchain-timestamp": String(timestamp),
      },
      method: "POST",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      await db
        .update(webhookDeliveries)
        .set({
          deliveredAt: new Date(),
          lastStatusCode: response.status,
          status: "delivered",
        })
        .where(eq(webhookDeliveries.id, deliveryId));
      return { delivered: true, deliveryId };
    }

    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    clearTimeout(timeout);

    const attempts = delivery.attempts + 1;
    const message = error instanceof Error ? error.message : "Unknown error";

    if (attempts >= BACKOFF_SCHEDULE_MS.length) {
      await db
        .update(webhookDeliveries)
        .set({
          attempts,
          lastError: message,
          lastStatusCode:
            error instanceof Error && "status" in error
              ? (error as { status: number }).status
              : null,
          status: "failed",
        })
        .where(eq(webhookDeliveries.id, deliveryId));
      return { attempts, deliveryId, failed: true };
    }

    const delay = BACKOFF_SCHEDULE_MS[attempts];
    await db
      .update(webhookDeliveries)
      .set({
        attempts,
        lastError: message,
        nextAttemptAt: new Date(Date.now() + delay),
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    return { attempts, deliveryId, rescheduled: true };
  }
};

export const webhookDeliveryWorker = new Worker<WebhookDeliveryJobDataType>(
  "webhook-delivery",
  processWebhookDelivery,
  {
    concurrency: 5,
    connection: createBullMQConnection(),
  }
);

webhookDeliveryWorker.on("error", (error) => {
  console.error("[webhook-delivery] worker error:", error.message);
});
