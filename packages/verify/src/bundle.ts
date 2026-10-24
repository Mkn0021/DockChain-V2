import {
  createPublicClient,
  http,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";

import { DOCUMENT_REGISTRY_ABI } from "./abi";
import { bytesFromBase64 } from "./bytes";
import { verifyIssuerDomain, type TxtResolver } from "./dns";
import { computeLeaf } from "./leaf";
import { verifyProof } from "./merkle";
import { computeVerificationStatus, type VerificationStatus } from "./status";

export const OFFICIAL_REGISTRIES: Record<number, Address> = {};

export interface ProofBundleV1 {
  version: 1;
  chainId: number;
  registry: Address;
  issuer: Address;
  issuerDomain?: string;
  root: Hex;
  leaf: Hex;
  leafIndex: number;
  proof: string[];
  holderKey: string;
  salt: string;
  fields: Record<string, unknown>;
  recipient: { email: string; name: string } | null;
  claimedIssuedAt: number;
  expiresAt: number;
  schemaHash: Hex;
  txHash: string | null;
  blockNumber: string | null;
  windowStart: number;
  windowEnd: number;
}

export interface BundleCheck {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface VerifyBundleOptions {
  rpcUrls: string[];
  confirmedDepth?: number;
  allowUnofficialRegistry?: boolean;
  resolver?: TxtResolver;
  now?: number;
}

export interface VerifyBundleResult {
  status: VerificationStatus | "inconclusive";
  checks: BundleCheck[];
  anchorTimestamp: number | null;
  compromisedFrom: number | null;
  revokedAt: number | null;
}

const HEX_32 = /^0x[0-9a-fA-F]{64}$/;
const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

interface Rule {
  key: string;
  isValid: (value: unknown) => boolean;
  error: string;
}

const isString = (v: unknown): v is string => typeof v === "string";

const isHex32 = (v: unknown): v is string =>
  typeof v === "string" && HEX_32.test(v);

const isHexAddress = (v: unknown): v is string =>
  typeof v === "string" && HEX_ADDRESS.test(v);

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const isHex32Array = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(isHex32);

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0;

const BUNDLE_RULES: Rule[] = [
  {
    error: "chainId missing or invalid",
    isValid: isFiniteNumber,
    key: "chainId",
  },
  {
    error: "registry missing or invalid",
    isValid: isHexAddress,
    key: "registry",
  },
  { error: "issuer missing or invalid", isValid: isHexAddress, key: "issuer" },
  { error: "root missing or invalid", isValid: isHex32, key: "root" },
  { error: "leaf missing or invalid", isValid: isHex32, key: "leaf" },
  {
    error: "schemaHash missing or invalid",
    isValid: isHex32,
    key: "schemaHash",
  },
  { error: "salt missing", isValid: isNonEmptyString, key: "salt" },
  { error: "proof missing or invalid", isValid: isHex32Array, key: "proof" },
  { error: "fields missing or invalid", isValid: isPlainObject, key: "fields" },
  {
    error: "claimedIssuedAt missing or invalid",
    isValid: isFiniteNumber,
    key: "claimedIssuedAt",
  },
  {
    error: "expiresAt missing or invalid",
    isValid: isFiniteNumber,
    key: "expiresAt",
  },
  {
    error: "leafIndex missing or invalid",
    isValid: isFiniteNumber,
    key: "leafIndex",
  },
  {
    error: "windowStart missing or invalid",
    isValid: isFiniteNumber,
    key: "windowStart",
  },
  {
    error: "windowEnd missing or invalid",
    isValid: isFiniteNumber,
    key: "windowEnd",
  },
  { error: "holderKey missing", isValid: isNonEmptyString, key: "holderKey" },
];

const collectBundleIssues = (b: Record<string, unknown>): string[] =>
  BUNDLE_RULES.filter((rule) => !rule.isValid(b[rule.key])).map(
    (rule) => rule.error
  );

const assembleBundle = (b: Record<string, unknown>): ProofBundleV1 => ({
  blockNumber: isString(b.blockNumber) ? b.blockNumber : null,
  chainId: b.chainId as number,
  claimedIssuedAt: b.claimedIssuedAt as number,
  expiresAt: b.expiresAt as number,
  fields: b.fields as Record<string, unknown>,
  holderKey: b.holderKey as string,
  issuer: b.issuer as Address,
  issuerDomain: isString(b.issuerDomain) ? b.issuerDomain : undefined,
  leaf: b.leaf as Hex,
  leafIndex: b.leafIndex as number,
  proof: b.proof as string[],
  recipient: isPlainObject(b.recipient)
    ? (b.recipient as { email: string; name: string })
    : null,
  registry: b.registry as Address,
  root: b.root as Hex,
  salt: b.salt as string,
  schemaHash: b.schemaHash as Hex,
  txHash: isString(b.txHash) ? b.txHash : null,
  version: 1,
  windowEnd: b.windowEnd as number,
  windowStart: b.windowStart as number,
});

const parseBundle = (
  raw: unknown
): { bundle: ProofBundleV1 } | { error: string } => {
  if (!isPlainObject(raw)) {
    return { error: "bundle is not an object" };
  }
  if (raw.version !== 1) {
    return { error: "version must be 1" };
  }
  const issues = collectBundleIssues(raw);
  if (issues.length > 0) {
    return { error: issues[0] as string };
  }
  return { bundle: assembleBundle(raw) };
};

const buildClient = (url: string): PublicClient =>
  createPublicClient({
    cacheTime: 0,
    transport: http(url, { retryCount: 1, timeout: 10_000 }),
  });

interface ChainRead {
  anchorTimestamp: number;
  compromisedFrom: number;
  revocationReason: number;
  revokedAt: number;
}

const readChainState = async (input: {
  client: PublicClient;
  registry: Address;
  issuer: Address;
  root: Hex;
  leaf: Hex;
  confirmedDepth: number;
}): Promise<ChainRead> => {
  const { client, registry, issuer, root, leaf, confirmedDepth } = input;

  const head = await client.getBlockNumber();
  if (head < BigInt(confirmedDepth)) {
    throw new Error(
      `chain head ${head} below confirmed depth ${confirmedDepth}`
    );
  }

  const [anchor, revocation, cutoff] = await Promise.all([
    client.readContract({
      abi: DOCUMENT_REGISTRY_ABI,
      address: registry,
      args: [issuer, root],
      functionName: "anchorOf",
    }) as Promise<{ timestamp: bigint; count: number }>,
    client.readContract({
      abi: DOCUMENT_REGISTRY_ABI,
      address: registry,
      args: [issuer, leaf],
      functionName: "revocationOf",
    }) as Promise<{ timestamp: bigint; reason: number }>,
    client.readContract({
      abi: DOCUMENT_REGISTRY_ABI,
      address: registry,
      args: [issuer],
      functionName: "compromisedFrom",
    }) as Promise<bigint>,
  ]);

  return {
    anchorTimestamp: Number(anchor.timestamp),
    compromisedFrom: Number(cutoff),
    revocationReason: revocation.reason,
    revokedAt: Number(revocation.timestamp),
  };
};

type ConsensusResult =
  | { ok: true; state: ChainRead }
  | { ok: false; check: BundleCheck; inconclusive: boolean };

const gatherConsensus = async (
  rpcUrls: string[],
  input: Omit<Parameters<typeof readChainState>[0], "client">
): Promise<ConsensusResult> => {
  const reads = await Promise.allSettled(
    rpcUrls.map((url) => readChainState({ ...input, client: buildClient(url) }))
  );

  const successful = reads
    .filter(
      (r): r is PromiseFulfilledResult<ChainRead> => r.status === "fulfilled"
    )
    .map((r) => r.value);

  if (successful.length < 2) {
    return {
      check: {
        detail: `only ${successful.length} of ${rpcUrls.length} RPCs responded`,
        name: "rpc-reads",
        ok: false,
      },
      inconclusive: true,
      ok: false,
    };
  }

  const signatures = new Set(
    successful.map(
      (r) => `${r.anchorTimestamp}:${r.revokedAt}:${r.compromisedFrom}`
    )
  );
  if (signatures.size !== 1) {
    return {
      check: {
        detail: "RPCs disagree on chain state",
        name: "rpc-consensus",
        ok: false,
      },
      inconclusive: true,
      ok: false,
    };
  }

  return { ok: true, state: successful[0] as ChainRead };
};

const failResult = (
  checks: BundleCheck[],
  status: "invalid" | "inconclusive"
): VerifyBundleResult => ({
  anchorTimestamp: null,
  checks,
  compromisedFrom: null,
  revokedAt: null,
  status,
});

const checkRegistry = (
  bundle: ProofBundleV1,
  allowUnofficial: boolean
): BundleCheck => {
  const expected = OFFICIAL_REGISTRIES[bundle.chainId];
  const isOfficial =
    expected !== undefined &&
    expected.toLowerCase() === bundle.registry.toLowerCase();

  if (isOfficial) {
    return { name: "official-registry", ok: true };
  }
  if (allowUnofficial) {
    return {
      detail: "unofficial registry allowed by caller",
      name: "official-registry",
      ok: true,
    };
  }
  return {
    detail: `unknown registry ${bundle.registry} on chain ${bundle.chainId}`,
    name: "official-registry",
    ok: false,
  };
};

const checkDomain = async (
  bundle: ProofBundleV1,
  resolver: TxtResolver | undefined
): Promise<BundleCheck> => {
  if (!bundle.issuerDomain) {
    return {
      detail: "bundle has no issuerDomain hint",
      name: "issuer-domain",
      ok: false,
    };
  }
  const ok = await verifyIssuerDomain({
    chainId: bundle.chainId,
    domain: bundle.issuerDomain,
    issuerAddress: bundle.issuer,
    resolver,
  });
  return {
    detail: ok
      ? undefined
      : `no _dockchain.${bundle.issuerDomain} TXT record lists ${bundle.issuer}`,
    name: "issuer-domain",
    ok,
  };
};

const rebuildLeaf = (
  bundle: ProofBundleV1
): { ok: true; leaf: Hex } | { ok: false; check: BundleCheck } => {
  try {
    const leaf = computeLeaf({
      chainId: bundle.chainId,
      claimedIssuedAt: bundle.claimedIssuedAt,
      expiresAt: bundle.expiresAt,
      fields: bundle.fields,
      issuerAddress: bundle.issuer,
      registryAddress: bundle.registry,
      salt: bytesFromBase64(bundle.salt),
      schemaHash: bundle.schemaHash,
    });
    if (leaf.toLowerCase() !== bundle.leaf.toLowerCase()) {
      return {
        check: {
          detail: "rebuilt leaf does not match the bundle leaf",
          name: "leaf-match",
          ok: false,
        },
        ok: false,
      };
    }
    return { leaf, ok: true };
  } catch (error) {
    return {
      check: {
        detail: error instanceof Error ? error.message : "leaf rebuild failed",
        name: "leaf-match",
        ok: false,
      },
      ok: false,
    };
  }
};

export const verifyBundle = async (
  raw: unknown,
  options: VerifyBundleOptions
): Promise<VerifyBundleResult> => {
  const checks: BundleCheck[] = [];

  const parsed = parseBundle(raw);
  if ("error" in parsed) {
    checks.push({ detail: parsed.error, name: "shape", ok: false });
    return failResult(checks, "invalid");
  }
  checks.push({ name: "shape", ok: true });
  const { bundle } = parsed;

  const registryCheck = checkRegistry(
    bundle,
    options.allowUnofficialRegistry === true
  );
  checks.push(registryCheck);
  if (!registryCheck.ok) {
    return failResult(checks, "invalid");
  }

  if (options.rpcUrls.length < 2) {
    checks.push({
      detail: "verifyBundle needs at least two RPC URLs",
      name: "rpcs",
      ok: false,
    });
    return failResult(checks, "inconclusive");
  }
  checks.push({ name: "rpcs", ok: true });

  const leafResult = rebuildLeaf(bundle);
  checks.push(
    leafResult.ok ? { name: "leaf-match", ok: true } : leafResult.check
  );
  if (!leafResult.ok) {
    return failResult(checks, "invalid");
  }

  const proofOk = verifyProof(
    bundle.root,
    leafResult.leaf,
    bundle.proof as Hex[]
  );
  checks.push({
    detail: proofOk ? undefined : "Merkle proof does not verify",
    name: "merkle-proof",
    ok: proofOk,
  });
  if (!proofOk) {
    return failResult(checks, "invalid");
  }

  const consensus = await gatherConsensus(options.rpcUrls, {
    confirmedDepth: options.confirmedDepth ?? 1,
    issuer: bundle.issuer,
    leaf: bundle.leaf,
    registry: bundle.registry,
    root: bundle.root,
  });
  if (!consensus.ok) {
    checks.push(consensus.check);
    return failResult(
      checks,
      consensus.inconclusive ? "inconclusive" : "invalid"
    );
  }
  checks.push({ name: "rpc-consensus", ok: true });
  const chainState = consensus.state;

  const anchorOk = chainState.anchorTimestamp > 0;
  checks.push({
    detail: anchorOk
      ? `timestamp ${chainState.anchorTimestamp}`
      : "anchor not found",
    name: "anchor-exists",
    ok: anchorOk,
  });

  const timingOk =
    anchorOk && bundle.claimedIssuedAt <= chainState.anchorTimestamp;
  if (anchorOk) {
    checks.push({
      detail: timingOk
        ? undefined
        : `claimedIssuedAt ${bundle.claimedIssuedAt} > anchor ${chainState.anchorTimestamp}`,
      name: "claimed-issued-at",
      ok: timingOk,
    });
  }

  const domainCheck = await checkDomain(bundle, options.resolver);
  checks.push(domainCheck);

  const now = options.now ?? Math.floor(Date.now() / 1000);
  const expiryOk = bundle.expiresAt === 0 || bundle.expiresAt > now;
  checks.push({
    detail: expiryOk ? undefined : `expired at ${bundle.expiresAt}`,
    name: "not-expired",
    ok: expiryOk,
  });

  const status = computeVerificationStatus({
    anchorTimestamp: chainState.anchorTimestamp,
    claimedIssuedAt: bundle.claimedIssuedAt,
    compromisedFrom: chainState.compromisedFrom,
    domainVerified: domainCheck.ok,
    expiresAt: bundle.expiresAt,
    now,
    revokedAt: chainState.revokedAt,
  });

  return {
    anchorTimestamp: chainState.anchorTimestamp,
    checks,
    compromisedFrom: chainState.compromisedFrom,
    revokedAt: chainState.revokedAt,
    status,
  };
};
