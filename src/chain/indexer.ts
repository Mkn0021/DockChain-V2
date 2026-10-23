import { and, eq, sql } from "drizzle-orm";
import {
  parseEventLogs,
  type Address,
  type Hex,
  type ParseEventLogsReturnType,
  type PublicClient,
} from "viem";

import { db } from "../db";
import { batches } from "../db/schema/batch.schema";
import { chainEvents, indexerState } from "../db/schema/chain.schema";
import { documents } from "../db/schema/document.schema";
import { issuerWallets } from "../db/schema/wallet.schema";
import { DeliveryService } from "../features/documents/document.delivery";
import { WebhookService } from "../features/webhooks/webhook.service";
import { DOCUMENT_REGISTRY_ABI } from "./registry.abi";

const CHUNK_SIZE = 2000n;

type RegistryEvent = ParseEventLogsReturnType<
  typeof DOCUMENT_REGISTRY_ABI
>[number];

type AnchoredEvent = Extract<RegistryEvent, { eventName: "Anchored" }>;
type RevokedEvent = Extract<RegistryEvent, { eventName: "Revoked" }>;
type KeyCompromisedEvent = Extract<
  RegistryEvent,
  { eventName: "KeyCompromised" }
>;

export interface IndexerRunResult {
  appliedCount: number;
  fromBlock: bigint;
  halted: boolean;
  toBlock: bigint;
}

const toJsonSafe = (value: unknown): Record<string, unknown> => {
  const json = JSON.stringify(value, (_key, inner) =>
    typeof inner === "bigint" ? inner.toString() : inner
  );
  return JSON.parse(json) as Record<string, unknown>;
};

const getOrCreateState = async (
  chainId: number,
  registryAddress: Address
): Promise<{ lastBlock: bigint; lastBlockHash: Hex | null }> => {
  const [row] = await db
    .select()
    .from(indexerState)
    .where(eq(indexerState.chainId, String(chainId)))
    .limit(1);

  if (row) {
    return {
      lastBlock: BigInt(row.lastBlock),
      lastBlockHash: (row.lastBlockHash as Hex | null) ?? null,
    };
  }

  await db.insert(indexerState).values({
    address: registryAddress,
    chainId: String(chainId),
    lastBlock: "0",
    lastBlockHash: null,
    status: "running",
  });

  return { lastBlock: 0n, lastBlockHash: null };
};

const haltIndexer = async (chainId: number, reason: string): Promise<void> => {
  await db
    .update(indexerState)
    .set({
      haltedReason: reason,
      status: "halted",
      updatedAt: new Date(),
    })
    .where(eq(indexerState.chainId, String(chainId)));
};

export const runIndexer = async (input: {
  chainId: number;
  confirmations: number;
  publicClient: PublicClient;
  registryAddress: Address;
}): Promise<IndexerRunResult> => {
  const { chainId, confirmations, publicClient, registryAddress } = input;

  const { lastBlock, lastBlockHash } = await getOrCreateState(
    chainId,
    registryAddress
  );

  if (lastBlockHash && lastBlock > 0n) {
    const onChainBlock = await publicClient.getBlock({
      blockNumber: lastBlock,
    });

    if (onChainBlock.hash !== lastBlockHash) {
      await haltIndexer(
        chainId,
        `Block hash mismatch at ${lastBlock}: expected ${lastBlockHash}, got ${onChainBlock.hash}. Run \`bun run chain:reindex --from=<block>\` to reset.`
      );

      return {
        appliedCount: 0,
        fromBlock: lastBlock,
        halted: true,
        toBlock: lastBlock,
      };
    }
  }

  const head = await publicClient.getBlockNumber();
  const target = head - BigInt(confirmations);

  if (target <= lastBlock) {
    return {
      appliedCount: 0,
      fromBlock: lastBlock,
      halted: false,
      toBlock: lastBlock,
    };
  }

  let cursor = lastBlock + 1n;
  let appliedCount = 0;
  let newLastBlock = lastBlock;
  let newLastBlockHash: Hex | null = lastBlockHash;

  while (cursor <= target) {
    const chunkEnd =
      cursor + CHUNK_SIZE - 1n > target ? target : cursor + CHUNK_SIZE - 1n;

    const logs = await publicClient.getLogs({
      address: registryAddress,
      fromBlock: cursor,
      toBlock: chunkEnd,
    });

    const parsed = parseEventLogs({
      abi: DOCUMENT_REGISTRY_ABI,
      logs,
    });

    for (const event of parsed) {
      const inserted = await persistAndApplyEvent(chainId, event);
      if (inserted) {
        appliedCount += 1;
      }
    }

    const chunkBlock = await publicClient.getBlock({
      blockNumber: chunkEnd,
    });

    newLastBlock = chunkEnd;
    newLastBlockHash = chunkBlock.hash;

    cursor = chunkEnd + 1n;
  }

  await db
    .update(indexerState)
    .set({
      lastBlock: newLastBlock.toString(),
      lastBlockHash: newLastBlockHash,
      updatedAt: new Date(),
    })
    .where(eq(indexerState.chainId, String(chainId)));

  return {
    appliedCount,
    fromBlock: lastBlock,
    halted: false,
    toBlock: newLastBlock,
  };
};

const persistAndApplyEvent = async (
  chainId: number,
  event: RegistryEvent
): Promise<boolean> => {
  const args = toJsonSafe(event.args);

  const inserted = await db
    .insert(chainEvents)
    .values({
      args,
      blockHash: event.blockHash ?? "",
      blockNumber: String(event.blockNumber),
      chainId: String(chainId),
      eventName: event.eventName,
      logIndex: String(event.logIndex),
      processedAt: new Date(),
      txHash: event.transactionHash ?? "",
    })
    .onConflictDoNothing()
    .returning({ id: chainEvents.id });

  if (inserted.length === 0) {
    return false;
  }

  if (event.eventName === "Anchored") {
    await applyAnchored(event);
  } else if (event.eventName === "Revoked") {
    await applyRevoked(event);
  } else if (event.eventName === "KeyCompromised") {
    await applyKeyCompromised(event);
  }

  return true;
};

const applyAnchored = async (event: AnchoredEvent): Promise<void> => {
  const issuerLower = event.args.issuer?.toLowerCase();
  const root = event.args.root as Hex;

  const [wallet] = await db
    .select()
    .from(issuerWallets)
    .where(sql`lower(${issuerWallets.address}) = ${issuerLower}`)
    .limit(1);

  if (!wallet) {
    return;
  }

  const [batch] = await db
    .select()
    .from(batches)
    .where(and(eq(batches.issuerWalletId, wallet.id), eq(batches.root, root)))
    .limit(1);

  if (!batch || batch.status === "confirmed") {
    return;
  }

  await db
    .update(batches)
    .set({
      blockNumber: String(event.blockNumber),
      confirmedAt: new Date(),
      status: "confirmed",
      txHash: event.transactionHash ?? null,
      updatedAt: new Date(),
    })
    .where(eq(batches.id, batch.id));

  const docs = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.batchId, batch.id));

  if (docs.length > 0) {
    await db
      .update(documents)
      .set({ status: "issued", updatedAt: new Date() })
      .where(eq(documents.batchId, batch.id));
  }

  await WebhookService.emit(batch.organizationId, "batch.confirmed", {
    batchId: batch.id,
    blockNumber: String(event.blockNumber),
    root,
    txHash: event.transactionHash ?? "",
  });

  for (const doc of docs) {
    await WebhookService.emit(batch.organizationId, "document.issued", {
      documentId: doc.id,
    });

    try {
      await DeliveryService.enqueue(doc.id);
    } catch {
      // Non-fatal — delivery can be retried via resend
    }
  }
};

const applyRevoked = async (event: RevokedEvent): Promise<void> => {
  const issuerLower = event.args.issuer?.toLowerCase();
  const leaf = event.args.leaf as Hex;

  const [wallet] = await db
    .select()
    .from(issuerWallets)
    .where(sql`lower(${issuerWallets.address}) = ${issuerLower}`)
    .limit(1);

  if (!wallet) {
    return;
  }

  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.leaf, leaf), eq(documents.issuerWalletId, wallet.id))
    )
    .limit(1);

  if (!doc || doc.status === "revoked") {
    return;
  }

  await db
    .update(documents)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(eq(documents.id, doc.id));

  await WebhookService.emit(doc.organizationId, "document.revoked", {
    documentId: doc.id,
    leaf,
    reason: Number(event.args.reason),
    txHash: event.transactionHash ?? "",
  });
};

const applyKeyCompromised = async (
  event: KeyCompromisedEvent
): Promise<void> => {
  const issuerLower = event.args.issuer?.toLowerCase();
  const cutoff = Number(event.args.cutoff);

  const [wallet] = await db
    .select()
    .from(issuerWallets)
    .where(sql`lower(${issuerWallets.address}) = ${issuerLower}`)
    .limit(1);

  if (!wallet) {
    return;
  }

  const cutoffDate = new Date(cutoff * 1000);

  if (
    wallet.status === "compromised" &&
    wallet.compromisedFrom &&
    wallet.compromisedFrom.getTime() <= cutoffDate.getTime()
  ) {
    return;
  }

  await db
    .update(issuerWallets)
    .set({
      compromisedFrom: cutoffDate,
      status: "compromised",
      updatedAt: new Date(),
    })
    .where(eq(issuerWallets.id, wallet.id));

  await WebhookService.emit(wallet.organizationId, "wallet.compromised", {
    cutoff,
    txHash: event.transactionHash ?? "",
    walletId: wallet.id,
  });
};

export const getIndexerStatus = async (chainId: number) => {
  const [row] = await db
    .select()
    .from(indexerState)
    .where(eq(indexerState.chainId, String(chainId)))
    .limit(1);

  return row ?? null;
};

export const resetIndexerFrom = async (
  chainId: number,
  fromBlock: bigint
): Promise<void> => {
  await db
    .update(indexerState)
    .set({
      haltedReason: null,
      lastBlock: (fromBlock - 1n).toString(),
      lastBlockHash: null,
      status: "running",
      updatedAt: new Date(),
    })
    .where(eq(indexerState.chainId, String(chainId)));
};
