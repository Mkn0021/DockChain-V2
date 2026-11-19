"use client";

import { DataTablePage } from "@/components/dashboard/data-table";
import { useOrg } from "@/components/dashboard/org-provider";
import { InviteMemberDialog } from "@/components/settings/invite-member-dialog";
import { MembersTable } from "@/components/settings/members-table";
import { useMembers } from "@/lib/api/queries/members";
import { can } from "@/lib/auth/permissions";

export default function SettingsMembersPage() {
  const { organization, role } = useOrg();
  const canInvite = can(role, "invitation", "create");
  const membersQuery = useMembers(organization.id, 1, 0);
  const total = membersQuery.data?.total ?? 0;

  return (
    <DataTablePage
      canRead={can(role, "settings", "read")}
      headerAction={
        canInvite ? (
          <InviteMemberDialog
            organizationId={organization.id}
            currentMemberCount={total}
          />
        ) : null
      }
    >
      <MembersTable organizationId={organization.id} />
    </DataTablePage>
  );
}
