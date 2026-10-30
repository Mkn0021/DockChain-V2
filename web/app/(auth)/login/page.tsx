import { CheckCircle2 } from "lucide-react";
import { Suspense } from "react";

import { GradientBackground } from "@/components/_ui/gradient-background";
import { Navbar } from "@/components/_ui/navbar";
import { Section, SectionHeader } from "@/components/_ui/section";
import { AuthPanel } from "@/components/auth/auth-panel";

const FEATURES = [
  "Issue certificates, degrees, and IDs from templates.",
  "Verify issuer ownership through DNS records.",
  "Sign batches directly with issuer wallets.",
  "Anchor document proofs on the blockchain.",
  "Protect personal data with encryption.",
  "Verify documents with QR codes and proofs.",
];

export default function LoginPage() {
  return (
    <div className="relative min-h-dvh w-full overflow-hidden">
      <GradientBackground className="before:pointer-events-none before:absolute before:inset-0 before:bg-linear-to-r before:from-black before:to-transparent before:content-['']" />
      <Navbar className="absolute top-2 left-0 z-20 w-full" />

      <main className="relative z-10 mx-auto grid min-h-dvh w-full max-w-7xl grid-cols-1 md:grid-cols-2">
        <Section className="dark h-full items-start justify-center">
          <SectionHeader>Secure Document Verification</SectionHeader>

          <ul className="space-y-4">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <CheckCircle2
                  size={24}
                  className="shrink-0 text-foreground/70"
                />
                <span className="text-left text-sm leading-relaxed text-foreground/70 sm:text-base">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section className="h-full items-center justify-center py-0">
          <Suspense>
            <AuthPanel />
          </Suspense>
        </Section>
      </main>
    </div>
  );
}
