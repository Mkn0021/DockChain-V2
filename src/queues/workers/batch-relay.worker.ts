import { type Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";

import type { BatchRelayJobDataType } from "../queues/batch-relay.queue";

import { createChainClient } from "../../chain/client";
import { decodeRegistryError } from "../../chain/errors";
import { RegistryClient } from "../../chain/registry.client";
import { createRelayerSigner } from "../../chain/relayer";
import { env } from "../../config";
import { db } from "../../db";
import { batches } from "../../db/schema/batch.schema";
import { issuerWallets } from "../../db/schema/wallet.schema";
import { AuditService } from "../../features/audit/audit.service";
import { assertTransition } from "../../features/batches/batch.state";
import { WebhookService } from "../../features/webhooks/webhook.service";
import { AppError } from "../../shared/errors";
import { createBullMQConnection } from "../connection";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const isRetryableError = (error: unknown): boolean => {
  if (error instanceof AppError && error.statusCode >= 500) {
    return true;
  }

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return (
    message.includes("timeout") ||
    message.includes("nonce too low") ||
    message.includes("replacement underpriced") ||
    message.includes("already known") ||
    message.includes("fetch failed") ||
    message.includes("econnrefused") ||
    message.includes("etimedout")
  );
};

type SignedBatch = typeof batches.$inferSelect & {
  root: string;
  signature: string;
  typedData: NonNullable<typeof batches.$inferSelect.typedData>;
  windowEnd: Date;
  windowStart: Date;
};

const hasSignedBatchData = (
  batch: typeof batches.$inferSelect
): batch is SignedBatch =>
  Boolean(
    batch.typedData &&
    batch.signature &&
    batch.root &&
    batch.windowEnd &&
    batch.windowStart
  );

export const processBatchRelay = async (
  job: Job<BatchRelayJobDataType>
): Promise<{ batchId: string; status: "failed" | "skipped" | "submitted" }> => {
  const { batchId, organizationId } = job.data;

  if (env.REGISTRY_ADDRESS === ZERO_ADDRESS) {
    return { batchId, status: "skipped" };
  }

  const [batch] = await db
    .select()
    .from(batches)
    .where(eq(batches.id, batchId))
    .limit(1);

  if (!batch || batch.organizationId !== organizationId) {
    return { batchId, status: "skipped" };
  }

  if (batch.status === "confirmed" || batch.status === "submitted") {
    return { batchId, status: "skipped" };
  }

  if (batch.status !== "signed" && batch.status !== "failed") {
    return { batchId, status: "skipped" };
  }

  if (!hasSignedBatchData(batch)) {
    await db
      .update(batches)
      .set({
        lastError:
          "Batch is missing typed data, signature, root, window end, or window start",
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(batches.id, batch.id));

    await WebhookService.emit(organizationId, "batch.failed", {
      batchId: batch.id,
      reason: "missing_signed_data",
    });

    return { batchId, status: "failed" };
  }

  const [wallet] = await db
    .select()
    .from(issuerWallets)
    .where(eq(issuerWallets.id, batch.issuerWalletId))
    .limit(1);

  if (!wallet) {
    return { batchId, status: "skipped" };
  }

  const chainClient = createChainClient();
  const rpcUrl = chainClient.rpcUrls.at(0);
  if (!rpcUrl) {
    throw AppError.internal("No RPC URL is configured for batch relay");
  }
  const relayer = createRelayerSigner(rpcUrl);

  const registry = new RegistryClient({
    address: env.REGISTRY_ADDRESS as `0x${string}`,
    publicClient: chainClient.publicClient,
    walletClient: relayer.walletClient,
  });

  try {
    const existing = await registry.readAnchor(
      wallet.address as `0x${string}`,
      batch.root as `0x${string}`
    );

    if (existing.timestamp > 0) {
      return { batchId, status: "skipped" };
    }
  } catch (error) {
    if (!isRetryableError(error)) {
      const mapped = decodeRegistryError(error);
      await db
        .update(batches)
        .set({
          lastError: mapped.message,
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(batches.id, batch.id));

      await WebhookService.emit(organizationId, "batch.failed", {
        batchId: batch.id,
        reason: mapped.code ?? "chain_read_failed",
      });

      return { batchId, status: "failed" };
    }
    throw error;
  }

  try {
    const packageBytes = await downloadPackage(batch.dataObjectKey);

    const txHash = await registry.submitAnchor({
      count: batch.leafCount ?? 0,
      data: `0x${Buffer.from(packageBytes).toString("hex")}` as `0x${string}`,
      issuer: wallet.address as `0x${string}`,
      root: batch.root as `0x${string}`,
      signature: batch.signature as `0x${string}`,
      windowEnd: Math.floor(batch.windowEnd.getTime() / 1000),
      windowStart: Math.floor(batch.windowStart.getTime() / 1000),
    });

    assertTransition(batch.status, "submitted");

    await db
      .update(batches)
      .set({
        attempts: batch.attempts + 1,
        status: "submitted",
        submittedAt: new Date(),
        txHash,
        updatedAt: new Date(),
      })
      .where(eq(batches.id, batch.id));

    await AuditService.record({
      action: "batch.submitted",
      actorType: "system",
      metadata: { txHash },
      organizationId,
      targetId: batch.id,
      targetType: "batch",
    });

    return { batchId, status: "submitted" };
  } catch (error) {
    if (isRetryableError(error)) {
      throw error;
    }

    const mapped = decodeRegistryError(error);

    await db
      .update(batches)
      .set({
        attempts: batch.attempts + 1,
        lastError: mapped.message,
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(batches.id, batch.id));

    await WebhookService.emit(organizationId, "batch.failed", {
      batchId: batch.id,
      reason: mapped.code ?? "unknown",
    });

    return { batchId, status: "failed" };
  }
};

const downloadPackage = async (key: string | null): Promise<Uint8Array> => {
  if (!key) {
    throw new Error("Batch has no data object key");
  }

  const { S3Service } = await import("../../s3/s3.service");
  const s3 = new S3Service();
  const buffer = await s3.getArrayBuffer(key);

  if (!buffer) {
    throw new Error(`Package not found at ${key}`);
  }

  return new Uint8Array(buffer);
};

export const batchRelayWorker = new Worker<BatchRelayJobDataType>(
  "batch-relay",
  processBatchRelay,
  {
    concurrency: 2,
    connection: createBullMQConnection(),
  }
);

batchRelayWorker.on("error", (error) => {
  console.error("[batch-relay] worker error:", error.message);
});
