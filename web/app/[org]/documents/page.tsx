"use client";

import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

import { DataTablePage } from "@/components/dashboard/data-table";
import { useOrg } from "@/components/dashboard/org-provider";
import { DocumentsTable } from "@/components/documents/documents-table";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";

export default function DocumentsPage() {
  const { organization, role } = useOrg();
  const canCreate = can(role, "document", "create");

  return (
    <DataTablePage
      canRead={can(role, "document", "read")}
      headerAction={
        canCreate ? (
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
        ) : null
      }
    >
      <DocumentsTable
        organizationId={organization.id}
        organizationSlug={organization.slug}
      />
    </DataTablePage>
  );
}
