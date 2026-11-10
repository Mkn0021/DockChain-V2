"use client";

import { useOrg } from "@/components/dashboard/org-provider";
import { AccessDenied } from "@/components/settings/access-denied";
import { NewTemplateForm } from "@/components/templates/new-template-form";
import { can } from "@/lib/auth/permissions";

export default function NewTemplatePage() {
  const { organization, role } = useOrg();

  if (!can(role, "template", "create")) {
    return <AccessDenied />;
  }

  return (
    <NewTemplateForm
      organizationId={organization.id}
      organizationSlug={organization.slug}
    />
  );
}
