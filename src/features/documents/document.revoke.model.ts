import { z } from "zod";

import { REVOCATION_REASON_CODES } from "../../chain/revocations";

export const RevocationReasonCodeSchema = z.enum(REVOCATION_REASON_CODES);

export const RevokePrepareSchema = z.object({
  mode: z.enum(["direct", "signature"]),
  note: z.string().trim().max(500).optional(),
  reasonCode: RevocationReasonCodeSchema,
});

export const RevokeSubmitSchema = z
  .object({
    revocationId: z.string().min(1),
    signature: z
      .string()
      .regex(/^0x[0-9a-fA-F]+$/)
      .optional(),
    txHash: z
      .string()
      .regex(/^0x[0-9a-fA-F]{64}$/)
      .optional(),
  })
  .refine((data) => data.signature !== undefined || data.txHash !== undefined, {
    message: "Either signature or txHash must be provided",
  });

export const RevokePrepareResponseSchema = z.discriminatedUnion("mode", [
  z.object({
    chainId: z.number(),
    data: z.string().regex(/^0x[0-9a-fA-F]+$/),
    from: z.string(),
    mode: z.literal("direct"),
    revocationId: z.string(),
    to: z.string(),
  }),
  z.object({
    mode: z.literal("signature"),
    revocationId: z.string(),
    typedData: z.object({
      domain: z.record(z.string(), z.unknown()),
      message: z.record(z.string(), z.unknown()),
      primaryType: z.literal("Revoke"),
      types: z.record(
        z.string(),
        z.array(z.object({ name: z.string(), type: z.string() }))
      ),
    }),
  }),
]);

export const RevokeSubmitResponseSchema = z.object({
  revocationId: z.string(),
  status: z.enum(["submitted"]),
});

export type RevokePrepareInput = z.infer<typeof RevokePrepareSchema>;
export type RevokeSubmitInput = z.infer<typeof RevokeSubmitSchema>;
