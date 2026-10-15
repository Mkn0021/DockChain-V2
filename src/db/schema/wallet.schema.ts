import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organizations, users } from "./auth.schema";

export const walletStatus = pgEnum("wallet_status", [
  "active",
  "disabled",
  "compromised",
]);

export const issuerWallets = pgTable(
  "issuer_wallets",
  {
    address: text("address").notNull(),

    chainId: text("chain_id").notNull(),

    compromisedFrom: timestamp("compromised_from"),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    domain: text("domain"),

    domainVerifiedAt: timestamp("domain_verified_at"),

    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    label: text("label").notNull(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    status: walletStatus("status").default("active").notNull(),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("issuer_wallets_address_chain_uidx").on(
      table.address,
      table.chainId
    ),
    index("issuer_wallets_organization_idx").on(table.organizationId),
  ]
);
