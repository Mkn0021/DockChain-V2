import { createChainClient } from "../src/chain/client";
import { resetIndexerFrom } from "../src/chain/indexer";
import { env } from "../src/config";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const main = async (): Promise<void> => {
  if (env.REGISTRY_ADDRESS === ZERO_ADDRESS) {
    console.error("REGISTRY_ADDRESS is not set");
    process.exit(1);
  }

  const fromArg = process.argv.find((arg) => arg.startsWith("--from="));
  if (!fromArg) {
    console.error("Usage: bun run chain:reindex --from=<block>");
    process.exit(1);
  }

  const from = BigInt(fromArg.split("=")[1] ?? "0");
  if (from < 0n) {
    console.error("Block number must be non-negative");
    process.exit(1);
  }

  const client = createChainClient();

  await client.publicClient.getBlock({ blockNumber: from });

  await resetIndexerFrom(env.CHAIN_ID, from);

  console.log(
    `Indexer for chain ${env.CHAIN_ID} reset. Next run starts from block ${from}.`
  );
};

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
