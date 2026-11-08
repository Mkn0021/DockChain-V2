import { z } from "zod";

export const INVITE_ROLES = ["admin", "issuer", "viewer"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

export const inviteFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
  role: z.enum(INVITE_ROLES),
});

export type InviteFormValues = z.infer<typeof inviteFormSchema>;
