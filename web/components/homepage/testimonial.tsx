"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

import { Button } from "../ui/button";
import { CarouselViewport, useCarousel } from "../ui/carousel";
import { Section, SectionHeader } from "../ui/section";

const TESTIMONIALS = [
  {
    quote:
      "Issuing credentials is much more straightforward when documents can be grouped into batches and anchored on-chain, with each issuer signing using their own wallet.",
    name: "Sarah Malik",
    role: "University Registrar",
    org: "Northstar University",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    quote:
      "The QR-based verification flow makes it easier to check document integrity without relying entirely on the platform that issued the credential.",
    name: "Daniel Reyes",
    role: "Credential Operations Lead",
    org: "Meridian Education Group",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    quote:
      "Keeping personal information encrypted while anchoring document proofs on-chain offers a practical balance between privacy and independent verification.",
    name: "Amina Rahman",
    role: "Digital Records Manager",
    org: "Civic Records Lab",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
  },
  {
    quote:
      "Permanent, verifiable revocation records help organizations communicate when a credential is no longer valid, rather than leaving verification decisions ambiguous.",
    name: "David Chen",
    role: "Trust Platform Engineer",
    org: "Verity Systems",
    avatar: "https://randomuser.me/api/portraits/men/75.jpg",
  },
  {
    quote:
      "Reusable document templates let us support different credential types without deploying a separate smart contract for every template, making the system easier to maintain.",
    name: "Leila Hassan",
    role: "Product Lead",
    org: "CredentialWorks",
    avatar: "https://randomuser.me/api/portraits/women/12.jpg",
  },
];

interface TestimonialCardProps {
  quote: string;
  name: string;
  role: string;
  org: string;
  avatar: string;
}

function TestimonialCard({
  quote,
  name,
  role,
  org,
  avatar,
}: TestimonialCardProps) {
  return (
    <div className="flex h-full flex-col justify-between rounded-3xl border border-neutral-200/70 bg-neutral-100 p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <blockquote className="text-lg leading-relaxed text-foreground">
        &ldquo;{quote}&rdquo;
      </blockquote>

      <div className="mt-8 flex items-center gap-4">
        <div className="relative flex size-12 shrink-0 overflow-hidden rounded-full border border-border bg-primary/10">
          <Image
            src={avatar}
            alt={name}
            width={48}
            height={48}
            className="aspect-square h-full w-full object-cover"
          />
        </div>
        <div>
          <div className="font-semibold text-foreground">{name}</div>
          <div className="text-sm text-muted-foreground">
            {role}, {org}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TestimonialSection() {
  const carousel = useCarousel(TESTIMONIALS.length);
  const handlePrev = () => carousel.prev();
  const handleNext = () => carousel.next();

  return (
    <Section className="overflow-hidden">
      <SectionHeader>Verifiable credentials adoption worldwide</SectionHeader>

      <div className="relative w-full">
        <CarouselViewport carousel={carousel} className="py-4">
          {TESTIMONIALS.map((testimonial) => (
            <div
              key={testimonial.name}
              className="w-full shrink-0 px-3 sm:w-1/2 lg:w-1/3"
            >
              <TestimonialCard {...testimonial} />
            </div>
          ))}
        </CarouselViewport>

        <div className="mx-auto mt-8 flex w-full max-w-7xl justify-end px-4 md:px-8">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handlePrev}
              disabled={!carousel.canPrev}
              aria-label="Previous testimonials"
            >
              <ChevronLeft className="size-6" />
            </Button>
            <Button
              variant="secondary"
              onClick={handleNext}
              disabled={!carousel.canNext}
              aria-label="Next testimonials"
            >
              <ChevronRight className="size-6" />
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
