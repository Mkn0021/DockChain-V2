import { decryptPayload } from "./document.payload";

interface BundleDocument {
  id: string;
  organizationId: string;
  templateVersionId: string;
  issuerWalletId: string;
  payloadEnc: string;
  kekId: string;
  leaf: string | null;
  leafIndex: string | null;
  merkleProof: unknown;
  claimedIssuedAt: Date | null;
  expiresAt: Date | null;
  externalRef: string | null;
}

interface BundleBatch {
  chainId: string;
  dataHash: string | null;
  issuerWalletId: string;
  registryAddress: string;
  root: string | null;
  txHash: string | null;
  blockNumber: string | null;
  windowEnd: Date | null;
  windowStart: Date | null;
}

interface BundleWallet {
  address: string;
  domain: string | null;
}

interface BundleTemplateVersion {
  schemaHash: string | null;
}

export interface ProofBundle {
  version: 1;
  chainId: number;
  registry: `0x${string}`;
  issuer: `0x${string}`;
  issuerDomain?: string;
  root: `0x${string}`;
  leaf: `0x${string}`;
  leafIndex: number;
  proof: string[];
  holderKey: string;
  salt: string;
  fields: Record<string, unknown>;
  recipient: { email: string; name: string } | null;
  claimedIssuedAt: number;
  expiresAt: number;
  schemaHash: `0x${string}`;
  txHash: string | null;
  blockNumber: string | null;
  windowStart: number;
  windowEnd: number;
}

const toUnix = (date: Date | null): number =>
  date ? Math.floor(date.getTime() / 1000) : 0;

export const buildBundle = async (input: {
  document: BundleDocument;
  batch: BundleBatch;
  wallet: BundleWallet;
  templateVersion: BundleTemplateVersion;
}): Promise<ProofBundle> => {
  const { document, batch, wallet, templateVersion } = input;

  if (!document.leaf) {
    throw new Error("Document has no leaf");
  }
  if (document.leafIndex === null) {
    throw new Error("Document has no leafIndex");
  }
  if (!document.merkleProof) {
    throw new Error("Document has no merkleProof");
  }
  if (!batch.root) {
    throw new Error("Batch has no root");
  }
  if (!templateVersion.schemaHash) {
    throw new Error("Template version has no schemaHash");
  }

  const payload = await decryptPayload(document.payloadEnc, document.kekId);

  return {
    blockNumber: batch.blockNumber,
    chainId: Number(batch.chainId),
    claimedIssuedAt: toUnix(document.claimedIssuedAt),
    expiresAt: toUnix(document.expiresAt),
    fields: payload.fields,
    holderKey: payload.holderKey,
    issuer: wallet.address as `0x${string}`,
    issuerDomain: wallet.domain ?? undefined,
    leaf: document.leaf as `0x${string}`,
    leafIndex: Number(document.leafIndex),
    proof: document.merkleProof as string[],
    recipient: payload.recipient,
    registry: batch.registryAddress as `0x${string}`,
    root: batch.root as `0x${string}`,
    salt: payload.salt,
    schemaHash: templateVersion.schemaHash as `0x${string}`,
    txHash: batch.txHash,
    version: 1,
    windowEnd: toUnix(batch.windowEnd),
    windowStart: toUnix(batch.windowStart),
  };
};
