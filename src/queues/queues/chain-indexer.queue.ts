import { Queue } from "bullmq";

import { env } from "../../config";
import { bullMQConnection } from "../connection";

export const chainIndexerQueue = new Queue("chain-indexer", {
  connection: bullMQConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { delay: 5000, type: "exponential" },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

export const scheduleChainIndexer = async (): Promise<void> => {
  await chainIndexerQueue.upsertJobScheduler(
    "chain-indexer-tick",
    { every: env.INDEXER_POLL_MS },
    { name: "index" }
  );
};
