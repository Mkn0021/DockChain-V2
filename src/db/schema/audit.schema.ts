import type { Json } from "drizzle-zod";

import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  text,
} from "drizzle-orm/pg-core";

import { organizations } from "./auth.schema";

export const actorType = pgEnum("actor_type", [
  "user",
  "api_key",
  "system",
  "wallet",
]);

export const auditLogs = pgTable(
  "audit_logs",
  {
    action: text("action").notNull(),

    actorId: text("actor_id"),

    actorType: actorType("actor_type").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    ip: text("ip"),

    metadata: jsonb("metadata").$type<Json>(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    requestId: text("request_id"),

    targetId: text("target_id"),

    targetType: text("target_type").notNull(),
  },
  (table) => [
    index("audit_logs_organization_created_idx").on(
      table.organizationId,
      table.createdAt
    ),
    index("audit_logs_target_idx").on(
      table.organizationId,
      table.targetType,
      table.targetId
    ),
  ]
);
