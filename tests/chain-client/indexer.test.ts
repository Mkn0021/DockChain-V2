import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { eq } from "drizzle-orm";
import { createWalletClient, http, type Hex, type WalletClient } from "viem";

import { createChainClient } from "../../src/chain/client";
import { runIndexer } from "../../src/chain/indexer";
import { RegistryClient } from "../../src/chain/registry.client";
import { db } from "../../src/db";
import { chainEvents, indexerState } from "../../src/db/schema/chain.schema";
import { buildPackage } from "../../src/features/batches/batch.package";
import {
  ANCHOR_TYPES,
  buildAnchorTypedData,
} from "../../src/features/batches/batch.typed-data";
import {
  HARDHAT_ISSUER_KEY,
  buildBatch,
  deployRegistry,
  getSigner,
  startHardhatNode,
  type HardhatNode,
  type RegistryContext,
} from "../chain/helpers";

mock.module("../../src/features/documents/document.delivery", () => ({
  DeliveryService: {
    enqueue: async (documentId: string) => ({
      channel: "email",
      documentId,
      id: `mocked-${documentId}`,
      status: "queued",
    }),
  },
}));

mock.module("../../src/features/webhooks/webhook.service", () => ({
  WebhookService: {
    emit: async () => ({ queued: 0 }),
  },
}));

describe("chain indexer", () => {
  let node: HardhatNode;
  let ctx: RegistryContext;
  let walletClient: WalletClient;
  let chainClient: ReturnType<typeof createChainClient>;
  let registryClient: RegistryClient;
  let issuer: ReturnType<typeof getSigner>;

  beforeAll(async () => {
    node = await startHardhatNode();
    ctx = await deployRegistry(node.rpcUrl);
    issuer = getSigner(HARDHAT_ISSUER_KEY);

    chainClient = createChainClient({
      chainId: ctx.chainId,
      rpcUrls: [node.rpcUrl],
    });

    walletClient = createWalletClient({
      account: issuer,
      transport: http(node.rpcUrl),
    });

    registryClient = new RegistryClient({
      address: ctx.address,
      publicClient: chainClient.publicClient,
      walletClient,
    });

    await db
      .delete(chainEvents)
      .where(eq(chainEvents.chainId, String(ctx.chainId)));
    await db
      .delete(indexerState)
      .where(eq(indexerState.chainId, String(ctx.chainId)));
  });

  afterAll(async () => {
    await node.kill();
  });

  async function anchorOne(seed: number): Promise<Hex> {
    const schemaHash = `0x${"11".repeat(32)}` as Hex;
    const batch = buildBatch({
      chainId: ctx.chainId,
      issuerAddress: issuer.address,
      registryAddress: ctx.address,
      schemaHash,
      seed,
      size: 1,
    });

    const built = await buildPackage({
      documents: batch.docs.map((doc) => ({
        holderKey: doc.holderKey,
        leaf: doc.leaf,
        payloadForOnChain: {
          claimedIssuedAt: 1_700_000_000,
          expiresAt: 0,
          fields: doc.fields,
          salt: doc.salt,
          schemaHash: doc.schemaHash,
        },
      })),
      mode: "onchain_encrypted",
    });

    const typed = buildAnchorTypedData({
      chainId: ctx.chainId,
      count: 1,
      dataHash: built.dataHash,
      issuer: issuer.address,
      registryAddress: ctx.address,
      root: batch.root,
      windowEnd: 1_700_000_100n,
      windowStart: 1_700_000_000n,
    });

    const signature = await walletClient.signTypedData({
      account: issuer,
      domain: typed.domain,
      message: typed.message,
      primaryType: "Anchor",
      types: ANCHOR_TYPES,
    });

    const hash = await registryClient.submitAnchor({
      count: 1,
      data: `0x${Buffer.from(built.bytes).toString("hex")}` as Hex,
      issuer: issuer.address,
      root: batch.root,
      signature,
      windowEnd: 1_700_000_100,
      windowStart: 1_700_000_000,
    });

    await registryClient.getReceipt(hash);

    return hash;
  }
  it("indexes an Anchored event and skips it on re-run", async () => {
    await anchorOne(1);
    await node.rpcCall("hardhat_mine", ["0x1"]);

    const first = await runIndexer({
      chainId: ctx.chainId,
      confirmations: 1,
      publicClient: chainClient.publicClient,
      registryAddress: ctx.address,
    });

    expect(first.appliedCount).toBe(1);
    expect(first.halted).toBe(false);

    const second = await runIndexer({
      chainId: ctx.chainId,
      confirmations: 1,
      publicClient: chainClient.publicClient,
      registryAddress: ctx.address,
    });

    expect(second.appliedCount).toBe(0);
    expect(second.halted).toBe(false);
  });

  it("records the chain_events row exactly once", async () => {
    await anchorOne(2);
    await node.rpcCall("hardhat_mine", ["0x1"]);

    await runIndexer({
      chainId: ctx.chainId,
      confirmations: 1,
      publicClient: chainClient.publicClient,
      registryAddress: ctx.address,
    });

    await runIndexer({
      chainId: ctx.chainId,
      confirmations: 1,
      publicClient: chainClient.publicClient,
      registryAddress: ctx.address,
    });

    const rows = await db
      .select()
      .from(chainEvents)
      .where(eq(chainEvents.chainId, String(ctx.chainId)));

    const anchoredRows = rows.filter((r) => r.eventName === "Anchored");
    expect(anchoredRows.length).toBe(2);
  });

  it("halts on block hash mismatch", async () => {
    await anchorOne(3);
    await node.rpcCall("hardhat_mine", ["0x1"]);

    await runIndexer({
      chainId: ctx.chainId,
      confirmations: 1,
      publicClient: chainClient.publicClient,
      registryAddress: ctx.address,
    });

    await db
      .update(indexerState)
      .set({
        lastBlockHash:
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        status: "running",
      })
      .where(eq(indexerState.chainId, String(ctx.chainId)));

    const result = await runIndexer({
      chainId: ctx.chainId,
      confirmations: 1,
      publicClient: chainClient.publicClient,
      registryAddress: ctx.address,
    });

    expect(result.halted).toBe(true);

    const [state] = await db
      .select()
      .from(indexerState)
      .where(eq(indexerState.chainId, String(ctx.chainId)))
      .limit(1);

    expect(state?.status).toBe("halted");
    expect(state?.haltedReason).toContain("Block hash mismatch");
  });
});
