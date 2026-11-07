"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";

import { Button } from "../ui/button";
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

export function TestimonialSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setVisibleCards(1);
      } else if (width < 1024) {
        setVisibleCards(2);
      } else {
        setVisibleCards(3);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const maxIndex = Math.max(0, TESTIMONIALS.length - visibleCards);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  }, [maxIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  return (
    <Section className="overflow-hidden">
      <SectionHeader>Verifiable credentials adoption worldwide</SectionHeader>

      <div className="relative w-full">
        <div className="overflow-hidden py-4" ref={containerRef}>
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${currentIndex * (100 / visibleCards)}%)`,
            }}
          >
            {TESTIMONIALS.map((testimonial) => (
              <div
                key={testimonial.name}
                className="w-full shrink-0 px-3 sm:w-1/2 lg:w-1/3"
              >
                <div className="flex h-full flex-col justify-between rounded-3xl border border-neutral-200/70 bg-neutral-100 p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <blockquote className="text-lg leading-relaxed text-foreground">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>

                  <div className="mt-8 flex items-center gap-4">
                    <div className="relative flex size-12 shrink-0 overflow-hidden rounded-full border border-border bg-primary/10">
                      <Image
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        width={48}
                        height={48}
                        className="aspect-square h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {testimonial.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {testimonial.role}, {testimonial.org}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-8 flex w-full max-w-7xl justify-end px-4 md:px-8">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Previous testimonials"
            >
              <ChevronLeft className="size-6" />
            </Button>
            <Button
              variant="secondary"
              onClick={handleNext}
              disabled={currentIndex === maxIndex}
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
