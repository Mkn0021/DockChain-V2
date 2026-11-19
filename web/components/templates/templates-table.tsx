"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/dashboard/data-table";
import { useOrg } from "@/components/dashboard/org-provider";
import { toast } from "@/components/providers/toast-provider";
import { PageError } from "@/components/settings/page-states";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MenuItem } from "@/components/ui/menu-item";
import { useArchiveTemplate, useTemplates } from "@/lib/api/queries/templates";
import { can } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/utils";

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  archivedAt: unknown;
  createdAt: unknown;
  updatedAt: unknown;
  createdBy: string | null;
  organizationId: string;
}

function TemplateActionsMenu({
  template,
  canArchive,
  isPending,
  onArchive,
}: {
  template: TemplateRow;
  canArchive: boolean;
  isPending: boolean;
  onArchive: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isArchived = template.archivedAt !== null;

  if (!canArchive || isArchived) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label="Actions"
        className="inline-flex size-8 items-center justify-center rounded-md text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-fit">
        <MenuItem
          size="sm"
          icon={Trash2}
          label="Archive template"
          disabled={isPending}
          onClick={() => {
            onArchive(template.id);
            setOpen(false);
          }}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TemplatesTable({
  organizationId,
  organizationSlug,
}: {
  organizationId: string;
  organizationSlug: string;
}) {
  const { role } = useOrg();
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const offset = (page - 1) * pageSize;
  const query = useTemplates(organizationId, pageSize, offset);
  const archiveMutation = useArchiveTemplate(organizationId);

  const canArchive = can(role, "template", "delete");

  function handleArchive(id: string) {
    archiveMutation.mutate(id, {
      onSuccess: () => toast.success("Template archived."),
      onError: (e: unknown) =>
        toast.error(
          e instanceof Error ? e.message : "Failed to archive template."
        ),
    });
  }

  const rows = (query.data?.data ?? []) as TemplateRow[];
  const total = query.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : offset + 1;
  const lastRow = Math.min(offset + rows.length, total);

  const columns = useMemo(
    () => [
      {
        id: "name",
        accessorFn: (row: TemplateRow) => row.name,
        header: ({
          column,
        }: {
          column: Parameters<typeof DataTableColumnHeader>[0]["column"];
        }) => <DataTableColumnHeader column={column} title="Template" />,
        cell: ({ row }: { row: { original: TemplateRow } }) => (
          <Link
            href={`/${organizationSlug}/templates/${row.original.id}`}
            className="flex flex-col hover:underline"
          >
            <span className="text-sm font-medium">{row.original.name}</span>
            {row.original.description ? (
              <span className="line-clamp-1 text-xs text-muted-foreground">
                {row.original.description}
              </span>
            ) : null}
          </Link>
        ),
      },
      {
        id: "createdAt",
        accessorFn: (row: TemplateRow) => row.createdAt,
        header: "Created",
        cell: ({ row }: { row: { original: TemplateRow } }) => (
          <span className="text-sm text-foreground/60">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }: { row: { original: TemplateRow } }) => (
          <TemplateActionsMenu
            template={row.original}
            canArchive={canArchive}
            isPending={archiveMutation.isPending}
            onArchive={handleArchive}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [organizationSlug, canArchive, archiveMutation.isPending]
  );

  if (query.isError) {
    return (
      <PageError
        title="Failed to load templates"
        message={query.error instanceof Error ? query.error.message : undefined}
      />
    );
  }

  return (
    <DataTable
      data={rows}
      columns={columns as never}
      isPending={query.isPending}
      emptyMessage="No templates yet."
      skeletonRows={Math.min(pageSize, 10)}
      skeletonWidths={["w-32", "w-24", "w-8"]}
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      searchPlaceholder="Search templates…"
      unit="templates"
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
      dimWhenRefetching
      isRefetching={query.isFetching && !query.isPending}
    />
  );
}
