import { sql } from "drizzle-orm";

import { db } from "../../db";
import { AppError } from "../../shared/errors";
import { BatchService } from "./batch.service";

export const findWalletsDueForSeal = async (): Promise<
  { issuerWalletId: string; organizationId: string }[]
> => {
  const rows = await db.execute<{
    issuer_wallet_id: string;
    organization_id: string;
  }>(sql`
    SELECT w.id AS issuer_wallet_id, w.organization_id
    FROM issuer_wallets w
    JOIN organization_settings s ON s.organization_id = w.organization_id
    WHERE w.status = 'active'
      AND s.auto_seal = true
      AND EXISTS (
        SELECT 1 FROM documents d
        WHERE d.organization_id = w.organization_id
          AND d.issuer_wallet_id = w.id
          AND d.status = 'ready'
          AND d.batch_id IS NULL
          AND d.claimed_issued_at IS NOT NULL
          AND d.claimed_issued_at <= (now() AT TIME ZONE 'UTC') - (s.batch_window_minutes || ' minutes')::interval
      )
  `);

  return rows.map((r) => ({
    issuerWalletId: r.issuer_wallet_id,
    organizationId: r.organization_id,
  }));
};

export const runBatchScheduler = async (): Promise<void> => {
  const wallets = await findWalletsDueForSeal();

  for (const wallet of wallets) {
    try {
      await BatchService.sealNow(
        wallet.organizationId,
        wallet.issuerWalletId,
        "system"
      );
    } catch (error) {
      if (
        error instanceof AppError &&
        error.message === "No ready documents available to seal for this wallet"
      ) {
        continue;
      }
      console.error("[batch-scheduler] seal failed", {
        error: error instanceof Error ? error.message : error,
        issuerWalletId: wallet.issuerWalletId,
        organizationId: wallet.organizationId,
      });
    }
  }
};
