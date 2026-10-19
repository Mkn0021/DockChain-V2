import { keccak256 } from "viem";

import {
  canonicalJson,
  decryptWithKey,
  encryptWithKey,
} from "../../shared/crypto";

interface PackageEntry {
  ct: string; // base64 ciphertext
  leaf: `0x${string}`;
}

interface PackagePayload {
  entries: PackageEntry[];
  v: 1;
}

const toBase64 = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("base64");

const fromBase64 = (value: string): Uint8Array<ArrayBuffer> => {
  const buf = Buffer.from(value, "base64");
  const out = new Uint8Array(new ArrayBuffer(buf.length));
  out.set(buf);
  return out;
};

const encodeUtf8 = (value: string): Uint8Array<ArrayBuffer> => {
  const encoded = new TextEncoder().encode(value);
  const out = new Uint8Array(new ArrayBuffer(encoded.length));
  out.set(encoded);
  return out;
};

export interface BuiltPackage {
  bytes: Uint8Array<ArrayBuffer>;
  dataHash: `0x${string}`;
}

/**
 * Build the encrypted package for a batch.
 *
 * Each entry is the ciphertext of `{ fields, salt, claimedIssuedAt,
 * expiresAt, schemaHash }`, encrypted under the document's holderKey. The
 * package is `{ v: 1, entries: [...] }` sorted by leaf, canonicalised,
 * gzipped, then hashed.
 *
 * When `mode === "offchain_only"`, the package is empty and the dataHash is
 * keccak256 of empty bytes.
 */
export const buildPackage = async (input: {
  documents: {
    holderKey: string; // base64
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
    const key = fromBase64(doc.holderKey);
    const plaintext = encodeUtf8(canonicalJson(doc.payloadForOnChain));
    const ct = await encryptWithKey(key, plaintext);
    entries.push({ ct: toBase64(ct), leaf: doc.leaf });
  }

  entries.sort((a, b) =>
    a.leaf.toLowerCase() < b.leaf.toLowerCase() ? -1 : 1
  );

  const payload: PackagePayload = { entries, v: 1 };
  const serialized = encodeUtf8(canonicalJson(payload));
  const compressed = Bun.gzipSync(serialized);

  return {
    bytes: compressed,
    dataHash: keccak256(compressed),
  };
};

export const unpackPackage = async (
  compressed: Uint8Array<ArrayBuffer>,
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
    const key = fromBase64(holderKey);
    const ct = fromBase64(entry.ct);
    const plaintext = await decryptWithKey(key, ct);
    out.push(JSON.parse(new TextDecoder().decode(plaintext)));
  }

  return out;
};
