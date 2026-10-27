import Image from "next/image";
import Logo from "@/components/_ui/Logo";
import { Button } from "@/components/_ui/Button";
import { Navbar } from "@/components/_ui/Navbar";
import { Section } from "../../components/homepage/Section";
import SocialIcon from "../../components/homepage/SocialIcon";
import { FeatureCard } from "../../components/homepage/FeatureCard";
import { HERO_IMAGES, TESTIMONIALS, WHY_BLOCKCHAIN } from "@/data/homepage.data";

export default function HomePage() {
  return (
    <main>
      <Navbar className="dark">
        <Button variant="secondary" href="#how-it-works">
          How It Works?
        </Button>
        <Button variant="primary" href="/login">
          Login
        </Button>
      </Navbar>

      {/* Hero Section */}
      <Section>
        <div className="dark w-full max-w-3xl flex flex-col items-center gap-6 sm:gap-8">
          <div className="max-w-full flex flex-col items-center text-center">
            <h4>#1 Blockchain-Based Document Platform</h4>
            <h1>Verify and Issue Documents Securely with Blockchain</h1>
            <p className="whitespace-break-spaces  text-base md:text-lg mb-lg">
              Streamline document verification and issuance using secure blockchain technology.
              Enable users to verify and issue documents with full transparency and trust.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mt-2 w-full sm:w-auto">
            <Button variant="primary" href="/login" className="w-[80%] sm:w-auto">
              Issue Document
            </Button>
            <Button variant="secondary" href="/verify" className="w-[80%] sm:w-auto">
              Verify Document
            </Button>
          </div>
        </div>
        <div className="w-full max-w-6xl relative">
          {HERO_IMAGES.map((image, index) => (
            <div key={index} className={image.position}>
              <Image
                src={image.src}
                loading="eager"
                width={image.width}
                height={image.height}
                className={image.className}
                alt={image.alt}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Why Blockchain Section */}
      <Section>
        <h2 className="text-left self-start">Why Choose Blockchain?</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
          {WHY_BLOCKCHAIN.map((feature, index) => (
            <FeatureCard
              key={index}
              imageSrc={feature.imageSrc}
              imageAlt={feature.imageAlt}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </Section>

      {/* How It Works Section */}
      <Section>
        <div id="how-it-works" className="dark w-full bg-background-dark flex flex-col gap-12 p-20">
          <div className='text-left self-start'>
            <h2>Blockchain-Based Verification</h2>
            <p>API + WEB APP + NFC CARD</p>
          </div>
          <Image
            src="/assets/how-it-works.webp"
            loading="lazy"
            alt="How it works"
            width={800}
            height={600}
            className="w-full h-auto object-cover"
          />
        </div>
      </Section>

      {/* Testimonials Section */}
      <Section>
        <h2 className="text-left self-start">Verifiable credentials adoption worldwide</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <div key={index} className="bg-background-muted p-8">
              <h4 className="mt-0" role="heading" aria-level={3}>{testimonial.title}</h4>
              <p className="text-text-secondary">{testimonial.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Footer Section */}
      <footer>
        <Section className="dark bg-background-dark rounded-bl-none rounded-br-none">
          {/* Top part */}
          <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <h3 className="mb-6 sm:mb-0 text-center sm:text-left">
              Ready to get started?
            </h3>
            <div className="flex justify-center sm:justify-start">
              <Button variant="primary" href="/login">Sign up</Button>
              <Button variant="secondary" href="/verify">Verify a Document</Button>
            </div>
          </div>

          {/* Divider */}
          <hr className="w-full border-t border-border my-8"></hr>

          {/* Bottom part */}
          <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
            <div className="flex items-center gap-4 justify-center sm:justify-start">
              <Logo className='hidden sm:block' />
              <p className="text-sm text-center sm:text-left">
                © 2025 Blockchain-Based Document Verification
              </p>
            </div>

            <div className="flex gap-4 justify-center sm:justify-end">
              <SocialIcon platform="telegram" username="mkn0021" />
              <SocialIcon platform="youtube" username="mkn0021" />
              <SocialIcon platform="twitter" username="mkn0021" />
              <SocialIcon platform="github" username="mkn0021" />
              <SocialIcon platform="discord" username="mkn0021" />
              <SocialIcon platform="linkedin" username="mkn0021" />
            </div>
          </div>
        </Section>
      </footer>
    </main>
  );
}
