import { computeVerificationStatus } from "@dockchain/verify";
import { eq } from "drizzle-orm";

import { createChainClient } from "../../chain/client";
import { RegistryClient } from "../../chain/registry.client";
import { env } from "../../config";
import { db } from "../../db";
import { organizations } from "../../db/schema/auth.schema";
import { batches } from "../../db/schema/batch.schema";
import { registryDeployments } from "../../db/schema/chain.schema";
import { documents } from "../../db/schema/document.schema";
import { issuerWallets } from "../../db/schema/wallet.schema";
import { toUnixSeconds as toUnix } from "../../shared/db/date";
import { AppError } from "../../shared/errors";
import {
  chainNotConfiguredResponse,
  checkChainId,
  checkClaimedIssuedAt,
  checkMerkleProof,
  checkNotExpired,
  checkRegistryAddress,
  invalidBundleResponse,
  parseBundle,
  rebuildLeaf,
  type BundleCheck,
  type ParsedBundle,
} from "./verify.bundle";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type DocumentRow = typeof documents.$inferSelect;
type WalletRow = typeof issuerWallets.$inferSelect;
type BatchRow = typeof batches.$inferSelect;

const buildRevocationInfo = (
  revocation: { reason: number; timestamp: number },
  txHash: string | null
) =>
  revocation.timestamp > 0
    ? {
        blockTimestamp: revocation.timestamp,
        reasonCode: String(revocation.reason),
        txHash,
      }
    : null;

const baseContext = (doc: DocumentRow, wallet: WalletRow) => ({
  claimedIssuedAt: toUnix(doc.claimedIssuedAt),
  compromisedFrom: toUnix(wallet.compromisedFrom),
  expiresAt: toUnix(doc.expiresAt),
});

const unanchoredContext = (doc: DocumentRow, wallet: WalletRow) => ({
  ...baseContext(doc, wallet),
  anchorTimestamp: 0,
  revocation: null,
  revokedAt: 0,
});

const indexedContext = (
  doc: DocumentRow,
  wallet: WalletRow,
  batch: BatchRow
) => ({
  ...baseContext(doc, wallet),
  anchorTimestamp: toUnix(batch.confirmedAt),
  revocation: null,
  revokedAt: 0,
});

const readChainContext = async (input: {
  batch: BatchRow;
  doc: DocumentRow;
  wallet: WalletRow;
}) => {
  const { batch, doc, wallet } = input;

  const registryAddress = (batch.registryAddress ??
    env.REGISTRY_ADDRESS) as `0x${string}`;

  const chainClient = createChainClient();
  const registry = new RegistryClient({
    address: registryAddress,
    publicClient: chainClient.publicClient,
  });

  const anchor = await registry.readAnchor(
    wallet.address as `0x${string}`,
    batch.root as `0x${string}`
  );
  const revocation = await registry.readRevocation(
    wallet.address as `0x${string}`,
    doc.leaf as `0x${string}`
  );
  const compromisedFrom = await registry.readCompromisedFrom(
    wallet.address as `0x${string}`
  );

  return {
    anchorTimestamp: anchor.timestamp,
    claimedIssuedAt: toUnix(doc.claimedIssuedAt),
    compromisedFrom,
    expiresAt: toUnix(doc.expiresAt),
    revocation: buildRevocationInfo(revocation, batch.txHash),
    revokedAt: revocation.timestamp,
  };
};

export const VerifyService = {
  async byBundle(raw: Record<string, unknown>) {
    const checks: BundleCheck[] = [];

    let bundle: ParsedBundle;
    try {
      bundle = parseBundle(raw);
      checks.push({ name: "shape", ok: true });
    } catch (error) {
      return invalidBundleResponse(
        checks,
        error instanceof Error ? error.message : "invalid bundle"
      );
    }

    if (env.REGISTRY_ADDRESS === ZERO_ADDRESS) {
      return chainNotConfiguredResponse(checks, bundle);
    }

    checks.push(checkChainId(bundle));
    checks.push(checkRegistryAddress(bundle));

    const { check: leafCheck, leaf: rebuiltLeaf } = rebuildLeaf(bundle);
    checks.push(leafCheck);

    const merkleCheck = checkMerkleProof(bundle, rebuiltLeaf);
    if (merkleCheck) {
      checks.push(merkleCheck);
    }

    const chainClient = createChainClient();
    const registry = new RegistryClient({
      address: bundle.registry,
      publicClient: chainClient.publicClient,
    });

    const anchor = await registry.readAnchor(bundle.issuer, bundle.root);
    checks.push({
      detail:
        anchor.timestamp > 0
          ? `timestamp ${anchor.timestamp}`
          : "anchor not found",
      name: "anchor-exists",
      ok: anchor.timestamp > 0,
    });

    const revocation = await registry.readRevocation(
      bundle.issuer,
      bundle.leaf
    );
    checks.push({
      detail:
        revocation.timestamp > 0
          ? `revoked at ${revocation.timestamp}`
          : undefined,
      name: "not-revoked",
      ok: revocation.timestamp === 0,
    });

    const compromisedFrom = await registry.readCompromisedFrom(bundle.issuer);

    const claimedCheck = checkClaimedIssuedAt(bundle, anchor.timestamp);
    if (claimedCheck) {
      checks.push(claimedCheck);
    }

    const now = Math.floor(Date.now() / 1000);
    checks.push(checkNotExpired(bundle, now));

    const status = computeVerificationStatus({
      anchorTimestamp: anchor.timestamp,
      claimedIssuedAt: bundle.claimedIssuedAt,
      compromisedFrom,
      domainVerified: true,
      expiresAt: bundle.expiresAt,
      now,
      revokedAt: revocation.timestamp,
    });

    return {
      anchor:
        anchor.timestamp > 0
          ? {
              blockNumber: null,
              blockTimestamp: anchor.timestamp,
              chainId: bundle.chainId,
              registry: bundle.registry,
              root: bundle.root,
              txHash: null,
            }
          : null,
      checks,
      claimedIssuedAt: bundle.claimedIssuedAt,
      expiresAt: bundle.expiresAt || null,
      issuer: {
        address: bundle.issuer,
        domain: null,
        domainVerified: false,
        organizationName: null,
      },
      revocation:
        revocation.timestamp > 0
          ? {
              blockTimestamp: revocation.timestamp,
              reasonCode: String(revocation.reason),
              txHash: null,
            }
          : null,
      source: "chain" as const,
      status,
    };
  },

  async byLeaf(leaf: string, live: boolean) {
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.leaf, leaf))
      .limit(1);

    if (!doc) {
      return { status: "not-found" as const };
    }

    const [wallet] = await db
      .select()
      .from(issuerWallets)
      .where(eq(issuerWallets.id, doc.issuerWalletId))
      .limit(1);

    if (!wallet) {
      throw AppError.internal("Issuer wallet missing");
    }

    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, doc.organizationId))
      .limit(1);

    const [batch] = doc.batchId
      ? await db
          .select()
          .from(batches)
          .where(eq(batches.id, doc.batchId))
          .limit(1)
      : [];

    const context = await this.readVerificationContext({ doc, live, wallet });

    const status = computeVerificationStatus({
      anchorTimestamp: context.anchorTimestamp,
      claimedIssuedAt: context.claimedIssuedAt,
      compromisedFrom: context.compromisedFrom,
      domainVerified: Boolean(wallet.domainVerifiedAt),
      expiresAt: context.expiresAt,
      now: Math.floor(Date.now() / 1000),
      revokedAt: context.revokedAt,
    });

    return {
      anchor: batch
        ? {
            blockNumber: batch.blockNumber,
            blockTimestamp: toUnix(batch.blockTimestamp),
            chainId: env.CHAIN_ID,
            registry: env.REGISTRY_ADDRESS,
            root: batch.root ?? "",
            txHash: batch.txHash,
          }
        : null,
      claimedIssuedAt: context.claimedIssuedAt,
      expiresAt: context.expiresAt || null,
      issuer: {
        address: wallet.address,
        domain: wallet.domain,
        domainVerified: Boolean(wallet.domainVerifiedAt),
        organizationName: organization?.name ?? null,
      },
      revocation: context.revocation,
      source: live ? ("chain" as const) : ("index" as const),
      status,
    };
  },

  async issuerByAddress(address: string) {
    const [wallet] = await db
      .select()
      .from(issuerWallets)
      .where(eq(issuerWallets.address, address))
      .limit(1);

    if (!wallet) {
      throw AppError.notFound("Issuer not found");
    }

    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, wallet.organizationId))
      .limit(1);

    return {
      address: wallet.address,
      compromisedFrom: wallet.compromisedFrom
        ? toUnix(wallet.compromisedFrom)
        : null,
      domain: wallet.domain,
      domainVerifiedAt: wallet.domainVerifiedAt
        ? new Date(wallet.domainVerifiedAt).toISOString()
        : null,
      label: wallet.label,
      organizationName: organization?.name ?? "",
      status: wallet.status,
    };
  },

  async readVerificationContext(input: {
    doc: DocumentRow;
    live: boolean;
    wallet: WalletRow;
  }) {
    const { doc, live, wallet } = input;

    const [batch] = doc.batchId
      ? await db
          .select()
          .from(batches)
          .where(eq(batches.id, doc.batchId))
          .limit(1)
      : [];

    if (!batch || !batch.root || !doc.leaf) {
      return unanchoredContext(doc, wallet);
    }

    if (env.REGISTRY_ADDRESS === ZERO_ADDRESS) {
      return indexedContext(doc, wallet, batch);
    }

    if (!live) {
      return indexedContext(doc, wallet, batch);
    }

    return readChainContext({ batch, doc, wallet });
  },

  async registry() {
    const [deployment] = await db
      .select()
      .from(registryDeployments)
      .where(eq(registryDeployments.chainId, String(env.CHAIN_ID)))
      .limit(1);

    if (!deployment) {
      throw AppError.notFound("Registry deployment not found");
    }

    return {
      abiHash: deployment.abiHash,
      address: deployment.address,
      chainId: env.CHAIN_ID,
      deployedBlock: deployment.deployedBlock,
      version: deployment.version,
    };
  },
};
