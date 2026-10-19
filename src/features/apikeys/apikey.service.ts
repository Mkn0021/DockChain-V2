import { eq, sql } from "drizzle-orm";

import { auth } from "../../auth";
import { db } from "../../db";
import { apikeys } from "../../db/schema/auth.schema";
import { AppError } from "../../shared/errors";
import { AuditService } from "../audit/audit.service";
import {
  parseApiKeyMetadata,
  serializeApiKeyMetadata,
} from "./apikey.metadata";

export const ApiKeyService = {
  async create(
    organizationId: string,
    userId: string,
    data: {
      expiresInDays?: number;
      name: string;
      permissions?: Record<string, string[]>;
    }
  ) {
    const result = await auth.api.createApiKey({
      body: {
        expiresIn: data.expiresInDays
          ? data.expiresInDays * 24 * 60 * 60
          : undefined,
        metadata: serializeApiKeyMetadata({
          organizationId,
          permissions: data.permissions ?? {},
        }),
        name: data.name,
        userId,
      },
    });

    if (!result) {
      throw AppError.internal("Failed to create API key");
    }

    await AuditService.record({
      action: "apikey.created",
      actorId: userId,
      actorType: "user",
      organizationId,
      targetId: result.id,
      targetType: "api_key",
    });

    return {
      ...result,
      organizationId,
    };
  },

  async delete(organizationId: string, keyId: string, userId: string) {
    const [key] = await db
      .select()
      .from(apikeys)
      .where(eq(apikeys.id, keyId))
      .limit(1);

    if (!key) {
      throw AppError.notFound("API key not found");
    }

    const meta = parseApiKeyMetadata(key.metadata);
    if (meta?.organizationId !== organizationId) {
      throw AppError.notFound("API key not found");
    }

    await db.delete(apikeys).where(eq(apikeys.id, keyId));

    await AuditService.record({
      action: "apikey.deleted",
      actorId: userId,
      actorType: "user",
      organizationId,
      targetId: keyId,
      targetType: "api_key",
    });

    return key;
  },

  async list(organizationId: string) {
    const rows = await db
      .select()
      .from(apikeys)
      .where(
        sql`${apikeys.metadata}::jsonb->>'organizationId' = ${organizationId}`
      );

    return rows
      .filter((row) => {
        const meta = parseApiKeyMetadata(row.metadata);
        return meta?.organizationId === organizationId;
      })
      .map((row) => ({
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
        id: row.id,
        metadata: parseApiKeyMetadata(row.metadata),
        name: row.name,
        prefix: row.prefix,
        start: row.start,
      }));
  },
};
