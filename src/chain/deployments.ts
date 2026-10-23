import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { keccak256, toHex } from "viem";

import { env } from "../config";
import { db } from "../db";
import { registryDeployments } from "../db/schema/chain.schema";
import { AppError } from "../shared/errors";

interface DeploymentFile {
  abiHash: string;
  address: `0x${string}`;
  chainId: number;
  deployedBlock: number;
  deployTxHash: string;
  local?: boolean;
  version: string;
}

const CONTRACTS_ROOT = join(import.meta.dirname, "..", "..", "contracts");
const DEPLOYMENTS_DIR = join(CONTRACTS_ROOT, "deployments");
const ABI_PATH = join(CONTRACTS_ROOT, "abi", "DocumentRegistry.json");

export const readDeploymentFile = async (
  chainId: number
): Promise<DeploymentFile> => {
  const path = join(DEPLOYMENTS_DIR, `${chainId}.json`);
  let raw: string;

  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw AppError.internal(
      `Deployment file not found for chain ${chainId} at ${path}`
    );
  }

  return JSON.parse(raw) as DeploymentFile;
};

export const verifyAbiHash = async (expected: string): Promise<void> => {
  const raw = await readFile(ABI_PATH, "utf8");
  const abiJson = JSON.stringify(JSON.parse(raw));
  const actual = keccak256(toHex(abiJson));

  if (actual !== expected) {
    throw AppError.internal(
      `ABI hash mismatch: file says ${actual}, deployment manifest says ${expected}. Regenerate contracts/deployments/${env.CHAIN_ID}.json.`
    );
  }
};

export interface SyncDeploymentResult {
  address: `0x${string}`;
  chainId: number;
  version: string;
}

export const syncRegistryDeployment = async (
  chainId: number,
  registryAddress: string
): Promise<SyncDeploymentResult> => {
  const file = await readDeploymentFile(chainId);

  if (file.chainId !== chainId) {
    throw AppError.internal(
      `Deployment manifest chainId ${file.chainId} does not match expected ${chainId}`
    );
  }

  if (
    registryAddress !== "0x0000000000000000000000000000000000000000" &&
    file.address.toLowerCase() !== registryAddress.toLowerCase()
  ) {
    throw AppError.internal(
      `REGISTRY_ADDRESS (${registryAddress}) does not match contracts/deployments/${chainId}.json (${file.address})`
    );
  }

  await verifyAbiHash(file.abiHash);

  await db
    .insert(registryDeployments)
    .values({
      abiHash: file.abiHash,
      address: file.address,
      chainId: String(chainId),
      deployedBlock: String(file.deployedBlock),
      isActive: "true",
      version: file.version,
    })
    .onConflictDoUpdate({
      set: {
        abiHash: file.abiHash,
        address: file.address,
        deployedBlock: String(file.deployedBlock),
        isActive: "true",
        version: file.version,
      },
      target: registryDeployments.chainId,
    });

  return {
    address: file.address,
    chainId,
    version: file.version,
  };
};

export const getActiveRegistryDeployment = async (chainId: number) => {
  const [row] = await db
    .select()
    .from(registryDeployments)
    .where(eq(registryDeployments.chainId, String(chainId)))
    .limit(1);

  if (!row) {
    throw AppError.internal(
      `No active registry deployment for chain ${chainId}`
    );
  }

  return row;
};
