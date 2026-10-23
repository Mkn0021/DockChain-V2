import { z } from "zod";

export const ChainHealthSchema = z.object({
  address: z.string(),
  chainId: z.number(),
  indexer: z
    .object({
      haltedReason: z.string().nullable(),
      lag: z.number().nullable(),
      lastBlock: z.string(),
      status: z.enum(["running", "halted"]),
    })
    .nullable(),
  registryCodeExists: z.boolean(),
  relayer: z
    .object({
      address: z.string(),
      balanceWei: z.string(),
    })
    .nullable(),
  rpcReachable: z.boolean(),
});

export const HealthResponse = z.object({
  chain: ChainHealthSchema.nullable(),
  status: z.literal("ok"),
  timestamp: z.string(),
});

export type ChainHealth = z.infer<typeof ChainHealthSchema>;
export type HealthResponse = z.infer<typeof HealthResponse>;
