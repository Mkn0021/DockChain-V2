"use client";

import {
  columnFilteringFeature,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  flexRender,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { cn } from "cn";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";

import { PageError } from "@/components/settings/page-states";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "./pagination";

import type { ReactNode } from "react";

export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric },
});

const SORT_ICONS = { asc: ArrowUp, desc: ArrowDown } as const;

export function DataTableColumnHeader({
  column,
  title,
}: {
  column: {
    getIsSorted: () => false | "asc" | "desc";
    getCanSort: () => boolean;
    getToggleSortingHandler: () => ((event: unknown) => void) | undefined;
  };
  title: string;
}) {
  const sorted = column.getIsSorted();
  const Icon = sorted ? SORT_ICONS[sorted] : ArrowUpDown;

  if (!column.getCanSort()) {
    return <span className="text-sm font-medium">{title}</span>;
  }

  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium hover:bg-muted"
    >
      {title}
      <Icon className="size-3.5 text-muted-foreground" />
    </button>
  );
}

const DEFAULT_SKELETON_WIDTHS = ["w-24", "w-16", "w-20", "w-28", "w-12"];

function SkeletonRows({
  rows,
  columns,
  widths,
}: {
  rows: number;
  columns: number;
  widths?: string[];
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={`skeleton-${rowIndex}`}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <TableCell
              key={`skeleton-${rowIndex}-${colIndex}`}
              className="px-6 py-4"
            >
              <Skeleton
                className={cn(
                  "h-4",
                  widths?.[colIndex] ??
                    DEFAULT_SKELETON_WIDTHS[
                      colIndex % DEFAULT_SKELETON_WIDTHS.length
                    ]
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

interface DataTableToolbarProps {
  showSearch: boolean;
  searchValue: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder: string;
  filters?: ReactNode;
  trailing?: ReactNode;
  sticky: boolean;
}

function DataTableToolbar({
  showSearch,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  trailing,
  sticky,
}: DataTableToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-end justify-between gap-3 px-6",
        sticky &&
          "sticky top-0 z-10 bg-linear-to-b from-background from-70% to-transparent pt-1 pb-6"
      )}
    >
      <div className="-ml-6 flex flex-1 items-center gap-3">
        {showSearch ? (
          <div className="relative max-w-sm flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="border border-foreground/40 bg-background pl-9 shadow-sm"
            />
          </div>
        ) : null}
        {filters}
      </div>
      {trailing}
    </div>
  );
}

interface DataTablePaginationState {
  first: number;
  last: number;
  total: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

interface DataTableProps<T extends RowData> {
  data: T[];
  columns: ColumnDef<typeof dataTableFeatures, T>[];
  isPending?: boolean;
  isError?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  emptyMessage?: string;
  skeletonRows?: number;
  skeletonWidths?: string[];
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  unit?: string;
  pagination: DataTablePaginationState;
  renderBody?: (children: ReactNode, key: string) => ReactNode;
  bodyKey?: string;
  dimWhenRefetching?: boolean;
  isRefetching?: boolean;
  stickyToolbar?: boolean;
  className?: string;
}

// eslint-disable-next-line complexity
export function DataTable<T extends RowData>({
  data,
  columns,
  isPending = false,
  isError = false,
  errorTitle = "Failed to load data",
  errorMessage,
  emptyMessage = "Nothing here yet.",
  skeletonRows = 5,
  skeletonWidths,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  unit = "records",
  pagination,
  renderBody,
  bodyKey,
  dimWhenRefetching = false,
  isRefetching = false,
  stickyToolbar = true,
  className,
}: DataTableProps<T>) {
  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    globalFilterFn: "includesString",
    state: {
      globalFilter: searchValue ?? "",
    },
    onGlobalFilterChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(searchValue ?? "") : updater;
      onSearchChange?.(String(next ?? ""));
    },
  });

  if (isError) {
    return <PageError title={errorTitle} message={errorMessage} />;
  }

  const showSearch = onSearchChange !== undefined;
  const resolvedBodyKey = bodyKey ?? "body";
  const showSkeleton = isPending || isRefetching;
  const showToolbar = showSearch || filters || pagination;

  let bodyContent: ReactNode;

  if (showSkeleton) {
    bodyContent = (
      <SkeletonRows
        rows={skeletonRows}
        columns={columns.length}
        widths={skeletonWidths}
      />
    );
  } else if (table.getRowModel().rows.length === 0) {
    bodyContent = (
      <TableRow>
        <TableCell
          colSpan={columns.length}
          className="h-24 px-6 text-center text-sm text-muted-foreground"
        >
          {emptyMessage}
        </TableCell>
      </TableRow>
    );
  } else {
    bodyContent = table.getRowModel().rows.map((row) => (
      <TableRow key={row.id}>
        {row.getAllCells().map((cell) => (
          <TableCell key={cell.id} className="px-6 py-4">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ));
  }

  const bodyNode = renderBody ? (
    renderBody(bodyContent, resolvedBodyKey)
  ) : (
    <TableBody key={resolvedBodyKey}>{bodyContent}</TableBody>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {showToolbar ? (
        <DataTableToolbar
          showSearch={showSearch}
          searchValue={searchValue ?? ""}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          filters={filters}
          trailing={
            <span className="text-sm text-foreground/80">
              {pagination.total} {unit}
            </span>
          }
          sticky={stickyToolbar}
        />
      ) : null}

      <div
        className={cn(
          "overflow-hidden rounded-md border-2 border-foreground/30 transition-opacity",
          dimWhenRefetching && isRefetching && !showSkeleton && "opacity-60"
        )}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-16 border-b-2 border-foreground/30 px-6"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          {bodyNode}
        </Table>
      </div>

      <DataTablePagination
        first={pagination.first}
        last={pagination.last}
        total={pagination.total}
        pageSize={pagination.pageSize}
        handlePageSizeChange={pagination.onPageSizeChange}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        handlePageChange={pagination.onPageChange}
        disabled={pagination.disabled ?? isPending}
        unit={unit}
      />
    </div>
  );
}
