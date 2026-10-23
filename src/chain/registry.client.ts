import {
  encodeFunctionData,
  getContract,
  type Address,
  type GetContractReturnType,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
} from "viem";

import { decodeRegistryError } from "./errors";
import { DOCUMENT_REGISTRY_ABI } from "./registry.abi";

type RegistryContract = GetContractReturnType<
  typeof DOCUMENT_REGISTRY_ABI,
  { public: PublicClient }
>;

type RegistryContractWithWallet = GetContractReturnType<
  typeof DOCUMENT_REGISTRY_ABI,
  { public: PublicClient; wallet: WalletClient }
>;

export interface AnchorRecord {
  count: number;
  timestamp: number;
}

export interface RevocationRecord {
  reason: number;
  timestamp: number;
}

export interface RegistryClientOptions {
  address: Address;
  publicClient: PublicClient;
  walletClient?: WalletClient;
}

export class RegistryClient {
  private readonly contract: RegistryContract;
  private readonly contractWithWallet: RegistryContractWithWallet | null;
  private readonly publicClient: PublicClient;
  private readonly walletClient: WalletClient | null;

  constructor(options: RegistryClientOptions) {
    this.publicClient = options.publicClient;
    this.walletClient = options.walletClient ?? null;

    this.contract = getContract({
      abi: DOCUMENT_REGISTRY_ABI,
      address: options.address,
      client: { public: options.publicClient },
    });

    this.contractWithWallet = options.walletClient
      ? getContract({
          abi: DOCUMENT_REGISTRY_ABI,
          address: options.address,
          client: {
            public: options.publicClient,
            wallet: options.walletClient,
          },
        })
      : null;
  }

  async readAnchor(issuer: Address, root: Hex): Promise<AnchorRecord> {
    try {
      const record = await this.contract.read.anchorOf([issuer, root]);
      return {
        count: record.count,
        timestamp: Number(record.timestamp),
      };
    } catch (error) {
      throw decodeRegistryError(error);
    }
  }

  async readRevocation(issuer: Address, leaf: Hex): Promise<RevocationRecord> {
    try {
      const record = await this.contract.read.revocationOf([issuer, leaf]);
      return {
        reason: record.reason,
        timestamp: Number(record.timestamp),
      };
    } catch (error) {
      throw decodeRegistryError(error);
    }
  }

  async readCompromisedFrom(issuer: Address): Promise<number> {
    try {
      const cutoff = await this.contract.read.compromisedFrom([issuer]);
      return Number(cutoff);
    } catch (error) {
      throw decodeRegistryError(error);
    }
  }

  submitAnchor(input: {
    data: Hex;
    issuer: Address;
    root: Hex;
    count: number;
    windowStart: number;
    windowEnd: number;
    signature: Hex;
  }): Promise<Hex> {
    return this.withWallet(async ({ contractWithWallet, walletClient }) => {
      const { request } = await this.publicClient.simulateContract({
        abi: DOCUMENT_REGISTRY_ABI,
        account: walletClient.account,
        address: contractWithWallet.address,
        args: [
          input.root,
          input.count,
          BigInt(input.windowStart),
          BigInt(input.windowEnd),
          input.issuer,
          input.data,
          input.signature,
        ],
        functionName: "anchor",
      });

      return walletClient.writeContract(request);
    });
  }

  submitRevokeBySig(input: {
    issuer: Address;
    root: Hex;
    leaf: Hex;
    proof: Hex[];
    reason: number;
    signature: Hex;
  }): Promise<Hex> {
    return this.withWallet(async ({ contractWithWallet, walletClient }) => {
      const { request } = await this.publicClient.simulateContract({
        abi: DOCUMENT_REGISTRY_ABI,
        account: walletClient.account,
        address: contractWithWallet.address,
        args: [
          input.issuer,
          input.root,
          input.leaf,
          input.proof,
          input.reason,
          input.signature,
        ],
        functionName: "revokeBySig",
      });

      return walletClient.writeContract(request);
    });
  }

  getReceipt(hash: Hex): Promise<TransactionReceipt> {
    return this.publicClient.waitForTransactionReceipt({ hash });
  }

  encodeRevoke(input: {
    root: Hex;
    leaf: Hex;
    proof: Hex[];
    reason: number;
  }): Hex {
    return encodeFunctionData({
      abi: DOCUMENT_REGISTRY_ABI,
      args: [input.root, input.leaf, input.proof, input.reason],
      functionName: "revoke",
    }) as Hex;
  }

  encodeMarkKeyCompromised(cutoff: number): Hex {
    return encodeFunctionData({
      abi: DOCUMENT_REGISTRY_ABI,
      args: [BigInt(cutoff)],
      functionName: "markKeyCompromised",
    }) as Hex;
  }

  private async withWallet<T>(
    run: (ctx: {
      contractWithWallet: RegistryContractWithWallet;
      walletClient: WalletClient;
    }) => Promise<T>
  ): Promise<T> {
    if (!this.contractWithWallet || !this.walletClient) {
      throw new Error("Wallet client is required for this operation");
    }

    try {
      return await run({
        contractWithWallet: this.contractWithWallet,
        walletClient: this.walletClient,
      });
    } catch (error) {
      throw decodeRegistryError(error);
    }
  }
}
