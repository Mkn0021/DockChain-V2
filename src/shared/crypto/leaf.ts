import { keccak256, stringToHex, toHex } from "viem";

import { canonicalJson } from "./canonical";

export const LEAF_DOMAIN = "DOCKCHAIN_LEAF_V1";

export interface LeafInput {
  chainId: number;
  registryAddress: `0x${string}`;
  issuerAddress: `0x${string}`;
  schemaHash: `0x${string}`;
  fields: Record<string, unknown>;
  salt: Uint8Array;
  claimedIssuedAt: number; // unix seconds
  expiresAt: number; // unix seconds, 0 for no expiry
}

export const computeLeaf = (input: LeafInput): `0x${string}` => {
  const fieldsJson = canonicalJson(input.fields);
  const fieldsHash = keccak256(stringToHex(fieldsJson));

  const parts = [
    stringToHex(LEAF_DOMAIN), // dynamic string — length-prefixed implicitly by viem
    toHex(BigInt(input.chainId), { size: 32 }),
    input.registryAddress.toLowerCase() as `0x${string}`,
    input.issuerAddress.toLowerCase() as `0x${string}`,
    input.schemaHash.toLowerCase() as `0x${string}`,
    fieldsHash,
    toHex(input.salt),
    toHex(BigInt(input.claimedIssuedAt), { size: 32 }),
    toHex(BigInt(input.expiresAt), { size: 32 }),
  ];

  return keccak256(
    `0x${parts.map((p) => p.slice(2)).join("")}` as `0x${string}`
  );
};
