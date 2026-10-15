import { z } from "zod";

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

export type AuditEventType = z.infer<typeof AuditEventSchema>;
