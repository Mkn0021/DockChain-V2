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
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

interface DataTablePaginationProps {
  first: number;
  last: number;
  total: number;
  pageSize: number;
  handlePageSizeChange: (size: number) => void;
  currentPage: number;
  totalPages: number;
  handlePageChange: (page: number) => void;
  disabled?: boolean;
  unit?: string;
}

export function DataTablePagination({
  first,
  last,
  total,
  pageSize,
  handlePageSizeChange,
  currentPage,
  totalPages,
  handlePageChange,
  disabled = false,
  unit = "",
}: DataTablePaginationProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="text-foreground/70">
          {first}–{last} of {total}
          {unit ? ` ${unit}` : ""}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hover:translate-y-0"
            )}
          >
            <span>{pageSize} / page</span>
            <ChevronDown className="size-3.5 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            matchTriggerWidth
            align="start"
            className="min-w-fit [&>*:first-child]:rounded-t-2xl"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <MenuItem
                key={size}
                size="sm"
                label={`${size} / page`}
                isActive={pageSize === size}
                onClick={() => handlePageSizeChange(size)}
              />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Pagination
        className="-mr-4"
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        disabled={disabled}
      />
    </div>
  );
}
