import { cn } from "cn";
import React from "react";

import Logo from "../ui/logo";

import { Section } from "./section";

interface NavbarProps {
  className?: string;
  children?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({ className, children }) => (
  <Section
    as="nav"
    className={cn(
      "flex w-full flex-row items-center justify-between py-8",
      className
    )}
  >
    <Logo />
    <div className="hidden gap-4 md:flex">{children}</div>
  </Section>
);
