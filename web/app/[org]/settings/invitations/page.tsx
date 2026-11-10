"use client";

import { useOrg } from "@/components/dashboard/org-provider";
import { AccessDenied } from "@/components/settings/access-denied";
import { InvitationsTable } from "@/components/settings/invitations-table";
import { InviteMemberDialog } from "@/components/settings/invite-member-dialog";
import { useMembers } from "@/lib/api/queries/members";
import { can } from "@/lib/auth/permissions";

export default function SettingsInvitationsPage() {
  const { organization, role } = useOrg();
  const membersQuery = useMembers(organization.id, 1, 0);

  const canRead =
    can(role, "invitation", "create") || can(role, "invitation", "cancel");
  const canInvite = can(role, "invitation", "create");
  const total = membersQuery.data?.total ?? 0;

  if (!canRead) {
    return <AccessDenied />;
  }

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
      <InvitationsTable organizationId={organization.id} />
    </div>
  );
}
