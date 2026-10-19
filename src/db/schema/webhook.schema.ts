import type { Json } from "drizzle-zod";

import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { organizations, users } from "./auth.schema";

export const webhookStatus = pgEnum("webhook_status", ["active", "disabled"]);

export const webhookDeliveryStatus = pgEnum("webhook_delivery_status", [
  "pending",
  "delivered",
  "failed",
]);

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),

    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    events: text("events").array().notNull(),

    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    secretEnc: text("secret_enc").notNull(),

    status: webhookStatus("status").default("active").notNull(),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),

    url: text("url").notNull(),
  },
  (table) => [
    index("webhook_endpoints_organization_idx").on(table.organizationId),
    index("webhook_endpoints_status_idx").on(table.status),
  ]
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    attempts: integer("attempts").default(0).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    deliveredAt: timestamp("delivered_at"),

    endpointId: text("endpoint_id")
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: "cascade" }),

    event: text("event").notNull(),

    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    lastError: text("last_error"),

    lastStatusCode: integer("last_status_code"),

    nextAttemptAt: timestamp("next_attempt_at").notNull(),

    payload: jsonb("payload").$type<Json>().notNull(),

    status: webhookDeliveryStatus("status").default("pending").notNull(),
  },
  (table) => [
    index("webhook_deliveries_endpoint_idx").on(table.endpointId),
    index("webhook_deliveries_status_next_attempt_idx").on(
      table.status,
      table.nextAttemptAt
    ),
  ]
);
