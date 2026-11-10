import { createConfig, http } from "wagmi";
import { anvil, baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

import { env } from "@/lib/env";

const supportedChains = [anvil, baseSepolia] as const;
const activeChain =
  supportedChains.find((c) => c.id === env.NEXT_PUBLIC_CHAIN_ID) ?? anvil;

export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [injected()],
  ssr: true,
  transports: {
    [anvil.id]: http(
      anvil.id === activeChain.id
        ? env.NEXT_PUBLIC_RPC_URL
        : "http://127.0.0.1:8545"
    ),
    [baseSepolia.id]: http(
      baseSepolia.id === activeChain.id
        ? env.NEXT_PUBLIC_RPC_URL
        : "https://sepolia.base.org"
    ),
  },
});

export const registryAddress = env.NEXT_PUBLIC_REGISTRY_ADDRESS;

export const blockExplorerUrl = env.NEXT_PUBLIC_BLOCK_EXPLORER_URL;

export const explorerTxUrl = (hash: string) =>
  blockExplorerUrl ? `${blockExplorerUrl}/tx/${hash}` : null;

export const explorerAddressUrl = (address: string) =>
  blockExplorerUrl ? `${blockExplorerUrl}/address/${address}` : null;
