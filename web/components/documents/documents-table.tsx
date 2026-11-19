"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import {
  DataTable,
  DataTableColumnHeader,
  DataTableFilter,
} from "@/components/dashboard/data-table";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import { TableBody } from "@/components/ui/table";
import {
  useDocuments,
  type DocumentListRow,
} from "@/lib/api/queries/documents";
import { formatDate } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "ready", label: "Ready" },
  { value: "batched", label: "Batched" },
  { value: "issued", label: "Issued" },
  { value: "revoked", label: "Revoked" },
] as const;

const STATUS_TONE: Record<DocumentListRow["status"], BadgeTone> = {
  draft: "default",
  ready: "info",
  batched: "warning",
  issued: "success",
  revoked: "danger",
};

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

export function DocumentsTable({
  organizationId,
  organizationSlug,
}: {
  organizationId: string;
  organizationSlug: string;
}) {
  const [status, setStatus] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");

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

  const columns = [
    {
      id: "id",
      accessorFn: (row: DocumentListRow) => row.id,
      header: "Document",
      cell: ({ row }: { row: { original: DocumentListRow } }) => (
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
      accessorFn: (row: DocumentListRow) => row.status,
      header: ({
        column,
      }: {
        column: Parameters<typeof DataTableColumnHeader>[0]["column"];
      }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }: { row: { original: DocumentListRow } }) => (
        <StatusBadge
          label={row.original.status}
          tone={STATUS_TONE[row.original.status]}
        />
      ),
    },
    {
      id: "expiresAt",
      accessorFn: (row: DocumentListRow) => String(row.expiresAt ?? ""),
      header: "Expires",
      cell: ({ row }: { row: { original: DocumentListRow } }) => (
        <span className="text-sm text-foreground/60">
          {row.original.expiresAt
            ? formatDate(row.original.expiresAt)
            : "Never"}
        </span>
      ),
    },
    {
      id: "createdAt",
      accessorFn: (row: DocumentListRow) => row.createdAt,
      header: "Created",
      cell: ({ row }: { row: { original: DocumentListRow } }) => (
        <span className="text-sm text-foreground/60">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <AnimatePresence mode="wait" initial={false} key={`${status}-${page}`}>
      <DataTable
        data={rows}
        columns={columns as never}
        isPending={query.isPending}
        isError={query.isError}
        errorTitle="Failed to load documents"
        errorMessage={
          query.error instanceof Error ? query.error.message : undefined
        }
        emptyMessage="No documents yet."
        skeletonRows={Math.min(10, pageSize)}
        skeletonWidths={["w-20", "w-16", "w-16", "w-20"]}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search documents…"
        filters={
          <DataTableFilter
            label={activeStatusLabel}
            options={STATUS_OPTIONS}
            value={status}
            onChange={(next) => {
              setStatus(next);
              setPage(1);
            }}
          />
        }
        unit="documents"
        pagination={{
          first: firstRow,
          last: lastRow,
          total,
          pageSize,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
          currentPage: page,
          totalPages,
          onPageChange: setPage,
          disabled: query.isPending,
        }}
        renderBody={(children, key) => (
          <MotionTableBody
            key={key}
            variants={bodyVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {children}
          </MotionTableBody>
        )}
        bodyKey={`${status}-${page}`}
        dimWhenRefetching
        isRefetching={query.isFetching && !query.isPending}
      />
    </AnimatePresence>
  );
}
