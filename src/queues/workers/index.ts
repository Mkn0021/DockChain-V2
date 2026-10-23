import { batchRelayWorker } from "./batch-relay.worker";
import { chainIndexerWorker } from "./chain-indexer.worker";
import { emailDeliveryWorker } from "./email-delivery.worker";
import { revocationRelayWorker } from "./revocation-relay.worker";
import { webhookDeliveryWorker } from "./webhook-delivery.worker";

export { batchRelayWorker, emailDeliveryWorker, webhookDeliveryWorker };

export const allWorkers = [
  batchRelayWorker,
  chainIndexerWorker,
  emailDeliveryWorker,
  revocationRelayWorker,
  webhookDeliveryWorker,
];

export const closeAllWorkers = async () => {
  console.log("Closing queue workers...");
  await Promise.all(allWorkers.map((worker) => worker.close()));
  console.log("Queue workers closed");
};
