import { and, count, desc, eq, gte, lte } from "drizzle-orm";

import type { DocumentStatus } from "./document.model";

import { db } from "../../db";
import { documents } from "../../db/schema/document.schema";

interface ListFilters {
  batchId?: string;
  createdFrom?: Date;
  createdTo?: Date;
  externalRef?: string;
  issuerWalletId?: string;
  limit: number;
  offset: number;
  status?: DocumentStatus;
  templateId?: string;
  templateVersionId?: string;
}

export const DocumentRepository = {
  async delete(organizationId: string, documentId: string) {
    const [doc] = await db
      .delete(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.organizationId, organizationId)
        )
      )
      .returning();
    return doc ?? null;
  },

  async findById(organizationId: string, documentId: string) {
    const [doc] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.organizationId, organizationId)
        )
      )
      .limit(1);
    return doc ?? null;
  },

  insert(values: typeof documents.$inferInsert) {
    return db.insert(documents).values(values).returning();
  },

  insertMany(rows: (typeof documents.$inferInsert)[]) {
    return db.insert(documents).values(rows).returning();
  },

  async list(organizationId: string, filters: ListFilters) {
    const conditions = [eq(documents.organizationId, organizationId)];
    if (filters.batchId) {
      conditions.push(eq(documents.batchId, filters.batchId));
    }
    if (filters.externalRef) {
      conditions.push(eq(documents.externalRef, filters.externalRef));
    }
    if (filters.issuerWalletId) {
      conditions.push(eq(documents.issuerWalletId, filters.issuerWalletId));
    }
    if (filters.status) {
      conditions.push(eq(documents.status, filters.status));
    }
    if (filters.templateVersionId) {
      conditions.push(
        eq(documents.templateVersionId, filters.templateVersionId)
      );
    }
    if (filters.createdFrom) {
      conditions.push(gte(documents.createdAt, filters.createdFrom));
    }
    if (filters.createdTo) {
      conditions.push(lte(documents.createdAt, filters.createdTo));
    }

    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(documents)
        .where(where)
        .orderBy(desc(documents.createdAt))
        .limit(filters.limit)
        .offset(filters.offset),
      db.select({ total: count() }).from(documents).where(where),
    ]);

    return { rows, total: Number(total) };
  },

  async update(
    organizationId: string,
    documentId: string,
    values: Partial<Document>
  ) {
    const [doc] = await db
      .update(documents)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.organizationId, organizationId)
        )
      )
      .returning();
    return doc ?? null;
  },
};
