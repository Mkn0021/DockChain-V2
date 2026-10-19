import { eq } from "drizzle-orm";

import { db } from "../../db";
import { documentDeliveries } from "../../db/schema/delivery.schema";
import { emailDeliveryQueue } from "../../queues/queues/email-delivery.queue";
import { AppError } from "../../shared/errors";

export const DeliveryService = {
  async enqueue(documentId: string) {
    const [delivery] = await db
      .insert(documentDeliveries)
      .values({ documentId })
      .returning();

    if (!delivery) {
      throw AppError.internal("Failed to create delivery record");
    }

    await emailDeliveryQueue.add("deliver", { deliveryId: delivery.id });

    return delivery;
  },

  async getById(deliveryId: string) {
    const [delivery] = await db
      .select()
      .from(documentDeliveries)
      .where(eq(documentDeliveries.id, deliveryId))
      .limit(1);

    if (!delivery) {
      throw AppError.notFound("Delivery not found");
    }

    return delivery;
  },

  async markFailed(deliveryId: string, error: string) {
    const [delivery] = await db
      .select({ attempts: documentDeliveries.attempts })
      .from(documentDeliveries)
      .where(eq(documentDeliveries.id, deliveryId))
      .limit(1);

    await db
      .update(documentDeliveries)
      .set({
        attempts: (delivery?.attempts ?? 0) + 1,
        lastError: error,
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(documentDeliveries.id, deliveryId));
  },

  async markSent(deliveryId: string) {
    await db
      .update(documentDeliveries)
      .set({
        sentAt: new Date(),
        status: "sent",
        updatedAt: new Date(),
      })
      .where(eq(documentDeliveries.id, deliveryId));
  },
};
