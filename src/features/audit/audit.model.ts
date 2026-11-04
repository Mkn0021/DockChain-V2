import { createSelectSchema } from "drizzle-typebox";
import { t } from "elysia";

import { auditLogs } from "../../db/schema/audit.schema";

export const AuditLogResponseSchema = createSelectSchema(auditLogs);

export const AuditLogListResponseSchema = t.Object({
  data: t.Array(AuditLogResponseSchema),
  meta: t.Object({ limit: t.Number(), offset: t.Number(), total: t.Number() }),
});

export const OrganizationParamsSchema = t.Object({
  organizationId: t.String({ minLength: 1 }),
});

export const ActorTypeSchema = t.Union([
  t.Literal("user"),
  t.Literal("api_key"),
  t.Literal("system"),
  t.Literal("wallet"),
]);

export const AuditLogListQuerySchema = t.Object({
  action: t.Optional(t.String({ minLength: 1 })),
  actorId: t.Optional(t.String({ minLength: 1 })),
  from: t.Optional(t.Date()),
  limit: t.Integer({ default: 50, maximum: 100, minimum: 1 }),
  offset: t.Integer({ default: 0, minimum: 0 }),
  targetId: t.Optional(t.String({ minLength: 1 })),
  targetType: t.Optional(t.String({ minLength: 1 })),
  to: t.Optional(t.Date()),
});

export interface AuditEventType {
  action: string;
  actorId?: string;
  actorType: "user" | "api_key" | "system" | "wallet";
  ip?: string;
  metadata?: Record<string, unknown>;
  organizationId: string;
  requestId?: string;
  targetId?: string;
  targetType: string;
}

export type AuditLogListQueryType = typeof AuditLogListQuerySchema.static;
