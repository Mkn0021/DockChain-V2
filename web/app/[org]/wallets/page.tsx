"use client";

import { useOrg } from "@/components/dashboard/org-provider";
import { AccessDenied } from "@/components/settings/access-denied";
import { ConnectWalletDialog } from "@/components/wallets/connect-wallet-dialog";
import { WalletsTable } from "@/components/wallets/wallets-table";
import { can } from "@/lib/auth/permissions";

export default function WalletsPage() {
  const { organization, role } = useOrg();
  const canRead = can(role, "wallet", "read");
  const canCreate = can(role, "wallet", "create");

  if (!canRead) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-4">
      {canCreate ? (
        <div className="flex justify-end">
          <ConnectWalletDialog organizationId={organization.id} />
        </div>
      ) : null}
      <WalletsTable organizationId={organization.id} />
    </div>
  );
}
