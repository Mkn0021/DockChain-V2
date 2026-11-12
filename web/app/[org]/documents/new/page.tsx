"use client";

import { useOrg } from "@/components/dashboard/org-provider";
import { IssueWizard } from "@/components/documents/issue-wizard";
import { AccessDenied } from "@/components/settings/access-denied";
import { can } from "@/lib/auth/permissions";

export default function NewDocumentPage() {
  const { role, organization } = useOrg();

  if (!can(role, "document", "create")) {
    return <AccessDenied />;
  }

  return (
    <main>
      <IssueWizard organizationId={organization.id} />
    </main>
  );
}
