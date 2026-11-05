"use client";

import { DangerZone } from "@/components/settings/danger-zone";
import { GeneralForm } from "@/components/settings/general-form";
import { PageError, PageSkeleton } from "@/components/settings/page-states";
import { useOrg } from "@/components/dashboard/org-provider";
import { can } from "@/lib/permissions";
import { useOrganization } from "@/lib/settings/queries";

export default function SettingsGeneralPage() {
  const { organization, role } = useOrg();
  const query = useOrganization(organization.id);

  if (query.isPending) {
    return <PageSkeleton />;
  }

  if (query.isError) {
    return (
      <PageError
        title="Failed to load organization"
        message={query.error instanceof Error ? query.error.message : undefined}
      />
    );
  }

  const org = query.data;
  const canEdit = can(role, "organization", "update");
  const canDelete = can(role, "organization", "delete");

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <GeneralForm
        organizationId={org.id}
        initialName={org.name}
        initialSlug={org.slug}
        canEdit={canEdit}
      />

      <DangerZone
        organizationId={org.id}
        organizationName={org.name}
        canDelete={canDelete}
      />
    </div>
  );
}
