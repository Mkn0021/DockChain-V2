import Link from "next/link";

import { Navbar } from "@/components/_ui/navbar";
import { buttonVariants } from "@/components/ui/button";
import { HeroSection } from "@/components/homepage/hero-section";
import { FeatureSection } from "@/components/homepage/feature-section";
import { LifecycleSection } from "@/components/homepage/lifecycle-section";
import { TestimonialSection } from "@/components/homepage/testimonial";
import { Footer } from "@/components/homepage/footer";

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
