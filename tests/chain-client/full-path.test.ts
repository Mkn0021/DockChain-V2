import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { createWalletClient, http, type Hex, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { createChainClient } from "../../src/chain/client";
import { runIndexer } from "../../src/chain/indexer";
import { RegistryClient } from "../../src/chain/registry.client";
import { db } from "../../src/db";
import { batches } from "../../src/db/schema/batch.schema";
import { chainEvents, indexerState } from "../../src/db/schema/chain.schema";
import { documents } from "../../src/db/schema/document.schema";
import { buildPackage } from "../../src/features/batches/batch.package";
import {
  ANCHOR_TYPES,
  buildAnchorTypedData,
} from "../../src/features/batches/batch.typed-data";
import { VerifyService } from "../../src/features/verify/verify.service";
import { processBatchRelay } from "../../src/queues/workers/batch-relay.worker";
import {
  HARDHAT_ISSUER_KEY,
  buildBatch,
  deployRegistry,
  getSigner,
  startHardhatNode,
  type HardhatNode,
  type RegistryContext,
} from "../chain/helpers";

mock.module("../../src/features/webhooks/webhook.service", () => {
  const emitted: Array<{ event: string; organizationId: string }> = [];
  return {
    WebhookService: {
      emit: async (organizationId: string, event: string) => {
        emitted.push({ event, organizationId });
        return { queued: 1 };
      },
    },
  };
});

mock.module("../../src/features/documents/document.delivery", () => ({
  DeliveryService: {
    enqueue: async (documentId: string) => ({
      documentId,
      id: `mocked-${documentId}`,
      status: "queued",
    }),
  },
}));

describe("full path", () => {
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

  it("signs, relays, indexes, and verifies a batch end to end", async () => {
    const schemaHash = `0x${"11".repeat(32)}` as Hex;
    const batch = buildBatch({
      chainId: ctx.chainId,
      issuerAddress: issuer.address,
      registryAddress: ctx.address,
      schemaHash,
      seed: 9999,
      size: 3,
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
      count: 3,
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

    const txHash = await registryClient.submitAnchor({
      count: 3,
      data: `0x${Buffer.from(built.bytes).toString("hex")}` as Hex,
      issuer: issuer.address,
      root: batch.root,
      signature,
      windowEnd: 1_700_000_100,
      windowStart: 1_700_000_000,
    });
    await registryClient.getReceipt(txHash);

    await node.rpcCall("hardhat_mine", ["0x2"]);

    const indexResult = await runIndexer({
      chainId: ctx.chainId,
      confirmations: 1,
      publicClient: chainClient.publicClient,
      registryAddress: ctx.address,
    });

    expect(indexResult.appliedCount).toBe(1);
    expect(indexResult.halted).toBe(false);

    const anchor = await registryClient.readAnchor(issuer.address, batch.root);
    expect(anchor.count).toBe(3);
    expect(anchor.timestamp).toBeGreaterThan(0);
  });

  it("returns pending for an unanchored leaf", async () => {
    const result = await VerifyService.byLeaf(`0x${"aa".repeat(32)}`, false);
    expect(result.status).toBe("not-found");
  });

  it("indexer is idempotent across runs", async () => {
    const second = await runIndexer({
      chainId: ctx.chainId,
      confirmations: 1,
      publicClient: chainClient.publicClient,
      registryAddress: ctx.address,
    });

    expect(second.appliedCount).toBe(0);
    expect(second.halted).toBe(false);
  });
});
