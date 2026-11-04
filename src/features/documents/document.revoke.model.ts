import { t } from "elysia";

import { REVOCATION_REASON_CODES } from "../../chain/revocations";

export const RevocationReasonCodeSchema = t.Union(
  REVOCATION_REASON_CODES.map((code) => t.Literal(code))
);

export const RevokePrepareSchema = t.Object({
  mode: t.Union([t.Literal("direct"), t.Literal("signature")]),
  note: t.Optional(t.String({ maxLength: 500 })),
  reasonCode: RevocationReasonCodeSchema,
});

export const RevokeSubmitSchema = t.Object(
  {
    revocationId: t.String({ minLength: 1 }),
    signature: t.Optional(t.String({ pattern: "^0x[0-9a-fA-F]+$" })),
    txHash: t.Optional(t.String({ pattern: "^0x[0-9a-fA-F]{64}$" })),
  },
  {
    anyOf: [{ required: ["signature"] }, { required: ["txHash"] }],
  }
);

const HexString = t.String({ pattern: "^0x[0-9a-fA-F]+$" });

export const RevokePrepareResponseSchema = t.Union([
  t.Object({
    chainId: t.Number(),
    data: HexString,
    from: t.String(),
    mode: t.Literal("direct"),
    revocationId: t.String(),
    to: t.String(),
  }),
  t.Object({
    mode: t.Literal("signature"),
    revocationId: t.String(),
    typedData: t.Object({
      domain: t.Record(t.String(), t.Any()),
      message: t.Record(t.String(), t.Any()),
      primaryType: t.Literal("Revoke"),
      types: t.Record(
        t.String(),
        t.Array(t.Object({ name: t.String(), type: t.String() }))
      ),
    }),
  }),
]);

export const RevokeSubmitResponseSchema = t.Object({
  revocationId: t.String(),
  status: t.Literal("submitted"),
});

export type RevokePrepareInput = typeof RevokePrepareSchema.static;
export type RevokeSubmitInput = typeof RevokeSubmitSchema.static;
