import { type Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";

import type { RevocationRelayJobDataType } from "../queues/revocation-relay.queue";

import { createChainClient } from "../../chain/client";
import { decodeRegistryError } from "../../chain/errors";
import { RegistryClient } from "../../chain/registry.client";
import { createRelayerSigner } from "../../chain/relayer";
import { reasonCodeToUint8 } from "../../chain/revocations";
import { env } from "../../config";
import { db } from "../../db";
import { batches } from "../../db/schema/batch.schema";
import { revocations } from "../../db/schema/chain.schema";
import { documents } from "../../db/schema/document.schema";
import { issuerWallets } from "../../db/schema/wallet.schema";
import { AuditService } from "../../features/audit/audit.service";
import { createBullMQConnection } from "../connection";

const isRetryableError = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return (
    message.includes("timeout") ||
    message.includes("nonce too low") ||
    message.includes("replacement underpriced") ||
    message.includes("already known") ||
    message.includes("fetch failed")
  );
};

export const processRevocationRelay = async (
  job: Job<RevocationRelayJobDataType>
): Promise<{
  revocationId: string;
  status: "failed" | "skipped" | "submitted";
}> => {
  const { documentId, organizationId, revocationId, signature } = job.data;

  const [revocation] = await db
    .select()
    .from(revocations)
    .where(eq(revocations.id, revocationId))
    .limit(1);

  if (!revocation || revocation.status !== "prepared") {
    return { revocationId, status: "skipped" };
  }

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc || !doc.batchId || doc.organizationId !== organizationId) {
    return { revocationId, status: "skipped" };
  }

  const [batch] = await db
    .select()
    .from(batches)
    .where(eq(batches.id, doc.batchId))
    .limit(1);

  if (!batch || !batch.root) {
    return { revocationId, status: "skipped" };
  }

  const [wallet] = await db
    .select()
    .from(issuerWallets)
    .where(eq(issuerWallets.id, doc.issuerWalletId))
    .limit(1);

  if (!wallet) {
    return { revocationId, status: "skipped" };
  }

  const chainClient = createChainClient();
  const [rpcUrl] = chainClient.rpcUrls;

  if (!rpcUrl) {
    return { revocationId, status: "skipped" };
  }

  const relayer = createRelayerSigner(rpcUrl);

  const registry = new RegistryClient({
    address: env.REGISTRY_ADDRESS as `0x${string}`,
    publicClient: chainClient.publicClient,
    walletClient: relayer.walletClient,
  });

  try {
    const txHash = await registry.submitRevokeBySig({
      issuer: wallet.address as `0x${string}`,
      leaf: doc.leaf as `0x${string}`,
      proof: doc.merkleProof as string[] as `0x${string}`[],
      reason: reasonCodeToUint8(revocation.reasonCode),
      root: batch.root as `0x${string}`,
      signature: signature as `0x${string}`,
    });

    await db
      .update(revocations)
      .set({
        status: "submitted",
        txHash,
        updatedAt: new Date(),
      })
      .where(eq(revocations.id, revocationId));

    await AuditService.record({
      action: "document.revoke_relayed",
      actorType: "system",
      metadata: { txHash },
      organizationId,
      targetId: documentId,
      targetType: "document",
    });

    return { revocationId, status: "submitted" };
  } catch (error) {
    if (isRetryableError(error)) {
      throw error;
    }

    const mapped = decodeRegistryError(error);

    await db
      .update(revocations)
      .set({
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(revocations.id, revocationId));

    console.error("[revocation-relay] failed", {
      error: mapped.message,
      revocationId,
    });

    return { revocationId, status: "failed" };
  }
};

export const revocationRelayWorker = new Worker<RevocationRelayJobDataType>(
  "revocation-relay",
  processRevocationRelay,
  {
    concurrency: 2,
    connection: createBullMQConnection(),
  }
);

revocationRelayWorker.on("error", (error) => {
  console.error("[revocation-relay] worker error:", error.message);
});
