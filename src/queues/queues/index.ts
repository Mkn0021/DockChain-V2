import { batchRelayQueue } from "./batch-relay.queue";
import { emailDeliveryQueue } from "./email-delivery.queue";

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

export const allQueues = [batchRelayQueue, emailDeliveryQueue];
