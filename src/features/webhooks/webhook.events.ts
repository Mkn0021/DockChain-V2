export const WEBHOOK_EVENTS = [
  "document.issued",
  "document.revoked",
  "batch.awaiting_signature",
  "batch.confirmed",
  "batch.failed",
  "wallet.compromised",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const isWebhookEvent = (value: string): value is WebhookEvent =>
  (WEBHOOK_EVENTS as readonly string[]).includes(value);
