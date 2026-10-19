import { Queue } from "bullmq";
import { z } from "zod";

import { bullMQConnection } from "../connection";

export const WebhookDeliveryJobData = z.object({
  deliveryId: z.string().min(1),
});

export type WebhookDeliveryJobDataType = z.infer<typeof WebhookDeliveryJobData>;

export const webhookDeliveryQueue = new Queue<WebhookDeliveryJobDataType>(
  "webhook-delivery",
  {
    connection: bullMQConnection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: 500,
      removeOnFail: 1000,
    },
  }
);
