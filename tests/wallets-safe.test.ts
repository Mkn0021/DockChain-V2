import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { createChainClient } from "../src/chain/client";
import {
  createChallenge,
  verifyChallenge,
} from "../src/features/wallets/wallet.challenge";
import {
  HARDHAT_ISSUER_KEY,
  startHardhatNode,
  type HardhatNode,
} from "./chain/helpers";

describe("wallet challenge verification", () => {
  let node: HardhatNode;

  beforeAll(async () => {
    node = await startHardhatNode();
  });

  afterAll(async () => {
    await node.kill();
  });

  it("verifies an EOA signature through the shared client", async () => {
    const account = privateKeyToAccount(HARDHAT_ISSUER_KEY);
    const chainClient = createChainClient({
      chainId: 31_337,
      rpcUrls: [node.rpcUrl],
    });
    const walletClient = createWalletClient({
      account,
      transport: http(node.rpcUrl),
    });

    const { message, nonce } = createChallenge({
      address: account.address,
      chainId: 31_337,
    });

    const signature = await walletClient.signMessage({
      account,
      message,
    });

    await expect(
      verifyChallenge({
        address: account.address,
        chainId: 31_337,
        expectedNonce: nonce,
        message,
        signature: signature as Hex,
      })
    ).resolves.toBeUndefined();
  });

  it("rejects a signature from a different account", async () => {
    const signer = privateKeyToAccount(HARDHAT_ISSUER_KEY);
    const impostor = privateKeyToAccount(`0x${"01".repeat(32)}`);

    const chainClient = createChainClient({
      chainId: 31_337,
      rpcUrls: [node.rpcUrl],
    });
    void chainClient;

    const walletClient = createWalletClient({
      account: impostor,
      transport: http(node.rpcUrl),
    });

    const { message, nonce } = createChallenge({
      address: signer.address,
      chainId: 31_337,
    });

    const signature = await walletClient.signMessage({
      account: impostor,
      message,
    });

    await expect(
      verifyChallenge({
        address: signer.address,
        chainId: 31_337,
        expectedNonce: nonce,
        message,
        signature: signature as Hex,
      })
    ).rejects.toThrow();
  });

  it("rejects a mismatched nonce", async () => {
    const account = privateKeyToAccount(HARDHAT_ISSUER_KEY);
    const walletClient = createWalletClient({
      account,
      transport: http(node.rpcUrl),
    });

    const { message } = createChallenge({
      address: account.address,
      chainId: 31_337,
    });

    const signature = await walletClient.signMessage({
      account,
      message,
    });

    await expect(
      verifyChallenge({
        address: account.address,
        chainId: 31_337,
        expectedNonce: "wrong-nonce",
        message,
        signature: signature as Hex,
      })
    ).rejects.toThrow(/nonce/i);
  });
});
