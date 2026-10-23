import { batchRelayQueue } from "./batch-relay.queue";
import { chainIndexerQueue } from "./chain-indexer.queue";
import { emailDeliveryQueue } from "./email-delivery.queue";
import { revocationRelayQueue } from "./revocation-relay.queue";
import { webhookDeliveryQueue } from "./webhook-delivery.queue";

export {
  batchRelayQueue,
  BatchRelayJobData,
  type BatchRelayJobDataType,
} from "./batch-relay.queue";

export {
  emailDeliveryQueue,
  EmailDeliveryJobData,
  type EmailDeliveryJobDataType,
} from "./email-delivery.queue";

export {
  webhookDeliveryQueue,
  WebhookDeliveryJobData,
  type WebhookDeliveryJobDataType,
} from "./webhook-delivery.queue";

export const allQueues = [
  batchRelayQueue,
  chainIndexerQueue,
  emailDeliveryQueue,
  revocationRelayQueue,
  webhookDeliveryQueue,
];
