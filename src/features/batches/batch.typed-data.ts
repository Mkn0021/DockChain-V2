export const EIP712_DOMAIN_NAME = "DockChainRegistry";
export const EIP712_DOMAIN_VERSION = "1";

export interface AnchorTypedData {
  domain: {
    chainId: number;
    name: string;
    verifyingContract: `0x${string}`;
    version: string;
  };
  message: {
    count: number;
    dataHash: `0x${string}`;
    issuer: `0x${string}`;
    root: `0x${string}`;
    windowEnd: string;
    windowStart: string;
  };
  primaryType: "Anchor";
  types: {
    Anchor: { name: string; type: string }[];
  };
}

export const ANCHOR_TYPES = {
  Anchor: [
    { name: "root", type: "bytes32" },
    { name: "count", type: "uint32" },
    { name: "windowStart", type: "uint64" },
    { name: "windowEnd", type: "uint64" },
    { name: "dataHash", type: "bytes32" },
    { name: "issuer", type: "address" },
  ],
} as const;

export const buildAnchorTypedData = (input: {
  chainId: number;
  count: number;
  dataHash: `0x${string}`;
  issuer: `0x${string}`;
  registryAddress: `0x${string}`;
  root: `0x${string}`;
  windowEnd: number;
  windowStart: number;
}): AnchorTypedData => ({
  domain: {
    chainId: input.chainId,
    name: EIP712_DOMAIN_NAME,
    verifyingContract: input.registryAddress,
    version: EIP712_DOMAIN_VERSION,
  },
  message: {
    count: input.count,
    dataHash: input.dataHash,
    issuer: input.issuer,
    root: input.root,
    windowEnd: String(input.windowEnd),
    windowStart: String(input.windowStart),
  },
  primaryType: "Anchor",
  types: {
    Anchor: [...ANCHOR_TYPES.Anchor],
  },
});
