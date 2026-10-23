import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import { checkChain } from "../src/features/health/health.service";
import { startHardhatNode, type HardhatNode } from "./chain/helpers";

describe("checkChain", () => {
  let node: HardhatNode;

  beforeAll(async () => {
    node = await startHardhatNode();
  });

  afterAll(async () => {
    await node.kill();
  });

  it("returns null when the registry address is zero", async () => {
    const result = await checkChain({
      chainId: 31_337,
      registryAddress: "0x0000000000000000000000000000000000000000",
      rpcUrls: [node.rpcUrl],
    });

    expect(result).toBeNull();
  });

  it("reports RPC reachable and no code at an empty address", async () => {
    const result = await checkChain({
      chainId: 31_337,
      registryAddress: "0x0000000000000000000000000000000000000001",
      rpcUrls: [node.rpcUrl],
    });

    expect(result?.rpcReachable).toBe(true);
    expect(result?.registryCodeExists).toBe(false);
    expect(result?.relayer).toBeNull();
  });
});
