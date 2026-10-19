import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { documents } from "./document.schema";

export const deliveryChannel = pgEnum("delivery_channel", ["email"]);

export const deliveryStatus = pgEnum("delivery_status", [
  "queued",
  "sent",
  "failed",
]);

export const documentDeliveries = pgTable(
  "document_deliveries",
  {
    attempts: integer("attempts").default(0).notNull(),

    channel: deliveryChannel("channel").default("email").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),

    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    lastError: text("last_error"),

    sentAt: timestamp("sent_at"),

    status: deliveryStatus("status").default("queued").notNull(),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("document_deliveries_document_idx").on(table.documentId),
    index("document_deliveries_status_idx").on(table.status),
  ]
);
