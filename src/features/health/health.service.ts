import type { ChainHealth } from "./health.model";

import { createChainClient } from "../../chain/client";
import { getActiveRegistryDeployment } from "../../chain/deployments";
import { getIndexerStatus } from "../../chain/indexer";
import { createRelayerSigner } from "../../chain/relayer";
import { env } from "../../config";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const checkChain = async (input: {
  chainId: number;
  registryAddress: string;
  relayerPrivateKey?: string;
  rpcUrls: string[];
}): Promise<ChainHealth | null> => {
  if (input.registryAddress === ZERO_ADDRESS) {
    return null;
  }

  const registryAddress = input.registryAddress as `0x${string}`;
  const client = createChainClient({
    chainId: input.chainId,
    rpcUrls: input.rpcUrls,
  });

  let rpcReachable = false;
  let registryCodeExists = false;
  let indexer: ChainHealth["indexer"] = null;
  let relayer: ChainHealth["relayer"] = null;

  try {
    await client.publicClient.getBlockNumber();
    rpcReachable = true;

    const code = await client.publicClient.getBytecode({
      address: registryAddress,
    });
    registryCodeExists = Boolean(code && code !== "0x");

    await getActiveRegistryDeployment(input.chainId);
    const state = await getIndexerStatus(input.chainId);

    if (state) {
      const head = await client.publicClient.getBlockNumber();
      indexer = {
        haltedReason: state.haltedReason,
        lag: Number(head - BigInt(state.lastBlock)),
        lastBlock: state.lastBlock,
        status: state.status,
      };
    }
  } catch {
    // RPC or DB unreachable — flags stay at their defaults
  }

  if (input.relayerPrivateKey && input.rpcUrls[0]) {
    try {
      const signer = createRelayerSigner(input.rpcUrls[0]);
      const balance = await client.publicClient.getBalance({
        address: signer.address,
      });
      relayer = { address: signer.address, balanceWei: balance.toString() };
    } catch {
      // Relayer balance unavailable
    }
  }

  return {
    address: registryAddress,
    chainId: input.chainId,
    indexer,
    registryCodeExists,
    relayer,
    rpcReachable,
  };
};

export const HealthService = {
  async check() {
    const chain = await checkChain({
      chainId: env.CHAIN_ID,
      registryAddress: env.REGISTRY_ADDRESS,
      relayerPrivateKey: env.RELAYER_PRIVATE_KEY,
      rpcUrls: env.RPC_URLS,
    }).catch(() => null);

    return {
      chain,
      status: "ok" as const,
      timestamp: new Date().toISOString(),
    };
  },
};
