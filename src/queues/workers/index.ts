import { batchRelayWorker } from "./batch-relay.worker";
import { emailDeliveryWorker } from "./email-delivery.worker";

export { batchRelayWorker, emailDeliveryWorker };

export const allWorkers = [batchRelayWorker, emailDeliveryWorker];

export const closeAllWorkers = async () => {
  console.log("Closing queue workers...");
  await Promise.all(allWorkers.map((worker) => worker.close()));
  console.log("Queue workers closed");
};
