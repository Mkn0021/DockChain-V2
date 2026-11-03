import Link from "next/link";

import { Navbar } from "@/components/_ui/navbar";
import { FeatureSection } from "@/components/homepage/feature-section";
import { Footer } from "@/components/homepage/footer";
import { HeroSection } from "@/components/homepage/hero-section";
import { LifecycleSection } from "@/components/homepage/lifecycle-section";
import { TestimonialSection } from "@/components/homepage/testimonial";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <>
      <Navbar className="dark bg-black">
        <a
          href="#how-it-works"
          className={buttonVariants({ variant: "outline" })}
        >
          How It Works?
        </a>
        <Link className={buttonVariants({ variant: "default" })} href="/login">
          Login
        </Link>
      </Navbar>

      <main className="bg-background">
        <HeroSection />
        <FeatureSection />
        <LifecycleSection />
        <TestimonialSection />
        <Footer />
      </main>
    </>
  );
}
