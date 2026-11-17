"use client";

import { cn } from "cn";
import { MdNavigateNext } from "react-icons/md";

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, currentPage + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={disabled || currentPage === 1}
        aria-label="Previous page"
        className="rounded-sm p-2 text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MdNavigateNext size={36} className="rotate-180" />
      </button>

      {pages.map((page) => {
        const isActive = page === currentPage;
        return (
          <button
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
            disabled={disabled}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-sm px-3 py-1 text-sm transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {page}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={disabled || currentPage === totalPages}
        aria-label="Next page"
        className="rounded-sm p-2 text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MdNavigateNext size={36} />
      </button>
    </div>
  );
}
