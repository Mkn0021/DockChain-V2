"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";

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
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import {
  useCancelInvitation,
  useInvitations,
  type InvitationRow,
} from "@/lib/api/queries/invitations";
import { can } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/utils";

const ROLE_TONE: Record<string, BadgeTone> = {
  owner: "info",
  admin: "warning",
  issuer: "success",
  viewer: "default",
};

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: "warning",
  accepted: "success",
  canceled: "default",
  rejected: "default",
};

interface InvitationsTableProps {
  organizationId: string;
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
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

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

  const allRows = (query.data ?? []) as InvitationRow[];

  const needle = search.trim().toLowerCase();
  const filteredRows = needle
    ? allRows.filter((row) => {
        const email = row.email.toLowerCase();
        const roleValue = (row.role ?? "").toLowerCase();
        const status = row.status.toLowerCase();
        return (
          email.includes(needle) ||
          roleValue.includes(needle) ||
          status.includes(needle)
        );
      })
    : allRows;

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;
  const rows = filteredRows.slice(offset, offset + pageSize);
  const firstRow = total === 0 ? 0 : offset + 1;
  const lastRow = Math.min(offset + rows.length, total);

  const columns = [
    {
      id: "email",
      accessorFn: (row: InvitationRow) => row.email,
      header: ({
        column,
      }: {
        column: Parameters<typeof DataTableColumnHeader>[0]["column"];
      }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }: { row: { original: InvitationRow } }) => (
        <span className="text-sm font-medium">{row.original.email}</span>
      ),
    },
    {
      id: "role",
      accessorFn: (row: InvitationRow) => row.role ?? "",
      header: ({
        column,
      }: {
        column: Parameters<typeof DataTableColumnHeader>[0]["column"];
      }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }: { row: { original: InvitationRow } }) =>
        row.original.role ? (
          <StatusBadge
            label={row.original.role}
            tone={ROLE_TONE[row.original.role] ?? "default"}
          />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      id: "status",
      accessorFn: (row: InvitationRow) => row.status,
      header: ({
        column,
      }: {
        column: Parameters<typeof DataTableColumnHeader>[0]["column"];
      }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }: { row: { original: InvitationRow } }) => (
        <StatusBadge
          label={row.original.status}
          tone={STATUS_TONE[row.original.status] ?? "default"}
        />
      ),
    },
    {
      id: "expiresAt",
      accessorFn: (row: InvitationRow) => row.expiresAt,
      header: "Expires",
      cell: ({ row }: { row: { original: InvitationRow } }) => (
        <span className="text-sm text-foreground/60">
          {formatDate(row.original.expiresAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }: { row: { original: InvitationRow } }) => (
        <InvitationActionsMenu
          invitation={row.original}
          canCancel={canCancel}
          isPending={cancelMutation.isPending}
          onCancel={handleCancel}
        />
      ),
    },
  ];

  if (query.isError) {
    return (
      <PageError
        title="Failed to load invitations"
        message={query.error instanceof Error ? query.error.message : undefined}
      />
    );
  }

  return (
    <DataTable
      data={rows}
      columns={columns as never}
      isPending={query.isPending}
      emptyMessage={
        search.trim()
          ? "No invitations match your search."
          : "No pending invitations."
      }
      skeletonRows={Math.min(pageSize, 10)}
      skeletonWidths={["w-40", "w-16", "w-20", "w-20", "w-8"]}
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      searchPlaceholder="Search by email, role, or status…"
      unit="invitations"
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
    />
  );
}
