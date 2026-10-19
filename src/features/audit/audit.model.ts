import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { auditLogs } from "../../db/schema/audit.schema";

export const AuditLogSelectSchema = createSelectSchema(auditLogs);

export const OrganizationParamsSchema = z.object({
  organizationId: z.string().min(1),
});

export const ActorTypeSchema = z.enum(["user", "api_key", "system", "wallet"]);

export const AuditEventSchema = z.object({
  action: z.string().min(1).max(100),
  actorId: z.string().optional(),
  actorType: ActorTypeSchema,
  ip: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  organizationId: z.string().min(1),
  requestId: z.string().optional(),
  targetId: z.string().optional(),
  targetType: z.string().min(1).max(50),
});

export const AuditLogListQuerySchema = z.object({
  action: z.string().min(1).optional(),
  actorId: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  targetId: z.string().min(1).optional(),
  targetType: z.string().min(1).optional(),
  to: z.coerce.date().optional(),
});

export const AuditLogListResponseSchema = z.object({
  data: z.array(AuditLogSelectSchema),
  meta: z.object({
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
  }),
});

export type AuditEventType = z.infer<typeof AuditEventSchema>;
export type AuditLogListQueryType = z.infer<typeof AuditLogListQuerySchema>;
