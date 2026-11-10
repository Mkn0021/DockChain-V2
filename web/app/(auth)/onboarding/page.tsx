import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CreateOrganizationForm } from "@/components/auth/create-organization-form";
import { GradientBackground } from "@/components/ui/gradient-background";
import { Navbar } from "@/components/ui/navbar";
import { Section } from "@/components/ui/section";
import { getHomePath, getOrganizations, getSession } from "@/lib/auth/server";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirect=/onboarding");
  }

  const { new: createAnother } = await searchParams;
  const organizations = await getOrganizations();
  if (!createAnother && organizations.length > 0) {
    redirect((await getHomePath()) ?? "/");
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <GradientBackground className="before:pointer-events-none before:absolute before:inset-0 before:bg-linear-to-r before:from-black before:to-transparent before:content-['']" />
      <Navbar className="absolute top-2 left-0 z-20 w-full" />
      <Section className="relative z-20 h-full items-center justify-center">
        <Suspense>
          <CreateOrganizationForm />
        </Suspense>
      </Section>
    </div>
  );
}
