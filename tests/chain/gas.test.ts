import { afterAll, beforeAll, describe, it } from "bun:test";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
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

const RESULTS_DIR = join(import.meta.dirname, "..", "..", "contracts");

describe("DocumentRegistry — gas report", () => {
  let node: HardhatNode;
  let ctx: RegistryContext;
  let contract: Contract;
  let issuer: ReturnType<typeof getSigner>;
  const results: Record<string, number> = {};

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
    await mkdir(RESULTS_DIR, { recursive: true });
    await writeFile(
      join(RESULTS_DIR, "gas-report.json"),
      JSON.stringify(results, null, 2)
    );

    await node.kill();
  });

  async function measure(input: {
    dataSize: number;
    label: string;
    size: number;
  }): Promise<void> {
    const schemaHash = `0x${"11".repeat(32)}` as `0x${string}`;
    const batch = buildBatch({
      chainId: ctx.chainId,
      issuerAddress: issuer.address,
      registryAddress: ctx.address,
      schemaHash,
      seed: input.size * 10 + input.dataSize,
      size: input.size,
    });

    let data: `0x${string}` = "0x";

    if (input.dataSize > 0) {
      const padded = new Uint8Array(new ArrayBuffer(input.dataSize));
      padded.fill(0x00);
      data = `0x${Buffer.from(padded).toString("hex")}`;
    }

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
      count: input.size,
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
        input.size,
        1_700_000_000n,
        1_700_000_100n,
        issuer.address,
        bytesToHex(built.bytes),
        signature,
      ],
      { account: issuer, chain: null }
    );
    const receipt = await ctx.publicClient.waitForTransactionReceipt({ hash });

    results[input.label] = Number(receipt.gasUsed);
  }

  it("anchor, 1 doc, 0 bytes", async () => {
    await measure({ dataSize: 0, label: "anchor_1doc_0bytes", size: 1 });
  });

  it("anchor, 100 docs, 20 KB", async () => {
    await measure({
      dataSize: 20_000,
      label: "anchor_100docs_20kb",
      size: 100,
    });
  });

  it("anchor, 500 docs, 100 KB", async () => {
    await measure({
      dataSize: 100_000,
      label: "anchor_500docs_100kb",
      size: 500,
    });
  });
});
