"use client";

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
    <div className="space-y-4">
      {canInvite ? (
        <div className="flex justify-end">
          <InviteMemberDialog
            organizationId={organization.id}
            currentMemberCount={total}
          />
        </div>
      ) : null}

      <MembersTable organizationId={organization.id} />
    </div>
  );
}
