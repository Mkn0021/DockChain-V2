import { and, eq, inArray } from "drizzle-orm";
import { verifyTypedData } from "viem";

import type { BatchStatus } from "./batch.model";

import { env } from "../../config";
import { db, templateVersions } from "../../db";
import { organizationSettings } from "../../db/schema/settings.schema";
import { issuerWallets } from "../../db/schema/wallet.schema";
import { S3Service } from "../../s3";
import { toUnixSeconds } from "../../shared/db/date";
import { AppError } from "../../shared/errors";
import { buildTree, getProof, getRoot } from "../../shared/merkle";
import { AuditService } from "../audit/audit.service";
import { decryptPayload } from "../documents/document.payload";
import { buildPackage } from "./batch.package";
import { BatchRepository } from "./batch.repository";
import { assertTransition } from "./batch.state";
import {
  ANCHOR_TYPES,
  buildAnchorTypedData,
  fromJson,
  toJson,
  type AnchorTypedDataJson,
} from "./batch.typed-data";

const s3Service = new S3Service();

export const BatchService = {
  async cancel(organizationId: string, batchId: string, userId: string) {
    const batch = await this.getById(organizationId, batchId);

    if (batch.status !== "awaiting_signature") {
      throw AppError.conflict(
        `Only "awaiting_signature" batches can be cancelled (was "${batch.status}")`
      );
    }

    assertTransition(batch.status as BatchStatus, "cancelled");

    await BatchRepository.detachDocuments(batchId);

    await BatchRepository.update(organizationId, batchId, {
      cancelledAt: new Date(),
      status: "cancelled",
    });

    await AuditService.record({
      action: "batch.cancelled",
      actorId: userId,
      actorType: "user",
      organizationId,
      targetId: batchId,
      targetType: "batch",
    });

    return this.getById(organizationId, batchId);
  },

  async getById(organizationId: string, batchId: string) {
    const batch = await BatchRepository.findById(organizationId, batchId);
    if (!batch) {
      throw AppError.notFound("Batch not found");
    }
    return batch;
  },

  async getTypedData(organizationId: string, batchId: string) {
    const batch = await this.getById(organizationId, batchId);
    if (!batch.typedData) {
      throw AppError.conflict("Batch has no typed data");
    }
    return batch.typedData;
  },

  async list(
    organizationId: string,
    filters: Parameters<typeof BatchRepository.list>[1]
  ) {
    const { rows, total } = await BatchRepository.list(organizationId, filters);
    return {
      data: rows,
      meta: { limit: filters.limit, offset: filters.offset, total },
    };
  },

  async sealNow(
    organizationId: string,
    issuerWalletId: string,
    createdBy: string
  ) {
    const [wallet] = await db
      .select()
      .from(issuerWallets)
      .where(
        and(
          eq(issuerWallets.id, issuerWalletId),
          eq(issuerWallets.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!wallet) {
      throw AppError.notFound("Issuer wallet not found");
    }
    if (wallet.status !== "active") {
      throw AppError.validation("Issuer wallet must be active");
    }

    const [settings] = await db
      .select()
      .from(organizationSettings)
      .where(eq(organizationSettings.organizationId, organizationId))
      .limit(1);

    const mode = settings?.dataAvailability ?? "onchain_encrypted";

    const locked = await BatchRepository.lockReadyDocuments(
      organizationId,
      issuerWalletId,
      env.BATCH_MAX_SIZE
    );

    if (locked.length === 0) {
      throw AppError.conflict(
        "No ready documents available to seal for this wallet"
      );
    }

    const sortedDocs = locked.toSorted((a, b) =>
      a.leaf.toLowerCase() < b.leaf.toLowerCase() ? -1 : 1
    );
    const leaves = sortedDocs.map((d) => d.leaf as `0x${string}`);

    const templateVersionIds = [
      ...new Set(sortedDocs.map((d) => d.template_version_id)),
    ];

    const schemaHashByVersion = new Map<string, string>();
    const versions = await db
      .select({
        id: templateVersions.id,
        schemaHash: templateVersions.schemaHash,
      })
      .from(templateVersions)
      .where(inArray(templateVersions.id, templateVersionIds));

    for (const version of versions) {
      if (!version.schemaHash) {
        throw AppError.internal(
          `Published template version ${version.id} is missing a schema hash`
        );
      }
      schemaHashByVersion.set(version.id, version.schemaHash);
    }

    for (const doc of sortedDocs) {
      if (!schemaHashByVersion.has(doc.template_version_id)) {
        throw AppError.internal(
          `No schema hash found for template version ${doc.template_version_id}`
        );
      }
    }

    const tree = buildTree(leaves);
    const root = getRoot(tree);

    const leavesWithProofs = sortedDocs.map((doc, index) => ({
      leaf: doc.leaf,
      leafIndex: index,
      merkleProof: getProof(tree, doc.leaf as `0x${string}`),
    }));

    const packageDocs = await Promise.all(
      sortedDocs.map(async (doc) => {
        const payload = await decryptPayload(doc.payload_enc, doc.kek_id);
        return {
          holderKey: payload.holderKey,
          leaf: doc.leaf as `0x${string}`,
          payloadForOnChain: {
            claimedIssuedAt: toUnixSeconds(doc.claimed_issued_at),
            expiresAt: toUnixSeconds(doc.expires_at),
            fields: payload.fields,
            salt: payload.salt,
            schemaHash: schemaHashByVersion.get(doc.template_version_id),
          },
        };
      })
    );

    const builtPackage = await buildPackage({
      documents: packageDocs,
      mode,
    });

    let windowStartSeconds = Number.MAX_SAFE_INTEGER;
    for (const doc of sortedDocs) {
      const claimedIssuedAt = toUnixSeconds(doc.claimed_issued_at);
      if (claimedIssuedAt > 0 && claimedIssuedAt < windowStartSeconds) {
        windowStartSeconds = claimedIssuedAt;
      }
    }
    const windowEndSeconds = Math.floor(Date.now() / 1000);

    const [batch] = await BatchRepository.insert({
      chainId: String(env.CHAIN_ID),
      dataHash: builtPackage.dataHash,
      dataObjectKey: "",
      issuerWalletId,
      leafCount: leaves.length,
      organizationId,
      registryAddress: env.REGISTRY_ADDRESS,
      root,
      sealedAt: new Date(),
      status: "awaiting_signature",
      windowEnd: new Date(windowEndSeconds * 1000),
      windowStart: new Date(windowStartSeconds * 1000),
    });

    if (!batch) {
      throw AppError.internal("Failed to create batch");
    }

    const s3Key = `batches/${batch.id}/package.bin.gz`;
    await s3Service.upload(s3Key, builtPackage.bytes, {
      contentType: "application/gzip",
    });

    await BatchRepository.update(organizationId, batch.id, {
      dataObjectKey: s3Key,
    });

    await BatchRepository.attachDocuments(
      sortedDocs.map((d) => d.id),
      batch.id,
      leavesWithProofs
    );

    const typedData = buildAnchorTypedData({
      chainId: env.CHAIN_ID,
      count: leaves.length,
      dataHash: builtPackage.dataHash,
      issuer: wallet.address as `0x${string}`,
      registryAddress: env.REGISTRY_ADDRESS as `0x${string}`,
      root,
      windowEnd: BigInt(windowEndSeconds),
      windowStart: BigInt(
        windowStartSeconds === Number.MAX_SAFE_INTEGER
          ? windowEndSeconds
          : windowStartSeconds
      ),
    });

    await BatchRepository.update(organizationId, batch.id, {
      typedData: toJson(typedData),
    });

    await AuditService.record({
      action: "batch.sealed",
      actorId: createdBy,
      actorType: "user",
      metadata: { leafCount: leaves.length, root, walletId: issuerWalletId },
      organizationId,
      targetId: batch.id,
      targetType: "batch",
    });

    return BatchRepository.findById(organizationId, batch.id);
  },

  async submitSignature(
    organizationId: string,
    batchId: string,
    signature: `0x${string}`
  ) {
    const batch = await this.getById(organizationId, batchId);

    if (batch.status !== "awaiting_signature") {
      throw AppError.conflict(
        `Batch is in state "${batch.status}", expected "awaiting_signature"`
      );
    }
    if (!batch.typedData) {
      throw AppError.internal("Batch has no typed data");
    }

    const [wallet] = await db
      .select({ address: issuerWallets.address })
      .from(issuerWallets)
      .where(eq(issuerWallets.id, batch.issuerWalletId))
      .limit(1);
    if (!wallet) {
      throw AppError.internal("Issuer wallet missing");
    }

    const typedData = fromJson(batch.typedData as AnchorTypedDataJson);

    const valid = await verifyTypedData({
      address: wallet.address as `0x${string}`,
      domain: typedData.domain,
      message: typedData.message,
      primaryType: "Anchor",
      signature,
      types: ANCHOR_TYPES,
    });

    if (!valid) {
      throw AppError.validation(
        "Signature does not match the batch's typed data"
      );
    }

    assertTransition(batch.status as BatchStatus, "signed");

    await BatchRepository.update(organizationId, batchId, {
      signature,
      signedAt: new Date(),
      status: "signed",
    });

    await AuditService.record({
      action: "batch.signed",
      actorType: "wallet",
      organizationId,
      targetId: batchId,
      targetType: "batch",
    });

    return this.getById(organizationId, batchId);
  },
};
