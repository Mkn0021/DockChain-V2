import { createSelectSchema } from "drizzle-typebox";
import { t } from "elysia";

import { env } from "../../config";
import { issuerWallets } from "../../db/schema/wallet.schema";

// ── Response schemas (derived) ─────────────────────────────────────────────

export const WalletResponseSchema = createSelectSchema(issuerWallets);

export const WalletListResponseSchema = t.Array(WalletResponseSchema);

export const WalletChallengeResponseSchema = t.Object({
  message: t.String(),
});

export const WalletVerifyDomainResponseSchema = t.Object({
  foundRecords: t.Array(t.String()),
  wallet: WalletResponseSchema,
});

// ── Params ─────────────────────────────────────────────────────────────────

export const OrganizationParamsSchema = t.Object({
  organizationId: t.String({ minLength: 1 }),
});

export const WalletIdParamsSchema = t.Object({
  organizationId: t.String({ minLength: 1 }),
  walletId: t.String({ minLength: 1 }),
});

// ── Request bodies ─────────────────────────────────────────────────────────

const WalletAddress = t.String({ pattern: "^0x[0-9a-fA-F]{40}$" });
const WalletSignature = t.String({ pattern: "^0x[0-9a-fA-F]+$" });

export const WalletChallengeSchema = t.Object({
  address: WalletAddress,
  chainId: t.Integer({
    default: env.CHAIN_ID,
    maximum: env.CHAIN_ID,
    minimum: 1,
  }),
});

export const WalletCreateSchema = t.Object({
  address: WalletAddress,
  domain: t.Optional(t.String({ maxLength: 253, minLength: 1 })),
  label: t.Optional(t.String({ maxLength: 100, minLength: 1 })),
  message: t.String({ minLength: 1 }),
  signature: WalletSignature,
});

// ── Types ──────────────────────────────────────────────────────────────────

export type WalletChallengeType = typeof WalletChallengeSchema.static;
export type WalletCreateType = typeof WalletCreateSchema.static;
