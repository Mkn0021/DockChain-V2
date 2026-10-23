import { type Job, Worker } from "bullmq";

import { createChainClient } from "../../chain/client";
import { runIndexer, type IndexerRunResult } from "../../chain/indexer";
import { env } from "../../config";
import { createBullMQConnection } from "../connection";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

interface SkippedIndexerResult {
  reason: string;
  skipped: true;
}

type ChainIndexerResult = IndexerRunResult | SkippedIndexerResult;

const processChainIndexer = (_job: Job): Promise<ChainIndexerResult> => {
  if (env.REGISTRY_ADDRESS === ZERO_ADDRESS) {
    return Promise.resolve({
      reason: "REGISTRY_ADDRESS not configured",
      skipped: true,
    });
  }

  const client = createChainClient();

  return runIndexer({
    chainId: env.CHAIN_ID,
    confirmations: env.CONFIRMATIONS,
    publicClient: client.publicClient,
    registryAddress: env.REGISTRY_ADDRESS as `0x${string}`,
  });
};

export const chainIndexerWorker = new Worker(
  "chain-indexer",
  processChainIndexer,
  {
    concurrency: 1,
    connection: createBullMQConnection(),
  }
);

chainIndexerWorker.on("error", (error) => {
  console.error("[chain-indexer] worker error:", error.message);
});
