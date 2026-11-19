"use client";

import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

import { DataTablePage } from "@/components/dashboard/data-table";
import { useOrg } from "@/components/dashboard/org-provider";
import { TemplatesTable } from "@/components/templates/templates-table";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";

export default function TemplatesPage() {
  const { organization, role } = useOrg();
  const canCreate = can(role, "template", "create");

  return (
    <DataTablePage
      canRead={can(role, "template", "read")}
      headerAction={
        canCreate ? (
          <Link
            className={cn(
              buttonVariants(),
              "flex items-center justify-center hover:translate-y-0"
            )}
            href={`/${organization.slug}/templates/new`}
          >
            <PlusIcon className="size-5" />
            New template
          </Link>
        ) : null
      }
    >
      <TemplatesTable
        organizationId={organization.id}
        organizationSlug={organization.slug}
      />
    </DataTablePage>
  );
}
