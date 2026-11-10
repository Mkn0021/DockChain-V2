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
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { useOrg } from "@/components/dashboard/org-provider";
import { toast } from "@/components/providers/toast-provider";
import { PageError } from "@/components/settings/page-states";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { MenuItem } from "@/components/ui/menu-item";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useArchiveTemplate, useTemplates } from "@/lib/api/queries/templates";
import { can } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/utils";

const SORT_ICONS = {
  asc: ArrowUp,
  desc: ArrowDown,
} as const;

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric },
});

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
  const query = useTemplates(organizationId, 100, 0);
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

  const columns: ColumnDef<typeof features, TemplateRow>[] = [
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Template" />
      ),
      cell: ({ row }) => (
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
      accessorFn: (row) => row.createdAt,
      header: "Created",
      cell: ({ row }) => (
        <span className="text-sm text-foreground/60">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <TemplateActionsMenu
          template={row.original}
          canArchive={canArchive}
          isPending={archiveMutation.isPending}
          onArchive={handleArchive}
        />
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
        title="Failed to load templates"
        message={query.error instanceof Error ? query.error.message : undefined}
      />
    );
  }

  let bodyContent: ReactNode;

  if (query.isPending) {
    bodyContent = (
      <TableRow>
        <TableCell
          colSpan={columns.length}
          className="h-24 px-6 text-center text-sm text-muted-foreground"
        >
          Loading…
        </TableCell>
      </TableRow>
    );
  } else if (table.getRowModel().rows.length === 0) {
    bodyContent = (
      <TableRow>
        <TableCell
          colSpan={columns.length}
          className="h-24 px-6 text-center text-sm text-muted-foreground"
        >
          No templates yet.
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates…"
            value={(table.state.globalFilter as string) ?? ""}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-xs text-foreground/80">
          {rows.length} templates
        </span>
      </div>

      <div className="overflow-hidden rounded-3xl border">
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
          <TableBody>{bodyContent}</TableBody>
        </Table>
      </div>
    </div>
  );
}
