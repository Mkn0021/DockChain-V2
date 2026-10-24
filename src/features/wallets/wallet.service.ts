import { and, count, eq } from "drizzle-orm";

import type { TxtResolver } from "./wallet.dns";
import type { WalletChallengeType, WalletCreateType } from "./wallet.model";

import { env } from "../../config";
import { db } from "../../db";
import { verifications } from "../../db/schema/auth.schema";
import { batches } from "../../db/schema/batch.schema";
import { documents } from "../../db/schema/document.schema";
import { organizationSettings } from "../../db/schema/settings.schema";
import { issuerWallets } from "../../db/schema/wallet.schema";
import { AppError, isPgUniqueViolation } from "../../shared/errors";
import { AuditService } from "../audit/audit.service";
import { createChallenge, verifyChallenge } from "./wallet.challenge";
import { normalizeDomain, verifyDomainOwnership } from "./wallet.domain";

const CHALLENGE_PREFIX = "wallet-challenge";

const challengeIdentifier = (organizationId: string, address: string) =>
  `${CHALLENGE_PREFIX}:${organizationId}:${address.toLowerCase()}`;

const walletHasReferences = async (walletId: string): Promise<boolean> => {
  const [[{ documentCount }], [{ batchCount }]] = await Promise.all([
    db
      .select({ documentCount: count() })
      .from(documents)
      .where(eq(documents.issuerWalletId, walletId)),
    db
      .select({ batchCount: count() })
      .from(batches)
      .where(eq(batches.issuerWalletId, walletId)),
  ]);

  return Number(documentCount) > 0 || Number(batchCount) > 0;
};

const clearDefaultWalletIfMatches = async (
  organizationId: string,
  walletId: string
): Promise<void> => {
  await db
    .update(organizationSettings)
    .set({ defaultWalletId: null, updatedAt: new Date() })
    .where(
      and(
        eq(organizationSettings.organizationId, organizationId),
        eq(organizationSettings.defaultWalletId, walletId)
      )
    );
};

export const WalletService = {
  async createChallenge(organizationId: string, data: WalletChallengeType) {
    const { expirationTime, message, nonce } = createChallenge({
      address: data.address,
      chainId: data.chainId,
    });

    const identifier = challengeIdentifier(organizationId, data.address);

    await db
      .delete(verifications)
      .where(eq(verifications.identifier, identifier));
    await db.insert(verifications).values({
      expiresAt: expirationTime,
      id: crypto.randomUUID(),
      identifier,
      value: nonce,
    });

    return { message };
  },

  async delete(organizationId: string, walletId: string) {
    const wallet = await WalletService.getById(organizationId, walletId);

    const hasReferences = await walletHasReferences(wallet.id);

    if (hasReferences) {
      const [updated] = await db
        .update(issuerWallets)
        .set({ status: "disabled", updatedAt: new Date() })
        .where(eq(issuerWallets.id, wallet.id))
        .returning();

      await clearDefaultWalletIfMatches(organizationId, wallet.id);

      await AuditService.record({
        action: "wallet.disabled",
        actorType: "user",
        metadata: { reason: "referenced_by_documents_or_batches" },
        organizationId,
        targetId: wallet.id,
        targetType: "issuer_wallet",
      });

      return updated;
    }

    await db.delete(issuerWallets).where(eq(issuerWallets.id, wallet.id));

    await clearDefaultWalletIfMatches(organizationId, wallet.id);

    await AuditService.record({
      action: "wallet.deleted",
      actorType: "user",
      organizationId,
      targetId: wallet.id,
      targetType: "issuer_wallet",
    });

    return wallet;
  },

  async getById(organizationId: string, walletId: string) {
    const [wallet] = await db
      .select()
      .from(issuerWallets)
      .where(
        and(
          eq(issuerWallets.id, walletId),
          eq(issuerWallets.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!wallet) {
      throw AppError.notFound("Wallet not found");
    }

    return wallet;
  },

  async list(organizationId: string) {
    return await db
      .select()
      .from(issuerWallets)
      .where(eq(issuerWallets.organizationId, organizationId))
      .orderBy(issuerWallets.createdAt);
  },

  async register(
    organizationId: string,
    createdBy: string,
    data: WalletCreateType
  ) {
    const identifier = challengeIdentifier(organizationId, data.address);

    const [challenge] = await db
      .select()
      .from(verifications)
      .where(eq(verifications.identifier, identifier))
      .limit(1);

    if (!challenge) {
      throw AppError.validation("No active challenge for this address");
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      await db
        .delete(verifications)
        .where(eq(verifications.identifier, identifier));
      throw AppError.validation("Challenge has expired");
    }

    const chainIdMatch = data.message.match(/^Chain ID:\s*(\d+)$/m);
    if (!chainIdMatch) {
      throw AppError.validation("Message is missing a Chain ID line");
    }
    const chainId = Number(chainIdMatch[1]);

    if (chainId !== env.CHAIN_ID) {
      throw AppError.validation(
        `Chain ID mismatch: message declares ${chainId}, expected ${env.CHAIN_ID}`
      );
    }

    try {
      await verifyChallenge({
        address: data.address,
        chainId,
        expectedNonce: challenge.value,
        message: data.message,
        signature: data.signature as `0x${string}`,
      });
    } catch (error) {
      throw AppError.validation(
        error instanceof Error ? error.message : "Signature verification failed"
      );
    }

    // One-time use: delete the nonce before inserting the wallet
    await db
      .delete(verifications)
      .where(eq(verifications.identifier, identifier));

    const wallet = await (async () => {
      try {
        const [row] = await db
          .insert(issuerWallets)
          .values({
            address: data.address,
            chainId: String(chainId),
            createdBy,
            domain: data.domain ?? null,
            label:
              data.label ??
              `Wallet ${data.address.slice(0, 6)}…${data.address.slice(-4)}`,
            organizationId,
          })
          .returning();
        return row;
      } catch (error) {
        if (isPgUniqueViolation(error)) {
          throw AppError.conflict("This wallet address is already registered");
        }
        throw error;
      }
    })();

    return wallet;
  },

  async verifyDomain(
    organizationId: string,
    walletId: string,
    resolver?: TxtResolver
  ) {
    const wallet = await WalletService.getById(organizationId, walletId);

    if (!wallet.domain) {
      throw AppError.validation("Wallet has no domain to verify");
    }

    const domain = normalizeDomain(wallet.domain);
    const foundRecords = await verifyDomainOwnership({
      chainId: wallet.chainId,
      domain,
      resolver,
      walletAddress: wallet.address,
    });

    const [updated] = await db
      .update(issuerWallets)
      .set({
        domain,
        domainVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(issuerWallets.id, walletId),
          eq(issuerWallets.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw AppError.notFound("Wallet not found");
    }

    return { foundRecords, wallet: updated };
  },
};
