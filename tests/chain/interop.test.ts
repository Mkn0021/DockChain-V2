import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  bytesToHex,
  getContract,
  type GetContractReturnType,
  type PublicClient,
  type WalletClient,
} from "viem";

import { buildPackage } from "../../src/features/batches/batch.package";
import {
  ANCHOR_TYPES,
  buildAnchorTypedData,
} from "../../src/features/batches/batch.typed-data";
import {
  REVOKE_TYPES,
  buildRevokeTypedData,
} from "../../src/shared/chain/revoke-typed-data";
import { verifyProof } from "../../src/shared/merkle";
import { DOCUMENT_REGISTRY_ABI } from "./abi";
import {
  HARDHAT_ISSUER_KEY,
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

describe("Interop — backend builders accepted by the contract", () => {
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

  for (const size of [1, 2, 7, 100]) {
    it(`anchors a batch of ${size} leaves and verifies every proof`, async () => {
      const schemaHash = `0x${"11".repeat(32)}` as `0x${string}`;
      const batch = buildBatch({
        chainId: ctx.chainId,
        issuerAddress: issuer.address,
        registryAddress: ctx.address,
        schemaHash,
        seed: size * 100,
        size,
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
        count: size,
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
          size,
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
      expect(anchor.count).toBe(size);

      for (let i = 0; i < size; i++) {
        const proof = batch.proofs[i]!;
        expect(verifyProof(batch.root, batch.leaves[i]!, proof)).toBe(true);
      }
    });
  }

  it("revokeBySig from backend-builder signature is accepted", async () => {
    const schemaHash = `0x${"66".repeat(32)}` as `0x${string}`;
    const batch = buildBatch({
      chainId: ctx.chainId,
      issuerAddress: issuer.address,
      registryAddress: ctx.address,
      schemaHash,
      seed: 500,
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

    const anchorTyped = buildAnchorTypedData({
      chainId: ctx.chainId,
      count: 3,
      dataHash: built.dataHash,
      issuer: issuer.address,
      registryAddress: ctx.address,
      root: batch.root,
      windowEnd: 1_700_000_100n,
      windowStart: 1_700_000_000n,
    });

    const anchorSig = await ctx.walletClient.signTypedData({
      account: issuer,
      domain: anchorTyped.domain,
      message: anchorTyped.message,
      primaryType: "Anchor",
      types: ANCHOR_TYPES,
    });

    const anchorHash = await contract.write.anchor(
      [
        batch.root,
        3,
        1_700_000_000n,
        1_700_000_100n,
        issuer.address,
        bytesToHex(built.bytes),
        anchorSig,
      ],
      { account: issuer, chain: null }
    );
    await ctx.publicClient.waitForTransactionReceipt({ hash: anchorHash });

    const leafToRevoke = batch.leaves[1]!;
    const proof = batch.proofs[1]!;

    const revokeTyped = buildRevokeTypedData({
      chainId: ctx.chainId,
      issuer: issuer.address,
      leaf: leafToRevoke,
      reason: 2,
      registryAddress: ctx.address,
      root: batch.root,
    });

    const revokeSig = await ctx.walletClient.signTypedData({
      account: issuer,
      domain: revokeTyped.domain,
      message: revokeTyped.message,
      primaryType: "Revoke",
      types: REVOKE_TYPES,
    });

    const revokeHash = await contract.write.revokeBySig(
      [
        issuer.address,
        batch.root,
        leafToRevoke,
        proof as `0x${string}`[],
        2,
        revokeSig,
      ],
      { account: issuer, chain: null }
    );
    await ctx.publicClient.waitForTransactionReceipt({ hash: revokeHash });

    const revocation = await contract.read.revocationOf([
      issuer.address,
      leafToRevoke,
    ]);

    expect(revocation.reason).toBe(2);
    expect(Number(revocation.timestamp)).toBeGreaterThan(0);
  });

  it("rejects a tampered signature", async () => {
    const schemaHash = `0x${"77".repeat(32)}` as `0x${string}`;
    const batch = buildBatch({
      chainId: ctx.chainId,
      issuerAddress: issuer.address,
      registryAddress: ctx.address,
      schemaHash,
      seed: 900,
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

    const signature = await ctx.walletClient.signTypedData({
      account: issuer,
      domain: typedData.domain,
      message: typedData.message,
      primaryType: "Anchor",
      types: ANCHOR_TYPES,
    });

    const tampered = (signature.slice(0, -2) +
      (signature.slice(-2) === "00" ? "01" : "00")) as `0x${string}`;

    await expect(
      contract.write.anchor(
        [
          batch.root,
          1,
          1_700_000_000n,
          1_700_000_100n,
          issuer.address,
          bytesToHex(built.bytes),
          tampered,
        ],
        { account: issuer, chain: null }
      )
    ).rejects.toThrow();
  });
});
