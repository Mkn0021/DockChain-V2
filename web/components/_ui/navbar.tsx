import { cn } from "cn";
import React from "react";

import Logo from "./logo";

interface NavbarProps {
  className?: string;
  children?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({ className, children }) => (
  <nav
    className={cn(
      "flex w-full items-center justify-between px-6 py-8 md:px-12 lg:px-20",
      className
    )}
  >
    <Logo />
    <div className="hidden gap-4 md:flex">{children}</div>
  </nav>
);
