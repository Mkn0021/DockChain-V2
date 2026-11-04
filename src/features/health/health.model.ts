import { t } from "elysia";

export const ChainHealthSchema = t.Object({
  address: t.String(),
  chainId: t.Number(),
  indexer: t.Union([
    t.Object({
      haltedReason: t.Union([t.String(), t.Null()]),
      lag: t.Union([t.Number(), t.Null()]),
      lastBlock: t.String(),
      status: t.Union([t.Literal("running"), t.Literal("halted")]),
    }),
    t.Null(),
  ]),
  registryCodeExists: t.Boolean(),
  relayer: t.Union([
    t.Object({
      address: t.String(),
      balanceWei: t.String(),
    }),
    t.Null(),
  ]),
  rpcReachable: t.Boolean(),
});

export const HealthResponse = t.Object({
  chain: t.Union([ChainHealthSchema, t.Null()]),
  status: t.Literal("ok"),
  timestamp: t.String(),
});

export type ChainHealth = typeof ChainHealthSchema.static;
export type HealthResponse = typeof HealthResponse.static;
