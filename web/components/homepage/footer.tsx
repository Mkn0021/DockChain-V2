import Link from "next/link";
import {
  FaTelegram,
  FaYoutube,
  FaTwitter,
  FaGithub,
  FaDiscord,
  FaLinkedin,
} from "react-icons/fa";

import { buttonVariants } from "../ui/button";
import Logo from "../ui/logo";
import { Section, SectionHeader } from "../ui/section";
import { Separator } from "../ui/separator";

const socials = [
  { icon: FaTelegram, url: "https://t.me/mkn0021" },
  { icon: FaYoutube, url: "https://youtube.com/@mkn0021" },
  { icon: FaTwitter, url: "https://x.com/mkn0021" },
  { icon: FaGithub, url: "https://github.com/mkn0021" },
  { icon: FaDiscord, url: "https://discord.com/users/mkn0021" },
  { icon: FaLinkedin, url: "https://linkedin.com/in/mkn0021" },
];

export function Footer() {
  return (
    <footer className="dark relative rounded-t-3xl bg-black">
      <Section
        as="div"
        className="flex w-full flex-col pb-10 sm:flex-row sm:items-center sm:justify-between"
      >
        <SectionHeader className="mb-6 text-center sm:mb-0 sm:text-left sm:text-3xl">
          Ready to get started?
        </SectionHeader>

        <div className="flex justify-center gap-2 sm:justify-start">
          <Link
            className={buttonVariants({ variant: "default" })}
            href="/login"
          >
            Sign up
          </Link>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/verify"
          >
            Verify Document
          </Link>
        </div>
      </Section>

      <Separator />

      <Section
        as="div"
        className="flex w-full flex-row items-center justify-between gap-6 pt-10"
      >
        <Logo className="hidden sm:block" />

        <div className="flex w-full justify-center gap-4 sm:w-auto sm:justify-end">
          {socials.map(({ icon: Icon, url }) => (
            <Link
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={url}
            >
              <Icon size={28} color="white" />
            </Link>
          ))}
        </div>
      </Section>

      <p className="absolute bottom-4 w-full text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Blockchain-Based Document Verification
      </p>
    </footer>
  );
}
