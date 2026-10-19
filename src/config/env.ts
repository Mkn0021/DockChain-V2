import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const env = createEnv({
  emptyStringAsUndefined: true,

  isServer: true,
  onValidationError: (issues) => {
    console.error("❌ Invalid environment variables:");
    for (const issue of issues) {
      const path = issue.path?.join(".") ?? "unknown";
      console.error(`  - ${path}: ${issue.message}`);
    }
    process.exit(1);
  },
  runtimeEnv: process.env,

  server: {
    APP_PUBLIC_URL: z.url(),
    BATCH_MAX_SIZE: z.coerce.number().int().positive().max(5000).default(500),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    BULL_BOARD_PASSWORD: z.string().min(8),
    BULL_BOARD_USERNAME: z.string(),
    CHAIN_ID: z.coerce.number().int().positive().default(84_532),
    DATABASE_URL: z.url(),
    DOCUMENT_ENCRYPTION_ACTIVE_KEY_ID: z.string().min(1),
    DOCUMENT_ENCRYPTION_KEYS: z.string().transform((value, ctx) => {
      try {
        const parsed = JSON.parse(value);
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "must be a JSON object mapping kekId to base64 key",
          });
          return z.NEVER;
        }
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v !== "string") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `value for key "${k}" must be a string`,
            });
            return z.NEVER;
          }
          const bytes = Buffer.from(v, "base64");
          if (bytes.length !== 32) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `key "${k}" must decode to exactly 32 bytes (got ${bytes.length})`,
            });
            return z.NEVER;
          }
        }
        return parsed as Record<string, string>;
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "must be valid JSON",
        });
        return z.NEVER;
      }
    }),
    NODE_ENV: z.enum(["development", "production", "test"]),
    PORT: z.coerce.number(),
    REDIS_URL: z.url(),
    REGISTRY_ADDRESS: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/, "Must be a 0x-prefixed 40-char hex address")
      .default(ZERO_ADDRESS),
    RESEND_API_KEY: z.string(),
    RESEND_FROM_EMAIL: z.email(),
    // S3 Storage
    S3_ACCESS_KEY_ID: z.string(),
    S3_BUCKET: z.string(),
    S3_ENDPOINT: z.url(),
    S3_PUBLIC_URL: z.url(),
    S3_REGION: z.string(),
    S3_SECRET_ACCESS_KEY: z.string(),
  },
});

if (env.NODE_ENV === "production") {
  if (env.REGISTRY_ADDRESS === ZERO_ADDRESS) {
    console.error(
      "❌ REGISTRY_ADDRESS must be set to a non-zero address in production"
    );
    process.exit(1);
  }
  if (
    !(env.DOCUMENT_ENCRYPTION_ACTIVE_KEY_ID in env.DOCUMENT_ENCRYPTION_KEYS)
  ) {
    console.error(
      "❌ DOCUMENT_ENCRYPTION_ACTIVE_KEY_ID must reference a key in DOCUMENT_ENCRYPTION_KEYS"
    );
    process.exit(1);
  }
}
