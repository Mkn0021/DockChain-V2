import { and, eq } from "drizzle-orm";

import type { SettingsUpdateType } from "./settings.model";

import { db } from "../../db";
import { organizationSettings } from "../../db/schema/settings.schema";
import { issuerWallets } from "../../db/schema/wallet.schema";
import { AppError } from "../../shared/errors";

const defaults = {
  autoSeal: true,
  batchWindowMinutes: 60,
  dataAvailability: "onchain_encrypted" as const,
  defaultExpiryDays: null,
  defaultWalletId: null,
  requireVerifiedDomain: false,
};

export const SettingsService = {
  async get(organizationId: string) {
    const [existing] = await db
      .select()
      .from(organizationSettings)
      .where(eq(organizationSettings.organizationId, organizationId))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(organizationSettings)
      .values({ organizationId, ...defaults })
      .onConflictDoNothing()
      .returning();

    if (created) {
      return created;
    }

    const [row] = await db
      .select()
      .from(organizationSettings)
      .where(eq(organizationSettings.organizationId, organizationId))
      .limit(1);

    if (!row) {
      throw AppError.internal("Failed to initialize organization settings");
    }

    return row;
  },

  async update(organizationId: string, data: SettingsUpdateType) {
    if (data.defaultWalletId) {
      const [wallet] = await db
        .select({ id: issuerWallets.id, status: issuerWallets.status })
        .from(issuerWallets)
        .where(
          and(
            eq(issuerWallets.id, data.defaultWalletId),
            eq(issuerWallets.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!wallet) {
        throw AppError.validation(
          "defaultWalletId does not belong to this organization"
        );
      }
      if (wallet.status !== "active") {
        throw AppError.validation(
          "defaultWalletId must refer to an active wallet"
        );
      }
    }

    await SettingsService.get(organizationId);

    const [updated] = await db
      .update(organizationSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizationSettings.organizationId, organizationId))
      .returning();

    if (!updated) {
      throw AppError.notFound("Settings not found");
    }

    return updated;
  },
};
