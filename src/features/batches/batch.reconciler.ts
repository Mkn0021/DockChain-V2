import { and, eq, lt, or } from "drizzle-orm";

import { createChainClient } from "../../chain/client";
import { RegistryClient } from "../../chain/registry.client";
import { env } from "../../config";
import { db } from "../../db";
import { batches } from "../../db/schema/batch.schema";
import { issuerWallets } from "../../db/schema/wallet.schema";
import { batchRelayQueue } from "../../queues/queues/batch-relay.queue";
import { WebhookService } from "../webhooks/webhook.service";
import { assertTransition } from "./batch.state";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const runBatchReconciler = async (): Promise<{
  reconciled: number;
  requeued: number;
}> => {
  if (env.REGISTRY_ADDRESS === ZERO_ADDRESS) {
    return { reconciled: 0, requeued: 0 };
  }

  const chainClient = createChainClient();
  const registry = new RegistryClient({
    address: env.REGISTRY_ADDRESS as `0x${string}`,
    publicClient: chainClient.publicClient,
  });

  const cutoff = new Date(Date.now() - env.RECONCILE_AFTER_MINUTES * 60 * 1000);

  const candidates = await db
    .select()
    .from(batches)
    .where(
      or(
        and(eq(batches.status, "submitted"), lt(batches.submittedAt, cutoff)),
        eq(batches.status, "signed")
      )
    );

  let reconciled = 0;
  let requeued = 0;

  for (const batch of candidates) {
    const [wallet] = await db
      .select()
      .from(issuerWallets)
      .where(eq(issuerWallets.id, batch.issuerWalletId))
      .limit(1);

    if (!wallet || !batch.root) {
      continue;
    }

    let anchorTimestamp = 0;

    try {
      const anchor = await registry.readAnchor(
        wallet.address as `0x${string}`,
        batch.root as `0x${string}`
      );
      anchorTimestamp = anchor.timestamp;
    } catch {
      continue;
    }

    if (anchorTimestamp > 0) {
      continue;
    }

    if (batch.status === "submitted") {
      if (!batch.txHash) {
        assertTransition(batch.status, "failed");

        await db
          .update(batches)
          .set({
            lastError: "Submitted batch has no tx hash",
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(batches.id, batch.id));

        await WebhookService.emit(batch.organizationId, "batch.failed", {
          batchId: batch.id,
          reason: "no_tx_hash",
        });

        reconciled += 1;
        continue;
      }

      try {
        const receipt = await registry.getReceipt(
          batch.txHash as `0x${string}`
        );

        if (receipt.status === "reverted") {
          assertTransition(batch.status, "failed");

          await db
            .update(batches)
            .set({
              lastError: "Transaction reverted on-chain",
              status: "failed",
              updatedAt: new Date(),
            })
            .where(eq(batches.id, batch.id));

          await WebhookService.emit(batch.organizationId, "batch.failed", {
            batchId: batch.id,
            reason: "tx_reverted",
          });

          reconciled += 1;
        }
      } catch {
        // Receipt not available yet — chain may still be processing
      }
      continue;
    }

    if (batch.status === "signed") {
      await batchRelayQueue.add("submit", {
        batchId: batch.id,
        organizationId: batch.organizationId,
      });
      requeued += 1;
    }
  }

  return { reconciled, requeued };
};
