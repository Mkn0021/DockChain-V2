"use client";

import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

import { useOrg } from "@/components/dashboard/org-provider";
import { DocumentsTable } from "@/components/documents/documents-table";
import { AccessDenied } from "@/components/settings/access-denied";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";

export default function DocumentsPage() {
  const { organization, role } = useOrg();

  const canRead = can(role, "document", "read");
  const canCreate = can(role, "document", "create");

  if (!canRead) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-4">
      {canCreate ? (
        <div className="flex justify-end">
          <Link
            className={cn(
              buttonVariants(),
              "flex items-center justify-center hover:translate-y-0"
            )}
            href={`/${organization.slug}/documents/new`}
          >
            <PlusIcon className="size-5" />
            Issue document
          </Link>
        </div>
      ) : null}
      <DocumentsTable
        organizationId={organization.id}
        organizationSlug={organization.slug}
      />
    </div>
  );
}
