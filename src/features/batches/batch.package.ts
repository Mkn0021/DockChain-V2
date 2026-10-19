import { keccak256 } from "viem";

import {
  bytesFromBase64,
  bytesFromUtf8,
  bytesToBase64,
  canonicalJson,
  decryptWithKey,
  encryptWithKey,
  type Bytes,
} from "../../shared/crypto";

interface PackageEntry {
  ct: string;
  leaf: `0x${string}`;
}

interface PackagePayload {
  entries: PackageEntry[];
  v: 1;
}

export interface BuiltPackage {
  bytes: Bytes;
  dataHash: `0x${string}`;
}

export const buildPackage = async (input: {
  documents: {
    holderKey: string;
    leaf: `0x${string}`;
    payloadForOnChain: Record<string, unknown>;
  }[];
  mode: "onchain_encrypted" | "offchain_only";
}): Promise<BuiltPackage> => {
  if (input.mode === "offchain_only") {
    const empty = new Uint8Array(new ArrayBuffer(0));
    return {
      bytes: empty,
      dataHash: keccak256(empty),
    };
  }

  const entries: PackageEntry[] = [];

  for (const doc of input.documents) {
    const key = bytesFromBase64(doc.holderKey);
    const plaintext = bytesFromUtf8(canonicalJson(doc.payloadForOnChain));
    const ct = await encryptWithKey(key, plaintext);
    entries.push({ ct: bytesToBase64(ct), leaf: doc.leaf });
  }

  entries.sort((a, b) =>
    a.leaf.toLowerCase() < b.leaf.toLowerCase() ? -1 : 1
  );

  const payload: PackagePayload = { entries, v: 1 };
  const serialized = bytesFromUtf8(canonicalJson(payload));
  const compressed = Bun.gzipSync(serialized);

  return {
    bytes: compressed,
    dataHash: keccak256(compressed),
  };
};

export const unpackPackage = async (
  compressed: Bytes,
  documents: {
    holderKey: string;
    leaf: `0x${string}`;
  }[]
): Promise<Record<string, unknown>[]> => {
  const decompressed = Bun.gunzipSync(compressed);
  const payload = JSON.parse(
    new TextDecoder().decode(decompressed)
  ) as PackagePayload;

  const keyByLeaf = new Map<string, string>();
  for (const doc of documents) {
    keyByLeaf.set(doc.leaf.toLowerCase(), doc.holderKey);
  }

  const out: Record<string, unknown>[] = [];

  for (const entry of payload.entries) {
    const holderKey = keyByLeaf.get(entry.leaf.toLowerCase());
    if (!holderKey) {
      throw new Error(`No holder key for leaf ${entry.leaf}`);
    }
    const key = bytesFromBase64(holderKey);
    const ct = bytesFromBase64(entry.ct);
    const plaintext = await decryptWithKey(key, ct);
    out.push(JSON.parse(new TextDecoder().decode(plaintext)));
  }

  return out;
};
