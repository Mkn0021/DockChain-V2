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
import {
  REVOKE_TYPES,
  buildRevokeTypedData,
} from "../../src/shared/chain/revoke-typed-data";
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

describe("DocumentRegistry — revoke", () => {
  let node: HardhatNode;
  let ctx: RegistryContext;
  let contract: Contract;
  let issuer: ReturnType<typeof getSigner>;
  let batch: ReturnType<typeof buildBatch>;

  beforeAll(async () => {
    node = await startHardhatNode();
    ctx = await deployRegistry(node.rpcUrl);
    issuer = getSigner(HARDHAT_ISSUER_KEY);

    contract = getContract({
      abi: DOCUMENT_REGISTRY_ABI,
      address: ctx.address,
      client: { public: ctx.publicClient, wallet: ctx.walletClient },
    });

    const schemaHash = `0x${"11".repeat(32)}` as `0x${string}`;
    batch = buildBatch({
      chainId: ctx.chainId,
      issuerAddress: issuer.address,
      registryAddress: ctx.address,
      schemaHash,
      seed: 1,
      size: 2,
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
      count: batch.docs.length,
      dataHash: built.dataHash,
      issuer: issuer.address,
      registryAddress: ctx.address,
      root: batch.root,
      windowEnd: 1_700_000_100n,
      windowStart: 1_700_000_000n,
    });

    const signature = await ctx.walletClient.signTypedData({
      account: issuer,
      domain: typedData.domain,
      message: typedData.message,
      primaryType: "Anchor",
      types: ANCHOR_TYPES,
    });

    const hash = await contract.write.anchor(
      [
        batch.root,
        batch.docs.length,
        1_700_000_000n,
        1_700_000_100n,
        issuer.address,
        bytesToHex(built.bytes),
        signature,
      ],
      { account: issuer, chain: null }
    );
    await ctx.publicClient.waitForTransactionReceipt({ hash });
  });

  afterAll(async () => {
    await node.kill();
  });

  it("revokes a leaf with a direct transaction from the issuer", async () => {
    const leaf = batch.leaves[0]!;
    const proof = batch.proofs[0]!;

    const hash = await contract.write.revoke(
      [batch.root, leaf, proof as `0x${string}`[], 0],
      { account: issuer, chain: null }
    );
    await ctx.publicClient.waitForTransactionReceipt({ hash });

    const revocation = await contract.read.revocationOf([issuer.address, leaf]);

    expect(revocation.reason).toBe(0);
    expect(Number(revocation.timestamp)).toBeGreaterThan(0);
  });

  it("revokes a leaf with revokeBySig (relayed)", async () => {
    const leaf = batch.leaves[1]!;
    const proof = batch.proofs[1]!;

    const typedData = buildRevokeTypedData({
      chainId: ctx.chainId,
      issuer: issuer.address,
      leaf,
      reason: 1,
      registryAddress: ctx.address,
      root: batch.root,
    });

    const signature = await ctx.walletClient.signTypedData({
      account: issuer,
      domain: typedData.domain,
      message: typedData.message,
      primaryType: "Revoke",
      types: REVOKE_TYPES,
    });

    const other = privateKeyToAccount(HARDHAT_SECOND_KEY);
    const hash = await contract.write.revokeBySig(
      [
        issuer.address,
        batch.root,
        leaf,
        proof as `0x${string}`[],
        1,
        signature,
      ],
      { account: other, chain: null }
    );
    await ctx.publicClient.waitForTransactionReceipt({ hash });

    const revocation = await contract.read.revocationOf([issuer.address, leaf]);

    expect(revocation.reason).toBe(1);
    expect(Number(revocation.timestamp)).toBeGreaterThan(0);
  });

  it("rejects revoking with a bad proof", async () => {
    const other = privateKeyToAccount(HARDHAT_SECOND_KEY);
    const otherBatch = buildBatch({
      chainId: ctx.chainId,
      issuerAddress: other.address,
      registryAddress: ctx.address,
      schemaHash: `0x${"22".repeat(32)}` as `0x${string}`,
      seed: 10,
      size: 2,
    });

    const built = await buildPackage({
      documents: otherBatch.docs.map((doc) => ({
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
      count: otherBatch.docs.length,
      dataHash: built.dataHash,
      issuer: other.address,
      registryAddress: ctx.address,
      root: otherBatch.root,
      windowEnd: 1_700_000_100n,
      windowStart: 1_700_000_000n,
    });

    const signature = await ctx.walletClient.signTypedData({
      account: other,
      domain: typedData.domain,
      message: typedData.message,
      primaryType: "Anchor",
      types: ANCHOR_TYPES,
    });

    const anchorHash = await contract.write.anchor(
      [
        otherBatch.root,
        otherBatch.docs.length,
        1_700_000_000n,
        1_700_000_100n,
        other.address,
        bytesToHex(built.bytes),
        signature,
      ],
      { account: other, chain: null }
    );
    await ctx.publicClient.waitForTransactionReceipt({ hash: anchorHash });

    const badProof = otherBatch.proofs[0]!;

    await expect(
      contract.write.revoke(
        [
          otherBatch.root,
          otherBatch.leaves[1]!,
          badProof as `0x${string}`[],
          0,
        ],
        { account: other, chain: null }
      )
    ).rejects.toThrow();
  });

  it("rejects revoking a leaf before the anchor exists", async () => {
    const phantomRoot = `0x${"77".repeat(32)}` as `0x${string}`;
    const phantomLeaf = `0x${"78".repeat(32)}` as `0x${string}`;

    await expect(
      contract.write.revoke([phantomRoot, phantomLeaf, [], 0], {
        account: issuer,
        chain: null,
      })
    ).rejects.toThrow();
  });

  it("rejects a double revoke of the same leaf", async () => {
    const leaf = `0x${"79".repeat(32)}` as `0x${string}`;

    const singleBatch = buildBatch({
      chainId: ctx.chainId,
      issuerAddress: issuer.address,
      registryAddress: ctx.address,
      schemaHash: `0x${"33".repeat(32)}` as `0x${string}`,
      seed: 20,
      size: 1,
    });

    const built = await buildPackage({
      documents: singleBatch.docs.map((doc) => ({
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
      root: singleBatch.root,
      windowEnd: 1_700_000_100n,
      windowStart: 1_700_000_000n,
    });

    const signature = await ctx.walletClient.signTypedData({
      account: issuer,
      domain: typedData.domain,
      message: typedData.message,
      primaryType: "Anchor",
      types: ANCHOR_TYPES,
    });

    const anchorHash = await contract.write.anchor(
      [
        singleBatch.root,
        1,
        1_700_000_000n,
        1_700_000_100n,
        issuer.address,
        bytesToHex(built.bytes),
        signature,
      ],
      { account: issuer, chain: null }
    );
    await ctx.publicClient.waitForTransactionReceipt({ hash: anchorHash });

    const realLeaf = singleBatch.leaves[0]!;
    const proof = singleBatch.proofs[0]!;

    const first = await contract.write.revoke(
      [singleBatch.root, realLeaf, proof as `0x${string}`[], 0],
      { account: issuer, chain: null }
    );
    await ctx.publicClient.waitForTransactionReceipt({ hash: first });

    await expect(
      contract.write.revoke(
        [singleBatch.root, realLeaf, proof as `0x${string}`[], 0],
        { account: issuer, chain: null }
      )
    ).rejects.toThrow();
  });

  it("rejects revokeBySig with a signature from a different signer", async () => {
    const other = privateKeyToAccount(HARDHAT_SECOND_KEY);
    const singleBatch = buildBatch({
      chainId: ctx.chainId,
      issuerAddress: issuer.address,
      registryAddress: ctx.address,
      schemaHash: `0x${"44".repeat(32)}` as `0x${string}`,
      seed: 30,
      size: 1,
    });

    const built = await buildPackage({
      documents: singleBatch.docs.map((doc) => ({
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

    const anchorTypedData = buildAnchorTypedData({
      chainId: ctx.chainId,
      count: 1,
      dataHash: built.dataHash,
      issuer: issuer.address,
      registryAddress: ctx.address,
      root: singleBatch.root,
      windowEnd: 1_700_000_100n,
      windowStart: 1_700_000_000n,
    });

    const anchorSig = await ctx.walletClient.signTypedData({
      account: issuer,
      domain: anchorTypedData.domain,
      message: anchorTypedData.message,
      primaryType: "Anchor",
      types: ANCHOR_TYPES,
    });

    const anchorHash = await contract.write.anchor(
      [
        singleBatch.root,
        1,
        1_700_000_000n,
        1_700_000_100n,
        issuer.address,
        bytesToHex(built.bytes),
        anchorSig,
      ],
      { account: issuer, chain: null }
    );
    await ctx.publicClient.waitForTransactionReceipt({ hash: anchorHash });

    const leaf = singleBatch.leaves[0]!;
    const proof = singleBatch.proofs[0]!;

    const revokeTyped = buildRevokeTypedData({
      chainId: ctx.chainId,
      issuer: issuer.address,
      leaf,
      reason: 0,
      registryAddress: ctx.address,
      root: singleBatch.root,
    });

    const wrongSig = await ctx.walletClient.signTypedData({
      account: other,
      domain: revokeTyped.domain,
      message: revokeTyped.message,
      primaryType: "Revoke",
      types: REVOKE_TYPES,
    });

    await expect(
      contract.write.revokeBySig(
        [
          issuer.address,
          singleBatch.root,
          leaf,
          proof as `0x${string}`[],
          0,
          wrongSig,
        ],
        { account: issuer, chain: null }
      )
    ).rejects.toThrow();
  });

  it("rejects a reason code greater than 4", async () => {
    const singleBatch = buildBatch({
      chainId: ctx.chainId,
      issuerAddress: issuer.address,
      registryAddress: ctx.address,
      schemaHash: `0x${"55".repeat(32)}` as `0x${string}`,
      seed: 40,
      size: 1,
    });

    const built = await buildPackage({
      documents: singleBatch.docs.map((doc) => ({
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

    const anchorTypedData = buildAnchorTypedData({
      chainId: ctx.chainId,
      count: 1,
      dataHash: built.dataHash,
      issuer: issuer.address,
      registryAddress: ctx.address,
      root: singleBatch.root,
      windowEnd: 1_700_000_100n,
      windowStart: 1_700_000_000n,
    });

    const anchorSig = await ctx.walletClient.signTypedData({
      account: issuer,
      domain: anchorTypedData.domain,
      message: anchorTypedData.message,
      primaryType: "Anchor",
      types: ANCHOR_TYPES,
    });

    const anchorHash = await contract.write.anchor(
      [
        singleBatch.root,
        1,
        1_700_000_000n,
        1_700_000_100n,
        issuer.address,
        bytesToHex(built.bytes),
        anchorSig,
      ],
      { account: issuer, chain: null }
    );
    await ctx.publicClient.waitForTransactionReceipt({ hash: anchorHash });

    const leaf = singleBatch.leaves[0]!;
    const proof = singleBatch.proofs[0]!;

    await expect(
      contract.write.revoke(
        [singleBatch.root, leaf, proof as `0x${string}`[], 5],
        { account: issuer, chain: null }
      )
    ).rejects.toThrow();
  });
});
