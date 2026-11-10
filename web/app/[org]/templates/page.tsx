"use client";

import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

import { useOrg } from "@/components/dashboard/org-provider";
import { AccessDenied } from "@/components/settings/access-denied";
import { TemplatesTable } from "@/components/templates/templates-table";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";

export default function TemplatesPage() {
  const { organization, role } = useOrg();

  const canRead = can(role, "template", "read");
  const canCreate = can(role, "template", "create");

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
            href={`/${organization.slug}/templates/new`}
          >
            <PlusIcon className="size-5" />
            New template
          </Link>
        </div>
      ) : null}
      <TemplatesTable
        organizationId={organization.id}
        organizationSlug={organization.slug}
      />
    </div>
  );
}
