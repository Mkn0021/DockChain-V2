"use client";

import { cn } from "cn";

export type BadgeTone = "default" | "success" | "warning" | "danger" | "info";

const TONE_STYLES: Record<BadgeTone, string> = {
  default: "border-border bg-muted text-foreground/80",
  success:
    "border-green-600/30 bg-green-500/10 text-green-600 dark:text-green-400",
  warning:
    "border-amber-600/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "border-red-600/30 bg-red-500/10 text-red-600 dark:text-red-400",
  info: "border-blue-600/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

interface StatusBadgeProps {
  label: string;
  tone: BadgeTone;
  className?: string;
}

export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border-t px-3 py-1 text-xs font-medium capitalize shadow-sm",
        TONE_STYLES[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
