import { t } from "elysia";

export const CompromisePrepareSchema = t.Object({
  cutoff: t.Optional(t.Integer({ minimum: 0 })),
});

export const CompromisePrepareResponseSchema = t.Object({
  chainId: t.Number(),
  data: t.String({ pattern: "^0x[0-9a-fA-F]+$" }),
  from: t.String(),
  to: t.String(),
});

export type CompromisePrepareInput = typeof CompromisePrepareSchema.static;
