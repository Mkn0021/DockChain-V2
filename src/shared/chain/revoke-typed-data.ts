export const REVOKE_DOMAIN_NAME = "DockChainRegistry";
export const REVOKE_DOMAIN_VERSION = "1";

export const REVOKE_TYPES = {
  Revoke: [
    { name: "root", type: "bytes32" },
    { name: "leaf", type: "bytes32" },
    { name: "reason", type: "uint8" },
    { name: "issuer", type: "address" },
  ],
} as const;

export type RevokeMessage = Record<string, unknown> & {
  issuer: `0x${string}`;
  leaf: `0x${string}`;
  reason: number;
  root: `0x${string}`;
};

export interface RevokeTypedData {
  domain: {
    chainId: number;
    name: string;
    verifyingContract: `0x${string}`;
    version: string;
  };
  message: RevokeMessage;
  primaryType: "Revoke";
  types: { Revoke: { name: string; type: string }[] };
}

export interface RevokeTypedDataJson {
  domain: RevokeTypedData["domain"];
  message: RevokeMessage;
  primaryType: "Revoke";
  types: RevokeTypedData["types"];
}

export const buildRevokeTypedData = (input: {
  chainId: number;
  issuer: `0x${string}`;
  leaf: `0x${string}`;
  reason: number;
  registryAddress: `0x${string}`;
  root: `0x${string}`;
}): RevokeTypedData => ({
  domain: {
    chainId: input.chainId,
    name: REVOKE_DOMAIN_NAME,
    verifyingContract: input.registryAddress,
    version: REVOKE_DOMAIN_VERSION,
  },
  message: {
    issuer: input.issuer,
    leaf: input.leaf,
    reason: input.reason,
    root: input.root,
  },
  primaryType: "Revoke",
  types: { Revoke: [...REVOKE_TYPES.Revoke] },
});
