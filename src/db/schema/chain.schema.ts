import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { documents } from "./document.schema";
import { issuerWallets } from "./wallet.schema";

export const indexerStatus = pgEnum("indexer_status", ["running", "halted"]);

export const revocationReasonCode = pgEnum("revocation_reason_code", [
  "error",
  "fraud",
  "superseded",
  "holder_request",
  "other",
]);

export const revocationStatus = pgEnum("revocation_status", [
  "prepared",
  "submitted",
  "confirmed",
  "failed",
]);

export const revocationSource = pgEnum("revocation_source", [
  "platform",
  "wallet",
]);

export const registryDeployments = pgTable(
  "registry_deployments",
  {
    abiHash: text("abi_hash").notNull(),
    address: text("address").notNull(),
    chainId: text("chain_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deployedBlock: text("deployed_block").notNull(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    isActive: text("is_active").notNull().default("true"),
    version: text("version").notNull(),
  },
  (table) => [
    uniqueIndex("registry_deployments_chain_uidx").on(table.chainId),
    index("registry_deployments_active_idx").on(table.isActive),
  ]
);

export const chainEvents = pgTable(
  "chain_events",
  {
    args: jsonb("args").notNull(),
    blockHash: text("block_hash").notNull(),
    blockNumber: text("block_number").notNull(),
    chainId: text("chain_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    eventName: text("event_name").notNull(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    logIndex: text("log_index").notNull(),
    processedAt: timestamp("processed_at"),
    txHash: text("tx_hash").notNull(),
  },
  (table) => [
    uniqueIndex("chain_events_tx_log_uidx").on(table.txHash, table.logIndex),
    index("chain_events_block_idx").on(table.chainId, table.blockNumber),
    index("chain_events_processed_idx").on(table.processedAt),
  ]
);

export const indexerState = pgTable("indexer_state", {
  address: text("address").notNull(),
  chainId: text("chain_id").primaryKey(),
  haltedReason: text("halted_reason"),
  lastBlock: text("last_block").notNull().default("0"),
  lastBlockHash: text("last_block_hash"),
  status: indexerStatus("status").notNull().default("running"),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const revocations = pgTable(
  "revocations",
  {
    blockNumber: text("block_number"),
    blockTimestamp: timestamp("block_timestamp"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    note: text("note"),
    reasonCode: revocationReasonCode("reason_code").notNull(),
    requestedBy: text("requested_by").references(() => issuerWallets.id, {
      onDelete: "set null",
    }),
    source: revocationSource("source").notNull(),
    status: revocationStatus("status").notNull().default("prepared"),
    txHash: text("tx_hash"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("revocations_document_idx").on(table.documentId),
    index("revocations_status_idx").on(table.status),
    uniqueIndex("revocations_document_pending_uidx")
      .on(table.documentId)
      .where(sql`${table.status} IN ('prepared', 'submitted')`),
  ]
);
