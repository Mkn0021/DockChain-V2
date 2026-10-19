import { Queue } from "bullmq";
import { z } from "zod";

import { bullMQConnection } from "../connection";

export const BatchRelayJobData = z.object({
  batchId: z.string().min(1),
  organizationId: z.string().min(1),
});

export type BatchRelayJobDataType = z.infer<typeof BatchRelayJobData>;

export const batchRelayQueue = new Queue<BatchRelayJobDataType>("batch-relay", {
  connection: bullMQConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { delay: 30_000, type: "exponential" },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
