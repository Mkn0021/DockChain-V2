import { z } from "zod";

export const VerifyLeafParamsSchema = z.object({
  leaf: z.string().regex(/^0x[0-9a-f]{64}$/),
});

export const VerifyResponseSchema = z.object({
  anchor: z
    .object({
      blockNumber: z.string().nullable(),
      blockTimestamp: z.number().nullable(),
      chainId: z.number(),
      registry: z.string(),
      root: z.string(),
      txHash: z.string().nullable(),
    })
    .nullable(),
  claimedIssuedAt: z.number().nullable(),
  expiresAt: z.number().nullable(),
  issuer: z.object({
    address: z.string(),
    domain: z.string().nullable(),
    domainVerified: z.boolean(),
    organizationName: z.string().nullable(),
  }),
  revocation: z
    .object({
      blockTimestamp: z.number().nullable(),
      reasonCode: z.string(),
      txHash: z.string().nullable(),
    })
    .nullable(),
  source: z.enum(["index", "chain"]),
  status: z.enum([
    "not-found",
    "pending",
    "invalid",
    "issuer-compromised",
    "revoked",
    "expired",
    "unverified-issuer",
    "valid",
  ]),
});

export const VerifyBundleBodySchema = z.object({
  bundle: z.record(z.string(), z.unknown()),
});

export const VerifyBundleResponseSchema = VerifyResponseSchema.extend({
  checks: z.array(
    z.object({
      detail: z.string().optional(),
      name: z.string(),
      ok: z.boolean(),
    })
  ),
});

export const IssuerParamsSchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

export const IssuerResponseSchema = z.object({
  address: z.string(),
  compromisedFrom: z.number().nullable(),
  domain: z.string().nullable(),
  domainVerifiedAt: z.string().nullable(),
  label: z.string(),
  organizationName: z.string(),
  status: z.enum(["active", "disabled", "compromised"]),
});

export const RegistryResponseSchema = z.object({
  abiHash: z.string(),
  address: z.string(),
  chainId: z.number(),
  deployedBlock: z.string(),
  version: z.string(),
});

export const VerifyLeafQuerySchema = z.object({
  live: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
});
