import { redirect } from "next/navigation";

import { AcceptInvitationCard } from "@/components/auth/accept-invitation-card";
import { GradientBackground } from "@/components/ui/gradient-background";
import { Navbar } from "@/components/ui/navbar";
import { Section } from "@/components/ui/section";
import { getSession } from "@/lib/server-auth";

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    redirect(`/login?redirect=/accept-invitation/${id}`);
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <GradientBackground className="before:pointer-events-none before:absolute before:inset-0 before:bg-linear-to-r before:from-black before:to-transparent before:content-['']" />
      <Navbar className="absolute top-2 left-0 z-20 w-full" />
      <Section className="relative z-20 h-full items-center justify-center">
        <AcceptInvitationCard invitationId={id} />
      </Section>
    </div>
  );
}
