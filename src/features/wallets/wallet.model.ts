import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { issuerWallets } from "../../db/schema/wallet.schema";

export const WalletSelectSchema = createSelectSchema(issuerWallets);

export const WalletStatusSchema = z.enum(["active", "disabled", "compromised"]);

export const OrganizationParamsSchema = z.object({
  organizationId: z.string().min(1),
});

export const WalletIdParamsSchema = OrganizationParamsSchema.extend({
  walletId: z.string().min(1),
});

export const WalletChallengeSchema = z.object({
  address: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, "Address must be a 0x-prefixed hex string")
    .transform((value) => value.toLowerCase()),
  chainId: z.coerce.number().int().positive(),
});

export const WalletChallengeResponseSchema = z.object({
  message: z.string(),
});

export const WalletCreateSchema = z.object({
  address: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, "Address must be a 0x-prefixed hex string")
    .transform((value) => value.toLowerCase()),
  domain: z.string().trim().min(1).max(253).optional(),
  label: z.string().trim().min(1).max(100).optional(),
  message: z.string().min(1),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/, "Signature must be hex"),
});

export const WalletListResponseSchema = z.array(WalletSelectSchema);

export const WalletVerifyDomainResponseSchema = z.object({
  foundRecords: z.array(z.string()),
  wallet: WalletSelectSchema,
});

export type WalletChallengeType = z.infer<typeof WalletChallengeSchema>;
export type WalletCreateType = z.infer<typeof WalletCreateSchema>;
