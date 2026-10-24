#!/usr/bin/env bun
import { readFile } from "node:fs/promises";

import { verifyBundle } from "../src/bundle";

const RPC_URLS =
  process.env.DOCKCHAIN_RPC_URLS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

const args = process.argv.slice(2);

const isHelp = args.includes("--help") || args.includes("-h");
const allowUnofficial = args.includes("--allow-unofficial");
const file = args.find((a) => !a.startsWith("-"));

if (isHelp || !file) {
  console.error(
    "Usage: dockchain-verify <bundle.json> [--allow-unofficial]\n" +
      "  Requires DOCKCHAIN_RPC_URLS (comma-separated, at least two)."
  );
  process.exit(2);
}

if (RPC_URLS.length < 2) {
  console.error(
    "DOCKCHAIN_RPC_URLS must list at least two RPC URLs (comma-separated)."
  );
  process.exit(2);
}

const raw = await readFile(file, "utf8");
let parsed: unknown;
try {
  parsed = JSON.parse(raw);
} catch (error) {
  console.error(
    `Failed to parse ${file}: ${error instanceof Error ? error.message : "unknown error"}`
  );
  process.exit(2);
}

const result = await verifyBundle(parsed, {
  allowUnofficialRegistry: allowUnofficial,
  rpcUrls: RPC_URLS,
});

console.log(JSON.stringify(result, null, 2));

process.exit(result.status === "valid" ? 0 : 1);
