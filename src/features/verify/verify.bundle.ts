import type { VerificationStatus } from "../../chain/status";

import { env } from "../../config";
import { computeLeaf, bytesFromBase64 } from "../../shared/crypto";
import { AppError } from "../../shared/errors";
import { verifyProof } from "../../shared/merkle";

export interface BundleCheck {
  detail?: string;
  name: string;
  ok: boolean;
}

export interface ParsedBundle {
  chainId: number;
  claimedIssuedAt: number;
  expiresAt: number;
  fields: Record<string, unknown>;
  holderKey?: string;
  issuer: `0x${string}`;
  leaf: `0x${string}`;
  proof: string[];
  recipient?: { email: string; name: string } | null;
  registry: `0x${string}`;
  root: `0x${string}`;
  salt: string;
  schemaHash: `0x${string}`;
  version?: number;
}

export interface VerifyResponseShape {
  anchor: {
    blockNumber: string | null;
    blockTimestamp: number | null;
    chainId: number;
    registry: string;
    root: string;
    txHash: string | null;
  } | null;
  claimedIssuedAt: number | null;
  expiresAt: number | null;
  issuer: {
    address: string;
    domain: string | null;
    domainVerified: boolean;
    organizationName: string | null;
  };
  revocation: {
    blockTimestamp: number | null;
    reasonCode: string;
    txHash: string | null;
  } | null;
  source: "chain" | "index";
  status: VerificationStatus;
}

const HEX_32 = /^0x[0-9a-fA-F]{64}$/;
const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

interface FieldRule {
  key: string;
  validate: (value: unknown) => boolean;
}

const isHex32 = (value: unknown): value is string =>
  typeof value === "string" && HEX_32.test(value);

const isHexAddress = (value: unknown): value is string =>
  typeof value === "string" && HEX_ADDRESS.test(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isHex32Array = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isHex32);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const BUNDLE_RULES: FieldRule[] = [
  { key: "chainId", validate: isFiniteNumber },
  { key: "registry", validate: isHexAddress },
  { key: "issuer", validate: isHexAddress },
  { key: "root", validate: isHex32 },
  { key: "leaf", validate: isHex32 },
  { key: "schemaHash", validate: isHex32 },
  {
    key: "salt",
    validate: (value) => typeof value === "string" && value.length > 0,
  },
  { key: "proof", validate: isHex32Array },
  { key: "fields", validate: isPlainObject },
  { key: "claimedIssuedAt", validate: isFiniteNumber },
  { key: "expiresAt", validate: isFiniteNumber },
];

const collectIssues = (raw: Record<string, unknown>): string[] =>
  BUNDLE_RULES.filter((rule) => !rule.validate(raw[rule.key])).map(
    (rule) => rule.key
  );

export const parseBundle = (raw: Record<string, unknown>): ParsedBundle => {
  const issues = collectIssues(raw);
  if (issues.length > 0) {
    throw AppError.validation(
      `Bundle is missing or has invalid fields: ${issues.join(", ")}`
    );
  }

  return {
    chainId: raw.chainId as number,
    claimedIssuedAt: raw.claimedIssuedAt as number,
    expiresAt: raw.expiresAt as number,
    fields: raw.fields as Record<string, unknown>,
    holderKey: typeof raw.holderKey === "string" ? raw.holderKey : undefined,
    issuer: raw.issuer as `0x${string}`,
    leaf: raw.leaf as `0x${string}`,
    proof: raw.proof as string[],
    recipient: isPlainObject(raw.recipient)
      ? (raw.recipient as { email: string; name: string })
      : null,
    registry: raw.registry as `0x${string}`,
    root: raw.root as `0x${string}`,
    salt: raw.salt as string,
    schemaHash: raw.schemaHash as `0x${string}`,
    version: isFiniteNumber(raw.version) ? raw.version : undefined,
  };
};

export const invalidBundleResponse = (
  checks: BundleCheck[],
  detail: string
): VerifyResponseShape & { checks: BundleCheck[] } => ({
  anchor: null,
  checks: [...checks, { detail, name: "shape", ok: false }],
  claimedIssuedAt: null,
  expiresAt: null,
  issuer: {
    address: "",
    domain: null,
    domainVerified: false,
    organizationName: null,
  },
  revocation: null,
  source: "chain",
  status: "invalid",
});

export const chainNotConfiguredResponse = (
  checks: BundleCheck[],
  bundle: ParsedBundle
): VerifyResponseShape & { checks: BundleCheck[] } => ({
  anchor: null,
  checks: [
    ...checks,
    {
      detail: "REGISTRY_ADDRESS is not configured",
      name: "registry-configured",
      ok: false,
    },
  ],
  claimedIssuedAt: bundle.claimedIssuedAt,
  expiresAt: bundle.expiresAt || null,
  issuer: {
    address: bundle.issuer,
    domain: null,
    domainVerified: false,
    organizationName: null,
  },
  revocation: null,
  source: "chain",
  status: "invalid",
});

export const checkChainId = (bundle: ParsedBundle): BundleCheck =>
  bundle.chainId === env.CHAIN_ID
    ? { name: "chain-id", ok: true }
    : {
        detail: `bundle chainId ${bundle.chainId} != registry chainId ${env.CHAIN_ID}`,
        name: "chain-id",
        ok: false,
      };

export const checkRegistryAddress = (bundle: ParsedBundle): BundleCheck =>
  bundle.registry.toLowerCase() === env.REGISTRY_ADDRESS.toLowerCase()
    ? { name: "registry-address", ok: true }
    : {
        detail: "bundle registry does not match the configured registry",
        name: "registry-address",
        ok: false,
      };

export const rebuildLeaf = (
  bundle: ParsedBundle
): { check: BundleCheck; leaf: `0x${string}` | null } => {
  try {
    const rebuilt = computeLeaf({
      chainId: bundle.chainId,
      claimedIssuedAt: bundle.claimedIssuedAt,
      expiresAt: bundle.expiresAt,
      fields: bundle.fields,
      issuerAddress: bundle.issuer,
      registryAddress: bundle.registry,
      salt: bytesFromBase64(bundle.salt),
      schemaHash: bundle.schemaHash,
    });

    if (rebuilt.toLowerCase() === bundle.leaf.toLowerCase()) {
      return { check: { name: "leaf-match", ok: true }, leaf: rebuilt };
    }

    return {
      check: {
        detail: "rebuilt leaf does not match the bundle leaf",
        name: "leaf-match",
        ok: false,
      },
      leaf: rebuilt,
    };
  } catch (error) {
    return {
      check: {
        detail: error instanceof Error ? error.message : "leaf rebuild failed",
        name: "leaf-match",
        ok: false,
      },
      leaf: null,
    };
  }
};

export const checkMerkleProof = (
  bundle: ParsedBundle,
  rebuiltLeaf: `0x${string}` | null
): BundleCheck | null => {
  if (!rebuiltLeaf) {
    return null;
  }
  try {
    const ok = verifyProof(
      bundle.root,
      rebuiltLeaf,
      bundle.proof as `0x${string}`[]
    );
    return {
      detail: ok ? undefined : "Merkle proof does not verify",
      name: "merkle-proof",
      ok,
    };
  } catch (error) {
    return {
      detail:
        error instanceof Error ? error.message : "Merkle proof check failed",
      name: "merkle-proof",
      ok: false,
    };
  }
};

export const checkClaimedIssuedAt = (
  bundle: ParsedBundle,
  anchorTimestamp: number
): BundleCheck | null => {
  if (anchorTimestamp <= 0) {
    return null;
  }
  const ok = bundle.claimedIssuedAt <= anchorTimestamp;
  return {
    detail: ok
      ? undefined
      : `claimedIssuedAt ${bundle.claimedIssuedAt} > anchor ${anchorTimestamp}`,
    name: "claimed-issued-at",
    ok,
  };
};

export const checkNotExpired = (
  bundle: ParsedBundle,
  now: number
): BundleCheck => {
  const notExpired = bundle.expiresAt === 0 || bundle.expiresAt > now;
  return {
    detail: notExpired ? undefined : `expired at ${bundle.expiresAt}`,
    name: "not-expired",
    ok: notExpired,
  };
};
