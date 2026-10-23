import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  bytesToHex,
  getContract,
  keccak256,
  type GetContractReturnType,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { buildPackage } from "../../src/features/batches/batch.package";
import {
  ANCHOR_TYPES,
  buildAnchorTypedData,
} from "../../src/features/batches/batch.typed-data";
import { DOCUMENT_REGISTRY_ABI } from "./abi";
import {
  HARDHAT_ISSUER_KEY,
  HARDHAT_SECOND_KEY,
  buildBatch,
  deployRegistry,
  getSigner,
  startHardhatNode,
  type HardhatNode,
  type RegistryContext,
} from "./helpers";

type Contract = GetContractReturnType<
  typeof DOCUMENT_REGISTRY_ABI,
  { public: PublicClient; wallet: WalletClient }
>;

describe("DocumentRegistry — anchor", () => {
  let node: HardhatNode;
  let ctx: RegistryContext;
  let contract: Contract;
  let issuer: ReturnType<typeof getSigner>;

  beforeAll(async () => {
    node = await startHardhatNode();
    ctx = await deployRegistry(node.rpcUrl);
    issuer = getSigner(HARDHAT_ISSUER_KEY);

    contract = getContract({
      abi: DOCUMENT_REGISTRY_ABI,
      address: ctx.address,
      client: { public: ctx.publicClient, wallet: ctx.walletClient },
    });
  });

  afterAll(async () => {
    await node.kill();
  });

  async function signAnchor(input: {
    count: number;
    dataHash: `0x${string}`;
    root: `0x${string}`;
    windowEnd: number;
    windowStart: number;
  }): Promise<`0x${string}`> {
    const typedData = buildAnchorTypedData({
      chainId: ctx.chainId,
      count: input.count,
      dataHash: input.dataHash,
      issuer: issuer.address,
      registryAddress: ctx.address,
      root: input.root,
      windowEnd: BigInt(input.windowEnd),
      windowStart: BigInt(input.windowStart),
    });

    return ctx.walletClient.signTypedData({
      account: issuer,
      domain: typedData.domain,
      message: typedData.message,
      primaryType: "Anchor",
      types: ANCHOR_TYPES,
    });
  }

  it("accepts a valid signature and stores the anchor", async () => {
    const schemaHash = `0x${"11".repeat(32)}` as `0x${string}`;
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

    const signature = await signAnchor({
      count: 1,
      dataHash: built.dataHash,
      root: batch.root,
      windowEnd: 1_700_000_100,
      windowStart: 1_700_000_000,
    });

    const hash = await contract.write.anchor(
      [
        batch.root,
        1,
        1_700_000_000n,
        1_700_000_100n,
        issuer.address,
        bytesToHex(built.bytes),
        signature,
      ],
      { account: issuer, chain: null }
    );
    await ctx.publicClient.waitForTransactionReceipt({ hash });

    const anchor = await contract.read.anchorOf([issuer.address, batch.root]);

    expect(anchor.count).toBe(1);
    expect(Number(anchor.timestamp)).toBeGreaterThan(0);
  });

  it("rejects a signature from a different signer", async () => {
    const other = privateKeyToAccount(HARDHAT_SECOND_KEY);
    const root = `0x${"42".repeat(32)}` as `0x${string}`;
    const data = "0x" as `0x${string}`;
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

    const signature = await ctx.walletClient.signTypedData({
      account: other,
      domain: typedData.domain,
      message: typedData.message,
      primaryType: "Anchor",
      types: ANCHOR_TYPES,
    });

    await expect(
      contract.write.anchor(
        [root, 1, 1n, 100n, issuer.address, data, signature],
        { account: issuer, chain: null }
      )
    ).rejects.toThrow();
  });

  it("rejects duplicate anchors for the same (issuer, root)", async () => {
    const root = `0x${"44".repeat(32)}` as `0x${string}`;
    const data = "0x" as `0x${string}`;
    const dataHash = keccak256(data);

    const signature = await signAnchor({
      count: 1,
      dataHash,
      root,
      windowEnd: 100,
      windowStart: 1,
    });

    const first = await contract.write.anchor(
      [root, 1, 1n, 100n, issuer.address, data, signature],
      { account: issuer, chain: null }
    );
    await ctx.publicClient.waitForTransactionReceipt({ hash: first });

    await expect(
      contract.write.anchor(
        [root, 1, 1n, 100n, issuer.address, data, signature],
        { account: issuer, chain: null }
      )
    ).rejects.toThrow();
  });

  it("rejects count = 0", async () => {
    const root = `0x${"46".repeat(32)}` as `0x${string}`;
    const data = "0x" as `0x${string}`;
    const dataHash = keccak256(data);

    const signature = await signAnchor({
      count: 0,
      dataHash,
      root,
      windowEnd: 100,
      windowStart: 1,
    });

    await expect(
      contract.write.anchor(
        [root, 0, 1n, 100n, issuer.address, data, signature],
        { account: issuer, chain: null }
      )
    ).rejects.toThrow();
  });

  it("rejects windowStart > windowEnd", async () => {
    const root = `0x${"48".repeat(32)}` as `0x${string}`;
    const data = "0x" as `0x${string}`;
    const dataHash = keccak256(data);

    const signature = await signAnchor({
      count: 1,
      dataHash,
      root,
      windowEnd: 1,
      windowStart: 100,
    });

    await expect(
      contract.write.anchor(
        [root, 1, 100n, 1n, issuer.address, data, signature],
        { account: issuer, chain: null }
      )
    ).rejects.toThrow();
  });

  it("allows the same root to be anchored by two different issuers", async () => {
    const issuer2 = privateKeyToAccount(HARDHAT_SECOND_KEY);
    const root = `0x${"50".repeat(32)}` as `0x${string}`;
    const data = "0x" as `0x${string}`;
    const dataHash = keccak256(data);

    const sig1 = await signAnchor({
      count: 1,
      dataHash,
      root,
      windowEnd: 100,
      windowStart: 1,
    });

    const typed2 = buildAnchorTypedData({
      chainId: ctx.chainId,
      count: 1,
      dataHash,
      issuer: issuer2.address,
      registryAddress: ctx.address,
      root,
      windowEnd: 100n,
      windowStart: 1n,
    });

    const sig2 = await ctx.walletClient.signTypedData({
      account: issuer2,
      domain: typed2.domain,
      message: typed2.message,
      primaryType: "Anchor",
      types: ANCHOR_TYPES,
    });

    const h1 = await contract.write.anchor(
      [root, 1, 1n, 100n, issuer.address, data, sig1],
      { account: issuer, chain: null }
    );
    await ctx.publicClient.waitForTransactionReceipt({ hash: h1 });

    const h2 = await contract.write.anchor(
      [root, 1, 1n, 100n, issuer2.address, data, sig2],
      { account: issuer2, chain: null }
    );
    await ctx.publicClient.waitForTransactionReceipt({ hash: h2 });

    const anchor1 = await contract.read.anchorOf([issuer.address, root]);
    const anchor2 = await contract.read.anchorOf([issuer2.address, root]);

    expect(anchor1.count).toBe(1);
    expect(anchor2.count).toBe(1);
  });
});
