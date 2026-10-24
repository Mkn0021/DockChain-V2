import { computeLeaf, buildTree, getProof, getRoot } from "@dockchain/verify";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { DOCUMENT_REGISTRY_ABI } from "./abi";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const ARTIFACT_PATH = join(
  REPO_ROOT,
  "contracts",
  "artifacts",
  "src",
  "DocumentRegistry.sol",
  "DocumentRegistry.json"
);

export const HARDHAT_ISSUER_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

export const HARDHAT_SECOND_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;

export interface HardhatNode {
  port: number;
  rpcCall: (method: string, params: unknown[]) => Promise<unknown>;
  rpcUrl: string;
  kill: () => Promise<void>;
}

export async function startHardhatNode(): Promise<HardhatNode> {
  const child = spawn("bunx", ["hardhat", "node", "--port", "0"], {
    cwd: join(REPO_ROOT, "contracts"),
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const port = await new Promise<number>((resolve, reject) => {
    let output = "";

    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) {
        child.stdout?.off("data", onData);
        child.stderr?.off("data", onData);
        resolve(Number(match[1]));
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== null && code !== 0) {
        reject(
          new Error(
            `hardhat node exited with code ${code} before publishing a port.\n${output}`
          )
        );
      }
    });

    setTimeout(() => {
      reject(new Error(`hardhat node did not start within 30s.\n${output}`));
    }, 30_000);
  });

  const rpcUrl = `http://127.0.0.1:${port}`;

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(rpcUrl, {
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "eth_chainId",
          params: [],
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (res.ok) break;
    } catch {
      // not ready
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  const kill = async () => {
    if (child.killed) return;
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      child.once("exit", () => resolve());
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
        resolve();
      }, 3000);
    });
  };

  const rpcCall = async (
    method: string,
    params: unknown[]
  ): Promise<unknown> => {
    const res = await fetch(rpcUrl, {
      body: JSON.stringify({ id: 1, jsonrpc: "2.0", method, params }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const json = (await res.json()) as { result?: unknown; error?: unknown };
    if (json.error) {
      throw new Error(
        `RPC call ${method} failed: ${JSON.stringify(json.error)}`
      );
    }
    return json.result;
  };

  return { kill, port, rpcCall, rpcUrl };
}

async function loadBytecode(): Promise<Hex> {
  let raw: string;
  try {
    raw = await readFile(ARTIFACT_PATH, "utf8");
  } catch {
    throw new Error(
      `Contract artifact not found at ${ARTIFACT_PATH}.\n` +
        `Run \`cd contracts && bunx hardhat build\` first, or set "pretest" in root package.json.`
    );
  }

  const parsed = JSON.parse(raw) as { bytecode?: string };
  if (!parsed.bytecode || !parsed.bytecode.startsWith("0x")) {
    throw new Error(`Artifact ${ARTIFACT_PATH} has no bytecode`);
  }
  return parsed.bytecode as Hex;
}

export interface RegistryContext {
  abi: typeof DOCUMENT_REGISTRY_ABI;
  address: Address;
  chainId: number;
  publicClient: PublicClient;
  walletClient: WalletClient;
}

export async function deployRegistry(rpcUrl: string): Promise<RegistryContext> {
  const bytecode = await loadBytecode();
  const issuer = privateKeyToAccount(HARDHAT_ISSUER_KEY);

  const publicClient = createPublicClient({ transport: http(rpcUrl) });
  const chainId = await publicClient.getChainId();

  const walletClient = createWalletClient({
    account: issuer,
    transport: http(rpcUrl),
  });

  const deployHash = await walletClient.deployContract({
    abi: DOCUMENT_REGISTRY_ABI,
    account: issuer,
    args: [],
    bytecode,
    chain: null,
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: deployHash,
  });

  if (!receipt.contractAddress) {
    throw new Error("Deployment failed: no contract address in receipt");
  }

  return {
    abi: DOCUMENT_REGISTRY_ABI,
    address: receipt.contractAddress,
    chainId,
    publicClient,
    walletClient,
  };
}

export interface BatchFixture {
  docs: Array<{
    fields: Record<string, unknown>;
    holderKey: string;
    leaf: `0x${string}`;
    salt: string;
    schemaHash: `0x${string}`;
  }>;
  leaves: `0x${string}`[];
  proofs: string[][];
  root: `0x${string}`;
}

export function buildBatch(input: {
  chainId: number;
  issuerAddress: `0x${string}`;
  registryAddress: `0x${string}`;
  schemaHash: `0x${string}`;
  seed: number;
  size: number;
}): BatchFixture {
  const leaves: `0x${string}`[] = [];
  const docs: BatchFixture["docs"] = [];

  for (let i = 0; i < input.size; i++) {
    const fields = {
      index: String(i),
      recipient_name: `Person ${i}`,
    };
    const salt = new Uint8Array(new ArrayBuffer(32));
    salt.fill(input.seed + i);
    const holderKey = new Uint8Array(new ArrayBuffer(32));
    holderKey.fill(input.seed + i + 100);

    const leaf = computeLeaf({
      chainId: input.chainId,
      claimedIssuedAt: 1_700_000_000 + i,
      expiresAt: 0,
      fields,
      issuerAddress: input.issuerAddress,
      registryAddress: input.registryAddress,
      salt,
      schemaHash: input.schemaHash,
    });

    leaves.push(leaf);
    docs.push({
      fields,
      holderKey: Buffer.from(holderKey).toString("base64"),
      leaf,
      salt: Buffer.from(salt).toString("base64"),
      schemaHash: input.schemaHash,
    });
  }

  const tree = buildTree(leaves);
  const root = getRoot(tree);
  const proofs = leaves.map((leaf) => getProof(tree, leaf));

  return { docs, leaves, proofs, root };
}

export function getSigner(privateKey: `0x${string}`) {
  return privateKeyToAccount(privateKey);
}
