"use client";

import { use } from "react";

import { useOrg } from "@/components/dashboard/org-provider";
import { DocumentDetailView } from "@/components/documents/document-detail";
import { AccessDenied } from "@/components/settings/access-denied";
import { can } from "@/lib/auth/permissions";

interface DocumentDetailPageProps {
  params: Promise<{ org: string; id: string }>;
}

export default function DocumentDetailPage({
  params,
}: DocumentDetailPageProps) {
  const { org: orgSlug, id: documentId } = use(params);
  const { role, organization } = useOrg();

  if (!can(role, "document", "read")) {
    return <AccessDenied />;
  }

  return (
    <main>
      <DocumentDetailView
        organizationId={organization.id}
        documentId={documentId}
        orgSlug={orgSlug}
      />
    </main>
  );
}
