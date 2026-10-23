import { createPublicClient, fallback, http, type PublicClient } from "viem";

import { env } from "../config";
import { AppError } from "../shared/errors";

export interface ChainClientOptions {
  rpcUrls?: string[];
  chainId?: number;
}

export interface ChainClient {
  chainId: number;
  publicClient: PublicClient;
  rpcUrls: string[];
}

const createClientForUrl = (url: string): PublicClient =>
  createPublicClient({
    cacheTime: 0,
    transport: http(url),
  });

export const createChainClient = (
  options: ChainClientOptions = {}
): ChainClient => {
  const rpcUrls = options.rpcUrls ?? env.RPC_URLS;
  const expectedChainId = options.chainId ?? env.CHAIN_ID;

  if (rpcUrls.length === 0) {
    throw AppError.internal("At least one RPC URL is required");
  }

  const publicClient = createPublicClient({
    cacheTime: 0,
    transport: fallback(
      rpcUrls.map((url) => http(url, { retryCount: 2, timeout: 10_000 }))
    ),
  });

  return {
    chainId: expectedChainId,
    publicClient,
    rpcUrls,
  };
};

export const assertChainIdMatches = async (
  client: ChainClient
): Promise<void> => {
  const actual = await client.publicClient.getChainId();
  if (actual !== client.chainId) {
    throw AppError.internal(
      `RPC reports chain id ${actual}, expected ${client.chainId}`
    );
  }
};

export const createPublicClientForUrl = createClientForUrl;
