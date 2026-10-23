import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import { createLocalRelayerSigner } from "../../src/chain/relayer";
import {
  HARDHAT_ISSUER_KEY,
  HARDHAT_SECOND_KEY,
  startHardhatNode,
  type HardhatNode,
} from "../chain/helpers";

describe("LocalRelayerSigner", () => {
  let node: HardhatNode;

  beforeAll(async () => {
    node = await startHardhatNode();
  });

  afterAll(async () => {
    await node.kill();
  });

  it("derives the relayer address from the private key", () => {
    const relayer = createLocalRelayerSigner(node.rpcUrl, HARDHAT_ISSUER_KEY);
    expect(relayer.address.toLowerCase()).toBe(
      "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    );
  });

  it("concurrent submissions get distinct nonces", async () => {
    const relayer = createLocalRelayerSigner(node.rpcUrl, HARDHAT_SECOND_KEY);

    const first = await relayer.walletClient.sendTransaction({
      account: relayer.walletClient.account!,
      chain: null,
      to: relayer.address,
      value: 1n,
    });

    const second = await relayer.walletClient.sendTransaction({
      account: relayer.walletClient.account!,
      chain: null,
      to: relayer.address,
      value: 1n,
    });

    expect(first).not.toBe(second);
  });
});
