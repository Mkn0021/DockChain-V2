import { and, desc, eq } from "drizzle-orm";

import type { AuditEventType } from "./audit.model";

import { db } from "../../db";
import { auditLogs } from "../../db/schema/audit.schema";

export const AuditService = {
  list(
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

    return db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(options.limit)
      .offset(options.offset);
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
