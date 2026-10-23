import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import {
  assertChainIdMatches,
  createChainClient,
} from "../../src/chain/client";
import { startHardhatNode, type HardhatNode } from "../chain/helpers";

describe("createChainClient", () => {
  let node: HardhatNode;

  beforeAll(async () => {
    node = await startHardhatNode();
  });

  afterAll(async () => {
    await node.kill();
  });

  it("builds a client that connects to the RPC", async () => {
    const client = createChainClient({
      chainId: 31_337,
      rpcUrls: [node.rpcUrl],
    });

    const blockNumber = await client.publicClient.getBlockNumber();
    expect(blockNumber).toBeGreaterThanOrEqual(0n);
  });

  it("assertChainIdMatches passes on matching chain id", async () => {
    const client = createChainClient({
      chainId: 31_337,
      rpcUrls: [node.rpcUrl],
    });

    await expect(assertChainIdMatches(client)).resolves.toBeUndefined();
  });

  it("assertChainIdMatches throws on mismatched chain id", async () => {
    const client = createChainClient({
      chainId: 84_532,
      rpcUrls: [node.rpcUrl],
    });

    await expect(assertChainIdMatches(client)).rejects.toThrow(/chain id/);
  });
});
