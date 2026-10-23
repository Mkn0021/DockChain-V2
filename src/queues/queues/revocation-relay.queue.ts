import { Queue } from "bullmq";
import { z } from "zod";

import { bullMQConnection } from "../connection";

export const RevocationRelayJobData = z.object({
  documentId: z.string().min(1),
  organizationId: z.string().min(1),
  revocationId: z.string().min(1),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

export type RevocationRelayJobDataType = z.infer<typeof RevocationRelayJobData>;

export const revocationRelayQueue = new Queue<RevocationRelayJobDataType>(
  "revocation-relay",
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
