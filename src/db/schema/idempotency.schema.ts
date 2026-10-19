import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organizations } from "./auth.schema";

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),

    expiresAt: timestamp("expires_at").notNull(),

    key: text("key").notNull(),

    method: text("method").notNull(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    path: text("path").notNull(),

    requestHash: text("request_hash").notNull(),

    responseBody: jsonb("response_body"),

    responseStatus: integer("response_status"),
  },
  (table) => [
    uniqueIndex("idempotency_keys_organization_key_uidx").on(
      table.organizationId,
      table.key
    ),
  ]
);
