import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const hexAddress = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Must be a 0x-prefixed 40-char hex address")
  .transform((value) => value as `0x${string}`);

export const env = createEnv({
  clientPrefix: "NEXT_PUBLIC_",

  client: {
    NEXT_PUBLIC_CHAIN_ID: z.coerce.number().int().positive().default(31_337),
    NEXT_PUBLIC_RPC_URL: z.url().default("http://127.0.0.1:8545"),
    NEXT_PUBLIC_REGISTRY_ADDRESS: hexAddress.default(
      ZERO_ADDRESS as `0x${string}`
    ),
    NEXT_PUBLIC_BLOCK_EXPLORER_URL: z
      .union([z.url(), z.literal("")])
      .default(""),
  },

  emptyStringAsUndefined: true,

  onValidationError: (issues) => {
    console.error("❌ Invalid environment variables:");
    for (const issue of issues) {
      const path = issue.path?.join(".") ?? "unknown";
      console.error(`  - ${path}: ${issue.message}`);
    }
    throw new Error("Invalid environment variables");
  },

  runtimeEnv: {
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
    NEXT_PUBLIC_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS,
    NEXT_PUBLIC_BLOCK_EXPLORER_URL: process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL,
  },
});
