import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type { AnchorTypedDataJson } from "../../features/batches/batch.typed-data";

import { organizations } from "./auth.schema";
import { issuerWallets } from "./wallet.schema";

export const batchStatus = pgEnum("batch_status", [
  "open",
  "awaiting_signature",
  "signed",
  "submitted",
  "confirmed",
  "failed",
  "cancelled",
]);

export const batches = pgTable(
  "batches",
  {
    attempts: integer("attempts").default(0).notNull(),

    blockNumber: text("block_number"),

    blockTimestamp: timestamp("block_timestamp"),

    cancelledAt: timestamp("cancelled_at"),

    chainId: text("chain_id").notNull(),

    confirmedAt: timestamp("confirmed_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    dataHash: text("data_hash"),

    dataObjectKey: text("data_object_key"),

    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    issuerWalletId: text("issuer_wallet_id")
      .notNull()
      .references(() => issuerWallets.id, { onDelete: "restrict" }),

    lastError: text("last_error"),

    leafCount: integer("leaf_count"),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    registryAddress: text("registry_address").notNull(),

    registryVersion: text("registry_version"),

    root: text("root"),

    sealedAt: timestamp("sealed_at"),

    signature: text("signature"),

    signedAt: timestamp("signed_at"),

    status: batchStatus("status").default("open").notNull(),

    submittedAt: timestamp("submitted_at"),

    txHash: text("tx_hash"),

    typedData: jsonb("typed_data").$type<AnchorTypedDataJson>(),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),

    windowEnd: timestamp("window_end"),

    windowStart: timestamp("window_start"),
  },
  (table) => [
    index("batches_organization_status_idx").on(
      table.organizationId,
      table.status
    ),
    index("batches_issuer_wallet_status_idx").on(
      table.issuerWalletId,
      table.status
    ),
    uniqueIndex("batches_issuer_wallet_root_uidx")
      .on(table.issuerWalletId, table.root)
      .where(sql`${table.root} IS NOT NULL`),
  ]
);
