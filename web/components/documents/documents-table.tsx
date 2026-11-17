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
} from "@tanstack/react-table";
import { cn } from "cn";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Search,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { PageError } from "@/components/settings/page-states";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { MenuItem } from "@/components/ui/menu-item";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useDocuments,
  type DocumentListRow,
} from "@/lib/api/queries/documents";
import { formatDate } from "@/lib/utils";

const SORT_ICONS = { asc: ArrowUp, desc: ArrowDown } as const;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "ready", label: "Ready" },
  { value: "batched", label: "Batched" },
  { value: "issued", label: "Issued" },
  { value: "revoked", label: "Revoked" },
] as const;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

const STATUS_STYLES: Record<DocumentListRow["status"], string> = {
  draft: "border-border bg-muted text-foreground/80",
  ready: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  batched:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  issued:
    "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
  revoked: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
};

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric },
});

const bodyVariants = {
  enter: { opacity: 0, filter: "blur(6px)" },
  center: {
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const },
  },
  exit: {
    opacity: 0,
    filter: "blur(4px)",
    transition: { duration: 0.12 },
  },
};

const MotionTableBody = motion.create(TableBody);

function DataTableColumnHeader({
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

function StatusBadge({ status }: { status: DocumentListRow["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        STATUS_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}

export function DocumentsTable({
  organizationId,
  organizationSlug,
}: {
  organizationId: string;
  organizationSlug: string;
}) {
  const [status, setStatus] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState<number>(1);

  const offset = (page - 1) * pageSize;
  const query = useDocuments(organizationId, {
    status: status ? (status as DocumentListRow["status"]) : undefined,
    limit: pageSize,
    offset,
  });

  const rows = (query.data?.data ?? []) as DocumentListRow[];
  const total = query.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : offset + 1;
  const lastRow = Math.min(offset + rows.length, total);
  const activeStatusLabel =
    STATUS_OPTIONS.find((o) => o.value === status)?.label ?? "All statuses";

  function handleStatusChange(next: string) {
    setStatus(next);
    setPage(1);
  }

  function handlePageSizeChange(next: number) {
    setPageSize(next);
    setPage(1);
  }

  const columns: ColumnDef<typeof features, DocumentListRow>[] = [
    {
      id: "id",
      accessorFn: (row) => row.id,
      header: "Document",
      cell: ({ row }) => (
        <Link
          href={`/${organizationSlug}/documents/${row.original.id}`}
          className="flex flex-col hover:underline"
        >
          <span className="font-mono text-sm">
            {row.original.id.slice(0, 8)}…
          </span>
          {row.original.externalRef ? (
            <span className="line-clamp-1 text-xs text-muted-foreground">
              {row.original.externalRef}
            </span>
          ) : null}
        </Link>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "expiresAt",
      accessorFn: (row) => String(row.expiresAt ?? ""),
      header: "Expires",
      cell: ({ row }) => (
        <span className="text-sm text-foreground/60">
          {row.original.expiresAt
            ? formatDate(row.original.expiresAt)
            : "Never"}
        </span>
      ),
    },
    {
      id: "createdAt",
      accessorFn: (row) => row.createdAt,
      header: "Created",
      cell: ({ row }) => (
        <span className="text-sm text-foreground/60">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
  ];

  const table = useTable({
    features,
    data: rows,
    columns,
    globalFilterFn: "includesString",
  });

  if (query.isError) {
    return (
      <PageError
        title="Failed to load documents"
        message={query.error instanceof Error ? query.error.message : undefined}
      />
    );
  }

  const tableRows = table.getRowModel().rows;
  const isRefetching = query.isFetching && !query.isPending;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between gap-3 bg-background px-1 py-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search documents…"
              value={(table.state.globalFilter as string) ?? ""}
              onChange={(e) => table.setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-11 hover:translate-y-0"
              )}
            >
              <span>{activeStatusLabel}</span>
              <ChevronDown className="size-4 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              matchTriggerWidth
              align="start"
              className="min-w-fit [&>*:first-child]:rounded-t-2xl"
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem
                  key={opt.value || "all"}
                  size="sm"
                  label={opt.label}
                  isActive={status === opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <span className="text-xs text-foreground/80">{total} documents</span>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-3xl border transition-opacity",
          isRefetching && "opacity-60"
        )}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="h-12 px-6">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <AnimatePresence
            mode="wait"
            initial={false}
            key={`${status}-${page}`}
          >
            <MotionTableBody
              key={`${status}-${page}-body`}
              variants={bodyVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {tableRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 px-6 text-center text-sm text-muted-foreground"
                  >
                    {query.isPending ? "Loading…" : "No documents yet."}
                  </TableCell>
                </TableRow>
              ) : (
                tableRows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id} className="px-6 py-4">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </MotionTableBody>
          </AnimatePresence>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>
            {firstRow}–{lastRow} of {total}
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
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          disabled={query.isPending}
        />
      </div>
    </div>
  );
}
