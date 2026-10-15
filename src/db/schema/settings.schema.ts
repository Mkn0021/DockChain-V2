import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  text,
} from "drizzle-orm/pg-core";

import { organizations, users } from "./auth.schema";

export const dataAvailability = pgEnum("data_availability", [
  "onchain_encrypted",
  "offchain_only",
]);

export const organizationSettings = pgTable("organization_settings", {
  autoSeal: boolean("auto_seal").default(true).notNull(),

  batchWindowMinutes: integer("batch_window_minutes").default(60).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  dataAvailability: dataAvailability("data_availability")
    .default("onchain_encrypted")
    .notNull(),

  defaultExpiryDays: integer("default_expiry_days"),

  defaultWalletId: text("default_wallet_id"),

  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),

  requireVerifiedDomain: boolean("require_verified_domain")
    .default(false)
    .notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),

  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
});
