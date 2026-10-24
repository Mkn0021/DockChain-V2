export type { Bytes } from "./bytes";
export {
  bytesFrom,
  bytesFromBase64,
  bytesFromLength,
  bytesFromUtf8,
  bytesToArrayBuffer,
  bytesToBase64,
  bytesToUtf8,
  emptyBytes,
} from "./bytes";
export { canonicalBytes, canonicalJson } from "./canonical";
export { computeLeaf, LEAF_DOMAIN, type LeafInput } from "./leaf";
export {
  buildTree,
  deserializeTree,
  getProof,
  getRoot,
  serializeTree,
  verifyProof,
  type MerkleProofEntry,
  type MerkleTree,
} from "./merkle";
export {
  computeVerificationStatus,
  type ComputeVerificationStatusInput,
  type VerificationStatus,
} from "./status";
export { DOCUMENT_REGISTRY_ABI } from "./abi";
export {
  OFFICIAL_REGISTRIES,
  verifyBundle,
  type BundleCheck,
  type ProofBundleV1,
  type VerifyBundleOptions,
  type VerifyBundleResult,
} from "./bundle";
export {
  defaultTxtResolver,
  lookupDockchainRecords,
  parseDockchainRecord,
  verifyIssuerDomain,
  type ParsedDockchainRecord,
  type TxtResolver,
} from "./dns";
