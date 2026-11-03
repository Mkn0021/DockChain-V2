"use client";

import { WagmiProvider } from "wagmi";

import { wagmiConfig } from "@/lib/wallet-config";

export function AppWagmiProvider({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
