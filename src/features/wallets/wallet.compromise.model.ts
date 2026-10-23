import { z } from "zod";

export const CompromisePrepareSchema = z.object({
  cutoff: z.coerce.number().int().nonnegative().optional(),
});

export const CompromisePrepareResponseSchema = z.object({
  chainId: z.number(),
  data: z.string().regex(/^0x[0-9a-fA-F]+$/),
  from: z.string(),
  to: z.string(),
});

export type CompromisePrepareInput = z.infer<typeof CompromisePrepareSchema>;
