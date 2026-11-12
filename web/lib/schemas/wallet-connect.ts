import { z } from "zod";

export const walletConnectSchema = z.object({
  label: z.string().trim().min(1, "Label is required.").max(64),
  domain: z
    .string()
    .trim()
    .max(253)
    .refine(
      (v) =>
        v === "" ||
        /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
          v
        ),
      "Enter a valid domain (e.g. example.com)"
    )
    .optional()
    .or(z.literal("")),
});

export type WalletConnectValues = z.infer<typeof walletConnectSchema>;
