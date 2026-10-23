import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  createWalletClient,
  getAddress,
  http,
  keccak256,
  type Hex,
  type WalletClient,
} from "viem";

import { createChainClient } from "../../src/chain/client";
import { RegistryClient } from "../../src/chain/registry.client";
import { buildPackage } from "../../src/features/batches/batch.package";
import {
  ANCHOR_TYPES,
  buildAnchorTypedData,
} from "../../src/features/batches/batch.typed-data";
import { AppError } from "../../src/shared/errors";
import {
  HARDHAT_ISSUER_KEY,
  buildBatch,
  deployRegistry,
  getSigner,
  startHardhatNode,
  type HardhatNode,
  type RegistryContext,
} from "../chain/helpers";

describe("RegistryClient", () => {
  let node: HardhatNode;
  let ctx: RegistryContext;
  let client: RegistryClient;
  let issuer: ReturnType<typeof getSigner>;
  let chainClient: ReturnType<typeof createChainClient>;
  let walletClient: WalletClient;

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

    client = new RegistryClient({
      address: ctx.address,
      publicClient: chainClient.publicClient,
      walletClient,
    });
  });

  afterAll(async () => {
    await node.kill();
  });

  async function signAnchor(
    typedData: ReturnType<typeof buildAnchorTypedData>
  ): Promise<Hex> {
    return walletClient.signTypedData({
      account: issuer,
      domain: typedData.domain,
      message: typedData.message,
      primaryType: "Anchor",
      types: ANCHOR_TYPES,
    });
  }

  it("submitAnchor submits and getReceipt confirms", async () => {
    const schemaHash = `0x${"11".repeat(32)}` as Hex;
    const batch = buildBatch({
      chainId: ctx.chainId,
      issuerAddress: issuer.address,
      registryAddress: ctx.address,
      schemaHash,
      seed: 1,
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

    const typedData = buildAnchorTypedData({
      chainId: ctx.chainId,
      count: 1,
      dataHash: built.dataHash,
      issuer: issuer.address,
      registryAddress: ctx.address,
      root: batch.root,
      windowEnd: 1_700_000_100n,
      windowStart: 1_700_000_000n,
    });

    const signature = await signAnchor(typedData);

    const hash = await client.submitAnchor({
      count: 1,
      data: `0x${Buffer.from(built.bytes).toString("hex")}` as Hex,
      issuer: issuer.address,
      root: batch.root,
      signature,
      windowEnd: 1_700_000_100,
      windowStart: 1_700_000_000,
    });

    const receipt = await client.getReceipt(hash);
    expect(receipt.status).toBe("success");

    const anchor = await client.readAnchor(issuer.address, batch.root);
    expect(anchor.count).toBe(1);
    expect(anchor.timestamp).toBeGreaterThan(0);
  });

  it("duplicate anchor throws AppError.conflict", async () => {
    const root = `0x${"42".repeat(32)}` as Hex;
    const data = "0x" as Hex;
    const dataHash = keccak256(data);

    const typedData = buildAnchorTypedData({
      chainId: ctx.chainId,
      count: 1,
      dataHash,
      issuer: issuer.address,
      registryAddress: ctx.address,
      root,
      windowEnd: 100n,
      windowStart: 1n,
    });

    const signature = await signAnchor(typedData);

    await client.submitAnchor({
      count: 1,
      data,
      issuer: issuer.address,
      root,
      signature,
      windowEnd: 100,
      windowStart: 1,
    });

    await expect(
      client.submitAnchor({
        count: 1,
        data,
        issuer: issuer.address,
        root,
        signature,
        windowEnd: 100,
        windowStart: 1,
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it("readAnchor returns zero timestamp for unknown root", async () => {
    const anchor = await client.readAnchor(
      issuer.address,
      `0x${"99".repeat(32)}` as Hex
    );
    expect(anchor.timestamp).toBe(0);
    expect(anchor.count).toBe(0);
  });

  it("readCompromisedFrom returns zero for unknown issuer", async () => {
    const cutoff = await client.readCompromisedFrom(
      getAddress("0x0000000000000000000000000000000000000001")
    );
    expect(cutoff).toBe(0);
  });
});
