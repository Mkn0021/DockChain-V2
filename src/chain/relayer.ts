import {
  createWalletClient,
  http,
  type WalletClient,
  type PrivateKeyAccount,
} from "viem";
import { privateKeyToAccount, nonceManager } from "viem/accounts";

import { env } from "../config";
import { AppError } from "../shared/errors";

export interface RelayerSigner {
  address: `0x${string}`;
  walletClient: WalletClient;
}

export const createLocalRelayerSigner = (
  rpcUrl: string,
  privateKey: `0x${string}`
): RelayerSigner => {
  const account: PrivateKeyAccount = privateKeyToAccount(privateKey, {
    nonceManager,
  });

  const walletClient = createWalletClient({
    account,
    transport: http(rpcUrl),
  });

  return {
    address: account.address,
    walletClient,
  };
};

export const createRelayerSigner = (rpcUrl: string): RelayerSigner => {
  if (!env.RELAYER_PRIVATE_KEY) {
    throw AppError.internal("RELAYER_PRIVATE_KEY is not configured");
  }

  return createLocalRelayerSigner(
    rpcUrl,
    env.RELAYER_PRIVATE_KEY as `0x${string}`
  );
};
