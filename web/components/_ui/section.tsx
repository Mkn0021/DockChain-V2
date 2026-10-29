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
