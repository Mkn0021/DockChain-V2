import { type Job, Worker } from "bullmq";

import type { BatchRelayJobDataType } from "../queues/batch-relay.queue";

import { createBullMQConnection } from "../connection";

/**
 * Batch relay worker — currently a stub.
 *
 * When the chain flow lands it will:
 *   1. Load the batch's signed typed data and signature.
 *   2. Submit the anchor transaction to the registry contract.
 *   3. On success: transition the batch to `submitted` and store `txHash`.
 *   4. On failure: transition the batch to `failed` with `last_error`.
 *
 * A separate reconciler job will sweep batches stuck in `submitted` past
 * a confirmation window.
 */
const processBatchRelay = (job: Job<BatchRelayJobDataType>) => {
  const { batchId } = job.data;
  return Promise.resolve({ batchId, stubbed: true });
};

export const batchRelayWorker = new Worker<BatchRelayJobDataType>(
  "batch-relay",
  processBatchRelay,
  {
    concurrency: 2,
    connection: createBullMQConnection(),
  }
);
