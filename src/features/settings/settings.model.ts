import { createSelectSchema } from "drizzle-typebox";
import { t } from "elysia";

import { organizationSettings } from "../../db/schema/settings.schema";

export const SettingsResponseSchema = createSelectSchema(organizationSettings);

export const DataAvailabilitySchema = t.Union([
  t.Literal("onchain_encrypted"),
  t.Literal("offchain_only"),
]);

export const OrganizationParamsSchema = t.Object({
  organizationId: t.String({ minLength: 1 }),
});

export const SettingsUpdateSchema = t.Object(
  {
    autoSeal: t.Optional(t.Boolean()),
    batchWindowMinutes: t.Optional(t.Integer({ maximum: 1440, minimum: 15 })),
    dataAvailability: t.Optional(DataAvailabilitySchema),
    defaultExpiryDays: t.Optional(
      t.Union([t.Integer({ exclusiveMinimum: 0 }), t.Null()])
    ),
    defaultWalletId: t.Optional(
      t.Union([t.String({ minLength: 1 }), t.Null()])
    ),
    requireVerifiedDomain: t.Optional(t.Boolean()),
  },
  { minProperties: 1 }
);

export type SettingsUpdateType = typeof SettingsUpdateSchema.static;
