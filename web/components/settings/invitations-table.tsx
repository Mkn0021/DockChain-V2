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
  MoreHorizontal,
  Search,
  Trash2,
} from "lucide-react";
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
import {
  useCancelInvitation,
  useInvitations,
} from "@/lib/api/queries/invitations";
import { can } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/utils";

import type { ResponseOf } from "@/lib/api/response-of";

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

interface InvitationsTableProps {
  organizationId: string;
}

type InvitationRow = ResponseOf<
  "/organizations/{organizationId}/invitations",
  "get"
>[number];

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

function RoleBadge({ role }: { role: string | null }) {
  const styles: Record<string, string> = {
    owner: "border-primary/30 bg-primary/10 text-primary",
    admin: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    issuer:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    viewer: "border-border bg-muted text-foreground/80",
  };

  if (!role) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        styles[role] ?? styles.viewer
      )}
    >
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    accepted:
      "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
    canceled: "border-border bg-muted text-foreground/80",
    rejected: "border-border bg-muted text-foreground/80",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        styles[status] ?? styles.canceled
      )}
    >
      {status}
    </span>
  );
}

function InvitationActionsMenu({
  invitation,
  canCancel,
  isPending,
  onCancel,
}: {
  invitation: InvitationRow;
  canCancel: boolean;
  isPending: boolean;
  onCancel: (invitationId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!canCancel || invitation.status !== "pending") {
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
          label="Cancel invitation"
          disabled={isPending}
          onClick={() => {
            onCancel(invitation.id);
            setOpen(false);
          }}
          className="rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive"
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InvitationsTable({ organizationId }: InvitationsTableProps) {
  const { role } = useOrg();
  const query = useInvitations(organizationId);
  const cancelMutation = useCancelInvitation(organizationId);

  const canCancel = can(role, "invitation", "cancel");

  function handleCancel(invitationId: string) {
    cancelMutation.mutate(invitationId, {
      onSuccess: () => toast.success("Invitation canceled."),
      onError: (e: unknown) =>
        toast.error(
          e instanceof Error ? e.message : "Failed to cancel invitation."
        ),
    });
  }

  const rows = (query.data ?? []) as InvitationRow[];

  const columns: ColumnDef<typeof features, InvitationRow>[] = [
    {
      id: "email",
      accessorFn: (row) => row.email,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.original.email}</span>
      ),
    },
    {
      id: "role",
      accessorFn: (row) => row.role ?? "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
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
      accessorFn: (row) => row.expiresAt,
      header: "Expires",
      cell: ({ row }) => (
        <span className="text-sm text-foreground/60">
          {formatDate(row.original.expiresAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <InvitationActionsMenu
          invitation={row.original}
          canCancel={canCancel}
          isPending={cancelMutation.isPending}
          onCancel={handleCancel}
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
        title="Failed to load invitations"
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
          No pending invitations.
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
            placeholder="Search by email…"
            value={(table.state.globalFilter as string) ?? ""}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-xs text-foreground/80">
          {rows.length} pending
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
