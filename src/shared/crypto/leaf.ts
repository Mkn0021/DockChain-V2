import { keccak256, stringToHex, toHex } from "viem";

import { bytesFromUtf8, type Bytes } from "./bytes";
import { canonicalJson } from "./canonical";

export const LEAF_DOMAIN = "DOCKCHAIN_LEAF_V1";

export interface LeafInput {
  chainId: number;
  registryAddress: `0x${string}`;
  issuerAddress: `0x${string}`;
  schemaHash: `0x${string}`;
  fields: Record<string, unknown>;
  salt: Bytes;
  claimedIssuedAt: number;
  expiresAt: number;
}

export const computeLeaf = (input: LeafInput): `0x${string}` => {
  const fieldsHash = keccak256(bytesFromUtf8(canonicalJson(input.fields)));

  const parts = [
    stringToHex(LEAF_DOMAIN),
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
