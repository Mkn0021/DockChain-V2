"use client";

import { cn } from "cn";
import type { IconType } from "react-icons";

interface MenuItemProps {
  icon: IconType;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  className?: string;
}

export function MenuItem({
  icon: Icon,
  label,
  isActive,
  onClick,
  className,
}: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "flex w-full items-center gap-4 rounded-md px-6 py-4 text-left font-medium transition-all duration-150",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-foreground/80 hover:bg-muted hover:text-foreground",
        className
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
