import { cn } from "cn";
import React from "react";

interface SectionProps {
  as?: "section" | "div" | "nav" | "header" | "footer";
  children: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  as: Component = "section",
  children,
  className,
}) => (
  <Component
    className={cn(
      "flex w-full flex-col items-center px-6 py-20 md:px-12 lg:px-20",
      className
    )}
  >
    {children}
  </Component>
);

export const SectionHeader = ({
  as: Component = "h2",
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  className?: string;
  children: React.ReactNode;
}) => (
  <Component
    className={cn(
      "mb-10 self-start text-left text-3xl font-medium tracking-tight text-foreground sm:text-4xl",
      className
    )}
  >
    {children}
  </Component>
);
