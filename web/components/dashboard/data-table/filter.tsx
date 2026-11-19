"use client";

import { cn } from "cn";
import { ChevronDown } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MenuItem } from "@/components/ui/menu-item";

export interface DataTableFilterOption {
  value: string;
  label: string;
}

interface DataTableFilterProps {
  label: string;
  options: readonly DataTableFilterOption[];
  value: string;
  onChange: (value: string) => void;
  matchTriggerWidth?: boolean;
  align?: "start" | "end";
}

export function DataTableFilter({
  label,
  options,
  value,
  onChange,
  matchTriggerWidth = true,
  align = "start",
}: DataTableFilterProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-11 hover:translate-y-0"
        )}
      >
        <span>{label}</span>
        <ChevronDown className="size-4 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        matchTriggerWidth={matchTriggerWidth}
        align={align}
        className="min-w-fit [&>*:first-child]:rounded-t-2xl"
      >
        {options.map((opt) => (
          <MenuItem
            key={opt.value || "all"}
            size="sm"
            label={opt.label}
            isActive={value === opt.value}
            onClick={() => onChange(opt.value)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
