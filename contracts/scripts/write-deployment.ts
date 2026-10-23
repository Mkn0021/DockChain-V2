import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { keccak256, toHex } from "viem";

const CONTRACTS_ROOT = join(import.meta.dirname, "..");
const CHAIN_ID = process.env.CHAIN_ID ?? "31337";

const IGNITION_DIR = join(
  CONTRACTS_ROOT,
  "ignition",
  "deployments",
  `chain-${CHAIN_ID}`
);
const DEPLOYMENTS_DIR = join(CONTRACTS_ROOT, "deployments");
const ABI_DIR = join(CONTRACTS_ROOT, "abi");
const ARTIFACT_PATH = join(
  CONTRACTS_ROOT,
  "artifacts",
  "src",
  "DocumentRegistry.sol",
  "DocumentRegistry.json"
);

interface JournalEntry {
  type: string;
  futureId?: string;
  txHash?: string;
  receipt?: {
    blockNumber?: number;
  };
}

const readDeploymentTx = async (): Promise<{
  blockNumber: number;
  txHash: `0x${string}`;
}> => {
  const journalPath = join(IGNITION_DIR, "journal.jsonl");
  const raw = await readFile(journalPath, "utf8");
  const lines = raw.split("\n").filter((line) => line.trim().length > 0);

  let txHash: `0x${string}` | null = null;
  let blockNumber: number | null = null;

  for (const line of lines) {
    const entry = JSON.parse(line) as JournalEntry;

    const isDeployEntry =
      entry.type === "TRANSACTION_CONFIRM" ||
      entry.type === "ONCHAIN_EXECUTION";

    if (
      isDeployEntry &&
      entry.futureId?.includes("DocumentRegistry") &&
      entry.txHash &&
      entry.receipt?.blockNumber !== undefined
    ) {
      txHash = entry.txHash as `0x${string}`;
      ({ blockNumber } = entry.receipt);
    }
  }

  if (!txHash || blockNumber === null) {
    throw new Error(
      `Could not find deploy transaction for DocumentRegistry in ${journalPath}`
    );
  }

  return { blockNumber, txHash };
};

const main = async (): Promise<void> => {
  const addresses = JSON.parse(
    await readFile(join(IGNITION_DIR, "deployed_addresses.json"), "utf8")
  ) as Record<string, string>;

  const registryAddress = addresses["DocumentRegistryModule#DocumentRegistry"];

  if (!registryAddress) {
    throw new Error(
      `DocumentRegistry not found in ${IGNITION_DIR}/deployed_addresses.json`
    );
  }

  const { blockNumber, txHash } = await readDeploymentTx();

  const artifact = JSON.parse(await readFile(ARTIFACT_PATH, "utf8")) as {
    abi: unknown;
  };

  const abiJson = JSON.stringify(artifact.abi);
  const abiHash = keccak256(toHex(abiJson));

  const deployment = {
    abiHash,
    address: registryAddress,
    chainId: Number(CHAIN_ID),
    deployTxHash: txHash,
    deployedBlock: blockNumber,
    local: Number(CHAIN_ID) === 31_337,
    version: "1.0.0",
  };

  await mkdir(DEPLOYMENTS_DIR, { recursive: true });
  await writeFile(
    join(DEPLOYMENTS_DIR, `${CHAIN_ID}.json`),
    JSON.stringify(deployment, null, 2)
  );

  await mkdir(ABI_DIR, { recursive: true });
  await writeFile(
    join(ABI_DIR, "DocumentRegistry.json"),
    JSON.stringify(artifact.abi, null, 2)
  );

  console.log(`Deployment manifest written for chain ${CHAIN_ID}`);
  console.log(`  address:      ${registryAddress}`);
  console.log(`  txHash:       ${txHash}`);
  console.log(`  blockNumber:  ${blockNumber}`);
  console.log(`ABI exported to ${join(ABI_DIR, "DocumentRegistry.json")}`);
};

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
