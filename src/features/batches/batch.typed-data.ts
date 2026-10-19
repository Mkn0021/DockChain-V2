export const EIP712_DOMAIN_NAME = "DockChainRegistry";
export const EIP712_DOMAIN_VERSION = "1";

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

export interface AnchorMessage {
  count: number;
  dataHash: `0x${string}`;
  issuer: `0x${string}`;
  root: `0x${string}`;
  windowEnd: bigint;
  windowStart: bigint;
}

export interface AnchorTypedData {
  domain: {
    chainId: number;
    name: string;
    verifyingContract: `0x${string}`;
    version: string;
  };
  message: AnchorMessage;
  primaryType: "Anchor";
  types: { Anchor: { name: string; type: string }[] };
}

export interface AnchorTypedDataJson {
  domain: AnchorTypedData["domain"];
  message: {
    count: number;
    dataHash: `0x${string}`;
    issuer: `0x${string}`;
    root: `0x${string}`;
    windowEnd: string;
    windowStart: string;
  };
  primaryType: "Anchor";
  types: AnchorTypedData["types"];
}

export const buildAnchorTypedData = (input: {
  chainId: number;
  count: number;
  dataHash: `0x${string}`;
  issuer: `0x${string}`;
  registryAddress: `0x${string}`;
  root: `0x${string}`;
  windowEnd: bigint;
  windowStart: bigint;
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
    windowEnd: input.windowEnd,
    windowStart: input.windowStart,
  },
  primaryType: "Anchor",
  types: { Anchor: [...ANCHOR_TYPES.Anchor] },
});

export const toJson = (typedData: AnchorTypedData): AnchorTypedDataJson => ({
  domain: typedData.domain,
  message: {
    count: typedData.message.count,
    dataHash: typedData.message.dataHash,
    issuer: typedData.message.issuer,
    root: typedData.message.root,
    windowEnd: typedData.message.windowEnd.toString(),
    windowStart: typedData.message.windowStart.toString(),
  },
  primaryType: typedData.primaryType,
  types: typedData.types,
});

export const fromJson = (json: AnchorTypedDataJson): AnchorTypedData => ({
  domain: json.domain,
  message: {
    count: json.message.count,
    dataHash: json.message.dataHash,
    issuer: json.message.issuer,
    root: json.message.root,
    windowEnd: BigInt(json.message.windowEnd),
    windowStart: BigInt(json.message.windowStart),
  },
  primaryType: json.primaryType,
  types: json.types,
});
