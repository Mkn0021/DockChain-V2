import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { organizationSettings } from "../../db/schema/settings.schema";

export const SettingsSelectSchema = createSelectSchema(organizationSettings);

export const DataAvailabilitySchema = z.enum([
  "onchain_encrypted",
  "offchain_only",
]);

export const OrganizationParamsSchema = z.object({
  organizationId: z.string().min(1),
});

export const SettingsUpdateSchema = z
  .object({
    autoSeal: z.boolean().optional(),
    batchWindowMinutes: z.number().int().min(15).max(1440).optional(),
    dataAvailability: DataAvailabilitySchema.optional(),
    defaultExpiryDays: z.number().int().positive().nullable().optional(),
    defaultWalletId: z.string().min(1).nullable().optional(),
    requireVerifiedDomain: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type SettingsUpdateType = z.infer<typeof SettingsUpdateSchema>;
