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

import { organizations, users } from "./auth.schema";
import { batches } from "./batch.schema";
import { templateVersions } from "./template.schema";
import { issuerWallets } from "./wallet.schema";

export const documentStatus = pgEnum("document_status", [
  "draft",
  "ready",
  "batched",
  "issued",
  "revoked",
]);

export const documents = pgTable(
  "documents",
  {
    batchId: text("batch_id").references(() => batches.id, {
      onDelete: "set null",
    }),

    claimedIssuedAt: timestamp("claimed_issued_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    expiresAt: timestamp("expires_at"),

    externalRef: text("external_ref"),

    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    issuerWalletId: text("issuer_wallet_id")
      .notNull()
      .references(() => issuerWallets.id, { onDelete: "restrict" }),

    kekId: text("kek_id").notNull(),

    leaf: text("leaf"),

    leafIndex: text("leaf_index"),

    merkleProof: jsonb("merkle_proof").$type<string[]>(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    payloadEnc: text("payload_enc").notNull(), // base64 of bytea

    status: documentStatus("status").default("draft").notNull(),

    templateVersionId: text("template_version_id")
      .notNull()
      .references(() => templateVersions.id, { onDelete: "restrict" }),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("documents_organization_created_idx").on(
      table.organizationId,
      table.createdAt
    ),
    index("documents_organization_status_idx").on(
      table.organizationId,
      table.status
    ),
    index("documents_template_version_idx").on(table.templateVersionId),
    index("documents_batch_idx").on(table.batchId),
    uniqueIndex("documents_leaf_uidx")
      .on(table.leaf)
      .where(sql`${table.leaf} IS NOT NULL`),
    uniqueIndex("documents_organization_external_ref_uidx")
      .on(table.organizationId, table.externalRef)
      .where(sql`${table.externalRef} IS NOT NULL`),
  ]
);
