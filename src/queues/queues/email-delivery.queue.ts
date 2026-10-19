import { Queue } from "bullmq";
import { z } from "zod";

import { bullMQConnection } from "../connection";

export const EmailDeliveryJobData = z.object({
  deliveryId: z.string().min(1),
});

export type EmailDeliveryJobDataType = z.infer<typeof EmailDeliveryJobData>;

export const emailDeliveryQueue = new Queue<EmailDeliveryJobDataType>(
  "email-delivery",
  {
    connection: bullMQConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { delay: 30_000, type: "exponential" },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  }
);
