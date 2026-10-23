import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  getContract,
  type GetContractReturnType,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { DOCUMENT_REGISTRY_ABI } from "./abi";
import {
  HARDHAT_ISSUER_KEY,
  HARDHAT_SECOND_KEY,
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

describe("DocumentRegistry — markKeyCompromised", () => {
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

  it("sets a cutoff and reads it back", async () => {
    const cutoff = BigInt(Math.floor(Date.now() / 1000));

    const hash = await contract.write.markKeyCompromised([cutoff], {
      account: issuer,
      chain: null,
    });
    await ctx.publicClient.waitForTransactionReceipt({ hash });

    const stored = await contract.read.compromisedFrom([issuer.address]);
    expect(stored).toBe(cutoff);
  });

  it("rejects a future cutoff", async () => {
    const future = BigInt(Math.floor(Date.now() / 1000) + 86400);

    await expect(
      contract.write.markKeyCompromised([future], {
        account: issuer,
        chain: null,
      })
    ).rejects.toThrow();
  });

  it("allows the cutoff to move earlier", async () => {
    const second = privateKeyToAccount(HARDHAT_SECOND_KEY);

    const first = BigInt(Math.floor(Date.now() / 1000));
    const firstHash = await contract.write.markKeyCompromised([first], {
      account: second,
      chain: null,
    });
    await ctx.publicClient.waitForTransactionReceipt({ hash: firstHash });

    const earlier = first - 3600n;
    const secondHash = await contract.write.markKeyCompromised([earlier], {
      account: second,
      chain: null,
    });
    await ctx.publicClient.waitForTransactionReceipt({ hash: secondHash });

    const stored = await contract.read.compromisedFrom([second.address]);
    expect(stored).toBe(earlier);
  });

  it("rejects moving the cutoff later", async () => {
    const second = privateKeyToAccount(HARDHAT_SECOND_KEY);
    const now = BigInt(Math.floor(Date.now() / 1000));

    const hash = await contract.write.markKeyCompromised([now - 7200n], {
      account: second,
      chain: null,
    });
    await ctx.publicClient.waitForTransactionReceipt({ hash });

    await expect(
      contract.write.markKeyCompromised([now - 3600n], {
        account: second,
        chain: null,
      })
    ).rejects.toThrow();
  });
});
