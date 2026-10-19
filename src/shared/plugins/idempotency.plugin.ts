import { and, eq, lt } from "drizzle-orm";
import { Elysia } from "elysia";
import { createHash } from "node:crypto";

import { db } from "../../db";
import { idempotencyKeys } from "../../db/schema/idempotency.schema";
import { AppError, isPgUniqueViolation } from "../errors";

const HEADER = "idempotency-key";
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;
const TTL_HOURS = 24;

const hashRequest = (method: string, path: string, body: unknown): string => {
  const payload = JSON.stringify({ body, method, path });
  return createHash("sha256").update(payload).digest("hex");
};

const extractOrganizationId = (path: string): string | undefined => {
  const match = path.match(/\/organizations\/([^/]+)/);
  return match?.[1];
};

const getResponseStatus = (status: unknown, response: unknown): number => {
  if (typeof status === "number") {
    return status;
  }
  if (response instanceof Response) {
    return response.status;
  }
  return 200;
};

export const idempotencyPlugin = new Elysia({ name: "plugin.idempotency" })
  .onBeforeHandle({ as: "scoped" }, async (ctx) => {
    if (ctx.request.method !== "POST") {
      return;
    }

    const key = ctx.request.headers.get(HEADER);
    if (!key) {
      return;
    }

    if (key.length < MIN_LENGTH || key.length > MAX_LENGTH) {
      throw AppError.validation(
        `Idempotency-Key must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters`
      );
    }

    const organizationId = extractOrganizationId(ctx.path);
    if (!organizationId) {
      throw AppError.validation(
        "Idempotency-Key requires an organization-scoped route"
      );
    }

    const requestHash = hashRequest(
      ctx.request.method,
      ctx.path,
      (ctx as { body?: unknown }).body
    );

    const [existing] = await db
      .select()
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.organizationId, organizationId),
          eq(idempotencyKeys.key, key)
        )
      )
      .limit(1);

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw AppError.validation(
          "Idempotency-Key was used with a different request body"
        );
      }
      if (existing.responseStatus === null) {
        throw AppError.conflict(
          "A request with this Idempotency-Key is still in progress"
        );
      }

      return Response.json(existing.responseBody, {
        status: existing.responseStatus,
      });
    }

    try {
      await db.insert(idempotencyKeys).values({
        expiresAt: new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000),
        key,
        method: ctx.request.method,
        organizationId,
        path: ctx.path,
        requestHash,
      });
    } catch (error) {
      if (isPgUniqueViolation(error)) {
        throw AppError.conflict(
          "A request with this Idempotency-Key is still in progress"
        );
      }
      throw error;
    }

    (
      ctx as { idempotencyKeyRecord?: { key: string; organizationId: string } }
    ).idempotencyKeyRecord = { key, organizationId };
  })
  .onAfterHandle({ as: "scoped" }, async (ctx) => {
    const record = (
      ctx as {
        idempotencyKeyRecord?: { key: string; organizationId: string };
      }
    ).idempotencyKeyRecord;
    if (!record) {
      return;
    }

    const status = getResponseStatus(ctx.set.status, ctx.responseValue);
    if (status < 200 || status >= 300) {
      return;
    }

    let body: unknown;
    if (ctx.responseValue instanceof Response) {
      try {
        body = await ctx.responseValue.clone().json();
      } catch {
        return;
      }
    } else {
      body = ctx.responseValue;
    }

    await db
      .update(idempotencyKeys)
      .set({ responseBody: body as object, responseStatus: status })
      .where(
        and(
          eq(idempotencyKeys.organizationId, record.organizationId),
          eq(idempotencyKeys.key, record.key)
        )
      );
  })
  .onBeforeHandle({ as: "scoped" }, async () => {
    await db
      .delete(idempotencyKeys)
      .where(lt(idempotencyKeys.expiresAt, new Date()));
  });
