import { cn } from "cn";

import { Section, SectionHeader } from "../_ui/section";

const FEATURES = [
  {
    title: "Sign and Issue",
    description:
      "Create documents from your templates, then sign each batch with your own wallet. The platform never holds your keys.",
  },
  {
    title: "Anchor On-Chain",
    description:
      "Only a Merkle root and your signature go on-chain. Personal data stays encrypted, and the record can't be changed afterwards.",
  },
  {
    title: "Verify Anywhere",
    description:
      "Anyone can scan the QR code and check the issuer, the time and the revocation status straight from the chain.",
  },
];

export function FeatureSection() {
  return (
    <Section>
      <SectionHeader as="h2">Three steps to trusted documents</SectionHeader>
      <div className="grid w-full grid-cols-1 gap-4 overflow-hidden lg:grid-cols-3 lg:rounded-4xl">
        {FEATURES.map((feature) => (
          <FeatureCard
            key={feature.title}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>
    </Section>
  );
}

interface FeatureCardProps {
  title: string;
  children?: React.ReactNode;
  description: string;
  className?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  children,
  title,
  description,
  className,
}) => (
  <div className="flex aspect-8/11 w-full flex-col overflow-hidden rounded-md bg-linear-to-t from-black from-10% via-[#081E83] to-[#0F2CB7] p-6">
    <div className={cn("mb-auto aspect-square h-auto w-full", className)}>
      {children}
    </div>
    <div className="dark mt-2 h-full">
      <h3 className="mb-2 text-2xl font-medium text-foreground">{title}</h3>
      <p className="text-balance text-muted-foreground">{description}</p>
    </div>
  </div>
);
