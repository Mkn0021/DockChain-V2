import { and, eq } from "drizzle-orm";

import type { CompromisePrepareInput } from "./wallet.compromise.model";

import { createChainClient } from "../../chain/client";
import { RegistryClient } from "../../chain/registry.client";
import { env } from "../../config";
import { db } from "../../db";
import { issuerWallets } from "../../db/schema/wallet.schema";
import { AppError } from "../../shared/errors";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const WalletCompromiseService = {
  async prepare(
    organizationId: string,
    walletId: string,
    input: CompromisePrepareInput
  ) {
    if (env.REGISTRY_ADDRESS === ZERO_ADDRESS) {
      throw AppError.internal("Chain is not configured");
    }

    const [wallet] = await db
      .select()
      .from(issuerWallets)
      .where(
        and(
          eq(issuerWallets.id, walletId),
          eq(issuerWallets.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!wallet) {
      throw AppError.notFound("Wallet not found");
    }

    if (wallet.status === "compromised") {
      throw AppError.conflict("Wallet is already marked compromised");
    }

    const cutoff = input.cutoff ?? Math.floor(Date.now() / 1000);

    const chainClient = createChainClient();
    const registry = new RegistryClient({
      address: env.REGISTRY_ADDRESS as `0x${string}`,
      publicClient: chainClient.publicClient,
    });

    const data = registry.encodeMarkKeyCompromised(cutoff);

    return {
      chainId: env.CHAIN_ID,
      data,
      from: wallet.address,
      to: env.REGISTRY_ADDRESS,
    };
  },
};
