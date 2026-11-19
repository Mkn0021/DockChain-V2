"use client";

import { DataTablePage } from "@/components/dashboard/data-table";
import { useOrg } from "@/components/dashboard/org-provider";
import { ConnectWalletDialog } from "@/components/wallets/connect-wallet-dialog";
import { WalletsTable } from "@/components/wallets/wallets-table";
import { can } from "@/lib/auth/permissions";

export default function WalletsPage() {
  const { organization, role } = useOrg();
  const canCreate = can(role, "wallet", "create");

  return (
    <DataTablePage
      canRead={can(role, "wallet", "read")}
      headerAction={
        canCreate ? (
          <ConnectWalletDialog organizationId={organization.id} />
        ) : null
      }
    >
      <WalletsTable organizationId={organization.id} />
    </DataTablePage>
  );
}
