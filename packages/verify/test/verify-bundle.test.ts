import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createWalletClient, http, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  HARDHAT_ISSUER_KEY,
  deployRegistry,
  startHardhatNode,
  type HardhatNode,
  type RegistryContext,
} from "../../../tests/chain/helpers";
import { DOCUMENT_REGISTRY_ABI } from "../src/abi";
import { verifyBundle } from "../src/bundle";
import { computeLeaf } from "../src/leaf";
import { buildTree, getProof, getRoot } from "../src/merkle";

describe("verifyBundle", () => {
  let node: HardhatNode;
  let registry: RegistryContext;
  let issuer: ReturnType<typeof privateKeyToAccount>;
  let rpcUrls: string[];
  let callCounter = 0;

  beforeAll(async () => {
    node = await startHardhatNode();
    registry = await deployRegistry(node.rpcUrl);
    issuer = privateKeyToAccount(HARDHAT_ISSUER_KEY);
    rpcUrls = [node.rpcUrl, node.rpcUrl];
  }, 60_000);

  afterAll(async () => {
    await node.kill();
  });

  async function anchorBundle(input: {
    revoked?: boolean;
    fields?: Record<string, unknown>;
  }) {
    callCounter += 1;
    const fields = input.fields ?? { course_title: "CS" };
    const salt = new Uint8Array(new ArrayBuffer(32));
    salt.fill(1);
    const claimedIssuedAt = Math.floor(Date.now() / 1000) - 10 - callCounter;
    const expiresAt = 0;
    const schemaHash = `0x${"11".repeat(32)}` as `0x${string}`;

    const leaf = computeLeaf({
      chainId: 31_337,
      claimedIssuedAt,
      expiresAt,
      fields,
      issuerAddress: issuer.address,
      registryAddress: registry.address,
      salt,
      schemaHash,
    });

    const tree = buildTree([leaf]);
    const root = getRoot(tree);
    const proof = getProof(tree, leaf);

    const wallet = createWalletClient({
      account: issuer,
      transport: http(node.rpcUrl),
    });

    const domain = {
      chainId: 31_337,
      name: "DockChainRegistry",
      verifyingContract: registry.address,
      version: "1",
    } as const;
    const types = {
      Anchor: [
        { name: "root", type: "bytes32" },
        { name: "count", type: "uint32" },
        { name: "windowStart", type: "uint64" },
        { name: "windowEnd", type: "uint64" },
        { name: "dataHash", type: "bytes32" },
        { name: "issuer", type: "address" },
      ],
    } as const;

    const windowStart = BigInt(claimedIssuedAt);
    const windowEnd = BigInt(claimedIssuedAt + 10);
    const data = "0x" as `0x${string}`;
    const dataHash = keccak256(data);

    const signature = await wallet.signTypedData({
      account: issuer,
      domain,
      message: {
        count: 1,
        dataHash,
        issuer: issuer.address,
        root,
        windowEnd,
        windowStart,
      },
      primaryType: "Anchor",
      types,
    });

    const anchorHash = await wallet.writeContract({
      abi: DOCUMENT_REGISTRY_ABI,
      account: issuer,
      address: registry.address,
      args: [root, 1, windowStart, windowEnd, issuer.address, data, signature],
      chain: null,
      functionName: "anchor",
    });
    await registry.publicClient.waitForTransactionReceipt({ hash: anchorHash });
    await node.rpcCall("hardhat_mine", ["0x2"]);

    if (input.revoked) {
      const revokeHash = await wallet.writeContract({
        abi: DOCUMENT_REGISTRY_ABI,
        account: issuer,
        address: registry.address,
        args: [root, leaf, proof as `0x${string}`[], 0],
        chain: null,
        functionName: "revoke",
      });
      await registry.publicClient.waitForTransactionReceipt({
        hash: revokeHash,
      });
      await node.rpcCall("hardhat_mine", ["0x2"]);
    }

    return {
      blockNumber: null,
      chainId: 31_337,
      claimedIssuedAt,
      expiresAt,
      fields,
      holderKey: "test-holder-key",
      issuer: issuer.address,
      leaf,
      leafIndex: 0,
      proof,
      recipient: null,
      registry: registry.address,
      root,
      salt: Buffer.from(salt).toString("base64"),
      schemaHash,
      txHash: anchorHash,
      version: 1 as const,
      windowEnd: Number(windowEnd),
      windowStart: Number(windowStart),
    };
  }

  it("returns valid for a well-formed anchored bundle", async () => {
    const bundle = await anchorBundle({});
    const resolver = async () => [
      [`v=1; chain=31337; addr=${issuer.address.toLowerCase()}`],
    ];
    const result = await verifyBundle(
      { ...bundle, issuerDomain: "example.test" },
      { allowUnofficialRegistry: true, resolver, rpcUrls }
    );
    expect(result.status).toBe("valid");
    expect(result.checks.every((c) => c.ok)).toBe(true);
  });

  it("returns invalid when a field is tampered", async () => {
    const bundle = await anchorBundle({});
    const tampered = { ...bundle, fields: { course_title: "EE" } };
    const result = await verifyBundle(tampered, {
      allowUnofficialRegistry: true,
      rpcUrls,
    });
    expect(result.status).toBe("invalid");
    expect(result.checks.find((c) => c.name === "leaf-match")?.ok).toBe(false);
  });

  it("returns invalid when the registry is not official and not allowed", async () => {
    const bundle = await anchorBundle({});
    const result = await verifyBundle(bundle, { rpcUrls });
    expect(result.status).toBe("invalid");
    expect(result.checks.find((c) => c.name === "official-registry")?.ok).toBe(
      false
    );
  });

  it("returns revoked for a revoked leaf", async () => {
    const bundle = await anchorBundle({ revoked: true });
    const result = await verifyBundle(bundle, {
      allowUnofficialRegistry: true,
      rpcUrls,
    });
    expect(result.status).toBe("revoked");
  });

  it("returns inconclusive when an RPC is unreachable", async () => {
    const bundle = await anchorBundle({});
    const result = await verifyBundle(bundle, {
      allowUnofficialRegistry: true,
      rpcUrls: [node.rpcUrl, "http://127.0.0.1:1"],
    });
    expect(result.status).toBe("inconclusive");
  });

  it("returns inconclusive when the caller provides fewer than two RPCs", async () => {
    const bundle = await anchorBundle({});
    const result = await verifyBundle(bundle, {
      allowUnofficialRegistry: true,
      rpcUrls: [node.rpcUrl],
    });
    expect(result.status).toBe("inconclusive");
    expect(result.checks.find((c) => c.name === "rpcs")?.ok).toBe(false);
  });

  it("fails the issuer-domain check when the TXT record does not exist", async () => {
    const bundle = await anchorBundle({});
    const result = await verifyBundle(
      { ...bundle, issuerDomain: "nonexistent.invalid" },
      { allowUnofficialRegistry: true, rpcUrls }
    );
    expect(result.checks.find((c) => c.name === "issuer-domain")?.ok).toBe(
      false
    );
  });
});
