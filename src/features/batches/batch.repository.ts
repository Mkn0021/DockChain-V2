import { and, count, desc, eq, sql } from "drizzle-orm";

import type { BatchStatus } from "./batch.model";

import { db } from "../../db";
import { batches, documents } from "../../db/schema";
import { AppError } from "../../shared/errors";

interface ListFilters {
  issuerWalletId?: string;
  limit: number;
  offset: number;
  status?: BatchStatus;
}

export const BatchRepository = {
  async attachDocuments(
    documentIds: string[],
    batchId: string,
    leaves: {
      leaf: string;
      leafIndex: number;
      merkleProof: string[];
    }[]
  ) {
    for (const [i, documentId] of documentIds.entries()) {
      const leafInfo = leaves[i];
      if (!leafInfo) {
        throw AppError.internal(
          "Leaf data count does not match document count"
        );
      }
      await db
        .update(documents)
        .set({
          batchId,
          leafIndex: String(leafInfo.leafIndex),
          merkleProof: leafInfo.merkleProof,
          status: "batched",
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));
    }
  },

  async detachDocuments(batchId: string) {
    await db
      .update(documents)
      .set({
        batchId: null,
        leafIndex: null,
        merkleProof: null,
        status: "ready",
        updatedAt: new Date(),
      })
      .where(eq(documents.batchId, batchId));
  },

  async findById(organizationId: string, batchId: string) {
    const [row] = await db
      .select()
      .from(batches)
      .where(
        and(eq(batches.id, batchId), eq(batches.organizationId, organizationId))
      )
      .limit(1);
    return row ?? null;
  },

  insert(values: typeof batches.$inferInsert) {
    return db.insert(batches).values(values).returning();
  },

  async list(organizationId: string, filters: ListFilters) {
    const conditions = [eq(batches.organizationId, organizationId)];
    if (filters.status) {
      conditions.push(eq(batches.status, filters.status));
    }
    if (filters.issuerWalletId) {
      conditions.push(eq(batches.issuerWalletId, filters.issuerWalletId));
    }

    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(batches)
        .where(where)
        .orderBy(desc(batches.createdAt))
        .limit(filters.limit)
        .offset(filters.offset),
      db.select({ total: count() }).from(batches).where(where),
    ]);

    return { rows, total: Number(total) };
  },

  lockReadyDocuments(
    organizationId: string,
    issuerWalletId: string,
    limit: number
  ) {
    return db.execute<{
      claimed_issued_at: string | null;
      expires_at: string | null;
      id: string;
      kek_id: string;
      leaf: string;
      payload_enc: string;
      template_version_id: string;
    }>(sql`
    SELECT
      id,
      leaf,
      payload_enc,
      kek_id,
      claimed_issued_at,
      expires_at,
      template_version_id
    FROM documents
    WHERE organization_id = ${organizationId}
      AND issuer_wallet_id = ${issuerWalletId}
      AND status = 'ready'
      AND batch_id IS NULL
    ORDER BY claimed_issued_at ASC
    LIMIT ${limit}
    FOR UPDATE SKIP LOCKED
  `);
  },

  async update(
    organizationId: string,
    batchId: string,
    values: Partial<typeof batches.$inferInsert>
  ) {
    const [row] = await db
      .update(batches)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(eq(batches.id, batchId), eq(batches.organizationId, organizationId))
      )
      .returning();
    return row ?? null;
  },
};
