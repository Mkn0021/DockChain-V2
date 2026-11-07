import { cn } from "cn";
import { Check } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "../ui/button";
import { GradientBackground } from "../ui/gradient-background";
import { Section } from "../ui/section";

export const KEY_FEATURES = [
  "Create Organization",
  "Design Document Templates",
  "Sign Batches With Wallet",
  "Anchor Proofs On-Chain",
  "Verify Any Document",
];

interface KeyFeaturesProps {
  features?: string[];
}

export function HeroSection() {
  return (
    <Section className="relative gap-10">
      <GradientBackground />
      <div className="dark z-1 flex w-full max-w-3xl flex-col items-center gap-10">
        <div className="flex flex-col items-center text-center">
          <div className="text-lg font-medium text-foreground md:text-xl">
            Tamper-proof documents, verified on-chain
          </div>
          <h1 className="mt-2 text-6xl font-medium tracking-tight text-balance text-foreground">
            Issue and verify documents anyone can trust
          </h1>
          <p className="mt-6 text-xl text-balance text-muted-foreground">
            Sign batches with your own wallet and anchor them on-chain. Anyone
            can check a document in seconds, without trusting the platform.
          </p>
        </div>

        <div className="flex w-full flex-col items-center justify-center gap-3 *:w-[80%] sm:w-auto sm:flex-row sm:gap-4 *:sm:w-auto">
          <Link
            className={buttonVariants({ variant: "default" })}
            href="/login"
          >
            Issue Document
          </Link>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/verify"
          >
            Verify Document
          </Link>
        </div>
      </div>

      <div className="dark relative mt-4 w-full">
        <KeyFeatures />
        <DashboardVisual />
        <HeroMobileVisual />
      </div>
    </Section>
  );
}

export const DashboardVisual = () => (
  <div className="mx-16 aspect-7/4 rounded-4xl border border-border bg-muted p-4 shadow-sm dark:border-[#ccc] dark:bg-white">
    <div className="h-full w-full rounded-2xl border border-border bg-background dark:border-[#ccc] dark:bg-white">
      {/* Dashboard content */}
    </div>
  </div>
);

export const HeroMobileVisual = () => (
  <div
    className={cn(
      "absolute top-1/2 right-0 hidden w-64 -translate-y-1/2",
      "aspect-9/19.5 rounded-[36px] border border-border bg-muted p-1 shadow-2xl md:block dark:bg-card"
    )}
  >
    <div className="h-full w-full overflow-hidden rounded-[32px] border border-border bg-background dark:bg-background">
      {/* Content for the mobile visual */}
    </div>
  </div>
);

export function KeyFeatures({ features = KEY_FEATURES }: KeyFeaturesProps) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-border bg-card p-8 shadow-sm",
        "absolute bottom-[10%] left-0 hidden md:block"
      )}
    >
      <h3 className="mb-8 text-2xl font-medium text-foreground">
        Key Features
      </h3>
      <ul className="flex flex-col gap-6">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-5" strokeWidth={3} />
            </div>
            <span className="text-lg text-foreground">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
