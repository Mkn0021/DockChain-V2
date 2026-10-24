import { and, eq, like } from "drizzle-orm";
import { createHash } from "node:crypto";

import { db } from "../../db";
import { assets } from "../../db/schema/asset.schema";
import { templateVersions, templates } from "../../db/schema/template.schema";
import { S3Service } from "../../s3";
import { AppError } from "../../shared/errors";
import { AuditService } from "../audit/audit.service";
import { MAX_ASSET_BYTES, sniffImage } from "./asset.magic";

const s3Service = new S3Service();

const SIGNED_URL_TTL_SECONDS = 5 * 60;

const sha256Hex = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

const assetKey = (organizationId: string, assetId: string, ext: string) =>
  `organizations/${organizationId}/assets/${assetId}.${ext}`;

const signedUrlFor = (key: string): string =>
  s3Service.presignDownload(key, { expiresIn: SIGNED_URL_TTL_SECONDS });

export const AssetService = {
  async assertAssetsBelongToOrg(
    organizationId: string,
    assetIds: string[]
  ): Promise<void> {
    if (assetIds.length === 0) {
      return;
    }

    const unique = [...new Set(assetIds)];
    const rows = await db
      .select({ id: assets.id })
      .from(assets)
      .where(eq(assets.organizationId, organizationId));

    const owned = new Set(rows.map((r) => r.id));
    const missing = unique.filter((id) => !owned.has(id));

    if (missing.length > 0) {
      throw AppError.validation(
        `Asset references do not belong to this organization: ${missing.join(", ")}`
      );
    }
  },

  async list(organizationId: string) {
    const rows = await db
      .select()
      .from(assets)
      .where(eq(assets.organizationId, organizationId))
      .orderBy(assets.createdAt);

    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        url: await signedUrlFor(row.s3Key),
      }))
    );
  },

  async remove(organizationId: string, assetId: string) {
    const [asset] = await db
      .select()
      .from(assets)
      .where(
        and(eq(assets.id, assetId), eq(assets.organizationId, organizationId))
      )
      .limit(1);

    if (!asset) {
      throw AppError.notFound("Asset not found");
    }

    const referencing = await db
      .select({ id: templateVersions.id })
      .from(templateVersions)
      .innerJoin(templates, eq(templateVersions.templateId, templates.id))
      .where(
        and(
          eq(templates.organizationId, organizationId),
          like(templateVersions.layout, `%asset:${assetId}%`)
        )
      )
      .limit(1);

    if (referencing.length > 0) {
      throw AppError.conflict(
        "This asset is referenced by a template version and cannot be deleted"
      );
    }

    await db.delete(assets).where(eq(assets.id, assetId));
    await s3Service.delete(asset.s3Key);

    await AuditService.record({
      action: "asset.deleted",
      actorType: "user",
      organizationId,
      targetId: assetId,
      targetType: "asset",
    });

    return asset;
  },

  async upload(input: {
    bytes: Uint8Array;
    filename: string;
    organizationId: string;
    userId: string;
  }) {
    if (input.bytes.byteLength > MAX_ASSET_BYTES) {
      throw AppError.validation(
        `Asset exceeds the ${MAX_ASSET_BYTES} byte limit`
      );
    }
    if (input.bytes.byteLength === 0) {
      throw AppError.validation("Asset is empty");
    }

    const sniffed = sniffImage(input.bytes);
    if (!sniffed) {
      throw AppError.validation(
        "Only PNG, JPEG, and WebP images are accepted (magic-byte check failed)"
      );
    }

    const sha256 = sha256Hex(input.bytes);
    const id = crypto.randomUUID();
    const s3Key = assetKey(input.organizationId, id, sniffed.ext);

    await s3Service.upload(s3Key, input.bytes, {
      contentType: sniffed.mime,
    });

    const [row] = await db
      .insert(assets)
      .values({
        createdBy: input.userId,
        filename: input.filename.slice(0, 255),
        id,
        mimeType: sniffed.mime,
        organizationId: input.organizationId,
        s3Key,
        sha256,
        size: input.bytes.byteLength,
      })
      .returning();

    if (!row) {
      throw AppError.internal("Failed to persist asset");
    }

    await AuditService.record({
      action: "asset.uploaded",
      actorId: input.userId,
      actorType: "user",
      metadata: { mimeType: sniffed.mime, size: input.bytes.byteLength },
      organizationId: input.organizationId,
      targetId: row.id,
      targetType: "asset",
    });

    return {
      ...row,
      url: await signedUrlFor(row.s3Key),
    };
  },
};
