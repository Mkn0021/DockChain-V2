import { batchRelayWorker } from "./batch-relay.worker";

// All workers array
export const allWorkers = [batchRelayWorker];

// Graceful shutdown for all workers
export const closeAllWorkers = async () => {
  console.log("Closing queue workers...");
  await Promise.all(allWorkers.map((worker) => worker.close()));
  console.log("Queue workers closed");
};

export { batchRelayWorker };
