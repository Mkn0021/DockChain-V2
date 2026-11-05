import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OrgProvider } from "@/components/dashboard/org-provider";
import { getMemberRole, getOrganizations, getSession } from "@/lib/server-auth";

export default async function OrgLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ org: string }>;
}) {
  const { org: slug } = await params;

  const session = await getSession();
  if (!session) {
    redirect(`/login?redirect=/${slug}/dashboard`);
  }

  const rawOrganizations = await getOrganizations();
  const organizations = rawOrganizations.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    logo: o.logo ?? null,
  }));

  const organization = organizations.find((o) => o.slug === slug);
  if (!organization) {
    notFound();
  }

  const role = await getMemberRole(organization.id);

  return (
    <OrgProvider
      value={{
        organization,
        organizations,
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image ?? null,
        },
        role,
      }}
    >
      <DashboardShell>{children}</DashboardShell>
    </OrgProvider>
  );
}
