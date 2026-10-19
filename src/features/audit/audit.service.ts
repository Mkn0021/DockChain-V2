import { and, count, desc, eq, gte, lte } from "drizzle-orm";

import type { AuditEventType } from "./audit.model";

import { db } from "../../db";
import { auditLogs } from "../../db/schema/audit.schema";

export const AuditService = {
  async list(
    organizationId: string,
    options: {
      action?: string;
      actorId?: string;
      from?: Date;
      targetId?: string;
      targetType?: string;
      to?: Date;
      limit: number;
      offset: number;
    }
  ) {
    const conditions = [eq(auditLogs.organizationId, organizationId)];

    if (options.action) {
      conditions.push(eq(auditLogs.action, options.action));
    }
    if (options.actorId) {
      conditions.push(eq(auditLogs.actorId, options.actorId));
    }
    if (options.targetId) {
      conditions.push(eq(auditLogs.targetId, options.targetId));
    }
    if (options.targetType) {
      conditions.push(eq(auditLogs.targetType, options.targetType));
    }
    if (options.from) {
      conditions.push(gte(auditLogs.createdAt, options.from));
    }
    if (options.to) {
      conditions.push(lte(auditLogs.createdAt, options.to));
    }

    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(options.limit)
        .offset(options.offset),
      db.select({ total: count() }).from(auditLogs).where(where),
    ]);

    return {
      data: rows,
      meta: {
        limit: options.limit,
        offset: options.offset,
        total: Number(total),
      },
    };
  },

  record(event: AuditEventType) {
    return db.insert(auditLogs).values({
      action: event.action,
      actorId: event.actorId ?? null,
      actorType: event.actorType,
      ip: event.ip ?? null,
      metadata: event.metadata ?? null,
      organizationId: event.organizationId,
      requestId: event.requestId ?? null,
      targetId: event.targetId ?? null,
      targetType: event.targetType,
    });
  },
};
