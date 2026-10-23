import { eq } from "drizzle-orm";

import { createChainClient } from "../../chain/client";
import { RegistryClient } from "../../chain/registry.client";
import { computeVerificationStatus } from "../../chain/status";
import { env } from "../../config";
import { db } from "../../db";
import { organizations } from "../../db/schema/auth.schema";
import { batches } from "../../db/schema/batch.schema";
import { registryDeployments } from "../../db/schema/chain.schema";
import { documents } from "../../db/schema/document.schema";
import { issuerWallets } from "../../db/schema/wallet.schema";
import { AppError } from "../../shared/errors";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type DocumentRow = typeof documents.$inferSelect;
type WalletRow = typeof issuerWallets.$inferSelect;
type BatchRow = typeof batches.$inferSelect;

const toUnix = (value: Date | string | null): number =>
  value ? Math.floor(new Date(value).getTime() / 1000) : 0;

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
