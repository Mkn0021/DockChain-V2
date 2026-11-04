import { t } from "elysia";

// ── Params ─────────────────────────────────────────────────────────────────

export const VerifyLeafParamsSchema = t.Object({
  leaf: t.String({ pattern: "^0x[0-9a-f]{64}$" }),
});

export const IssuerParamsSchema = t.Object({
  address: t.String({ pattern: "^0x[0-9a-fA-F]{40}$" }),
});

// ── Query ──────────────────────────────────────────────────────────────────

export const VerifyLeafQuerySchema = t.Object({
  live: t.Optional(
    t.Union([t.Literal("true"), t.Literal("false"), t.Boolean()])
  ),
});

// ── Response schemas ───────────────────────────────────────────────────────

export const VerifyStatusSchema = t.Union([
  t.Literal("not-found"),
  t.Literal("pending"),
  t.Literal("invalid"),
  t.Literal("issuer-compromised"),
  t.Literal("revoked"),
  t.Literal("expired"),
  t.Literal("unverified-issuer"),
  t.Literal("valid"),
]);

const AnchorSchema = t.Union([
  t.Object({
    blockNumber: t.Union([t.String(), t.Null()]),
    blockTimestamp: t.Union([t.Number(), t.Null()]),
    chainId: t.Number(),
    registry: t.String(),
    root: t.String(),
    txHash: t.Union([t.String(), t.Null()]),
  }),
  t.Null(),
]);

const IssuerInfoSchema = t.Object({
  address: t.String(),
  domain: t.Union([t.String(), t.Null()]),
  domainVerified: t.Boolean(),
  organizationName: t.Union([t.String(), t.Null()]),
});

const RevocationSchema = t.Union([
  t.Object({
    blockTimestamp: t.Union([t.Number(), t.Null()]),
    reasonCode: t.String(),
    txHash: t.Union([t.String(), t.Null()]),
  }),
  t.Null(),
]);

export const VerifyResponseSchema = t.Object({
  anchor: AnchorSchema,
  claimedIssuedAt: t.Union([t.Number(), t.Null()]),
  expiresAt: t.Union([t.Number(), t.Null()]),
  issuer: IssuerInfoSchema,
  revocation: RevocationSchema,
  source: t.Union([t.Literal("index"), t.Literal("chain")]),
  status: VerifyStatusSchema,
});

export const VerifyBundleBodySchema = t.Object({
  bundle: t.Record(t.String(), t.Any()),
});

export const VerifyBundleResponseSchema = t.Composite([
  VerifyResponseSchema,
  t.Object({
    checks: t.Array(
      t.Object({
        detail: t.Optional(t.String()),
        name: t.String(),
        ok: t.Boolean(),
      })
    ),
  }),
]);

export const IssuerResponseSchema = t.Object({
  address: t.String(),
  compromisedFrom: t.Union([t.Number(), t.Null()]),
  domain: t.Union([t.String(), t.Null()]),
  domainVerifiedAt: t.Union([t.String(), t.Null()]),
  label: t.String(),
  organizationName: t.String(),
  status: t.Union([
    t.Literal("active"),
    t.Literal("disabled"),
    t.Literal("compromised"),
  ]),
});

export const RegistryResponseSchema = t.Object({
  abiHash: t.String(),
  address: t.String(),
  chainId: t.Number(),
  deployedBlock: t.String(),
  version: t.String(),
});
