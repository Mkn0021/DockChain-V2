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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MenuItem } from "@/components/ui/menu-item";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import {
  type MemberRole,
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from "@/lib/api/queries/members";
import { can } from "@/lib/auth/permissions";

const ASSIGNABLE_ROLES: MemberRole[] = ["admin", "issuer", "viewer"];
export const MAX_MEMBERS = 100;

const ROLE_TONE: Record<string, BadgeTone> = {
  owner: "info",
  admin: "warning",
  issuer: "success",
  viewer: "default",
};

interface MemberRow {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

function MemberActionsMenu({
  member,
  canUpdate,
  canRemove,
  isUpdating,
  isRemoving,
  onRoleChange,
  onRemove,
}: {
  member: MemberRow;
  canUpdate: boolean;
  canRemove: boolean;
  isUpdating: boolean;
  isRemoving: boolean;
  onRoleChange: (memberId: string, role: MemberRole) => void;
  onRemove: (memberId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label="Actions"
        className="inline-flex size-8 items-center justify-center rounded-md text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-fit">
        {canUpdate ? (
          <>
            <DropdownMenuLabel className="px-3 text-[10px]">
              Change role
            </DropdownMenuLabel>
            {ASSIGNABLE_ROLES.map((r) => (
              <MenuItem
                key={r}
                size="sm"
                label={`Make ${r}`}
                disabled={member.role === r || isUpdating}
                onClick={() => {
                  onRoleChange(member.id, r);
                  close();
                }}
              />
            ))}
            {canRemove ? (
              <DropdownMenuSeparator className="-mx-2 my-1" />
            ) : null}
          </>
        ) : null}
        {canRemove ? (
          <MenuItem
            size="sm"
            icon={Trash2}
            label="Remove member"
            disabled={isRemoving}
            onClick={() => {
              onRemove(member.id);
              close();
            }}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          />
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MembersTable({ organizationId }: { organizationId: string }) {
  const { user, role } = useOrg();
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const offset = (page - 1) * pageSize;
  const query = useMembers(organizationId, pageSize, offset);
  const updateRole = useUpdateMemberRole(organizationId);
  const removeMutation = useRemoveMember(organizationId);

  const canUpdate = can(role, "member", "update");
  const canRemove = can(role, "member", "delete");

  function handleRoleChange(memberId: string, next: MemberRole) {
    updateRole.mutate(
      { memberId, role: next },
      {
        onSuccess: () => toast.success("Role updated."),
        onError: (e: unknown) =>
          toast.error(
            e instanceof Error ? e.message : "Failed to update role."
          ),
      }
    );
  }

  function handleRemove(memberId: string) {
    removeMutation.mutate(memberId, {
      onSuccess: () => toast.success("Member removed."),
      onError: (e: unknown) =>
        toast.error(
          e instanceof Error ? e.message : "Failed to remove member."
        ),
    });
  }

  const rows = (query.data?.members ?? []) as MemberRow[];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : offset + 1;
  const lastRow = Math.min(offset + rows.length, total);

  const columns = [
    {
      id: "name",
      accessorFn: (row: MemberRow) => row.user.name,
      header: ({
        column,
      }: {
        column: Parameters<typeof DataTableColumnHeader>[0]["column"];
      }) => <DataTableColumnHeader column={column} title="Member" />,
      cell: ({ row }: { row: { original: MemberRow } }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{row.original.user.name}</span>
          <span className="text-xs text-muted-foreground md:hidden">
            {row.original.user.email}
          </span>
        </div>
      ),
    },
    {
      id: "email",
      accessorFn: (row: MemberRow) => row.user.email,
      header: ({
        column,
      }: {
        column: Parameters<typeof DataTableColumnHeader>[0]["column"];
      }) => (
        <div className="hidden md:block">
          <DataTableColumnHeader column={column} title="Email" />
        </div>
      ),
      cell: ({ row }: { row: { original: MemberRow } }) => (
        <span className="hidden text-sm text-foreground/60 md:block">
          {row.original.user.email}
        </span>
      ),
    },
    {
      id: "role",
      accessorFn: (row: MemberRow) => row.role,
      header: ({
        column,
      }: {
        column: Parameters<typeof DataTableColumnHeader>[0]["column"];
      }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }: { row: { original: MemberRow } }) => (
        <StatusBadge
          label={row.original.role}
          tone={ROLE_TONE[row.original.role] ?? "default"}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }: { row: { original: MemberRow } }) => {
        const isSelf = row.original.userId === user.id;
        const isOwner = row.original.role === "owner";
        if (isSelf || isOwner) {
          return null;
        }
        return (
          <MemberActionsMenu
            member={row.original}
            canUpdate={canUpdate}
            canRemove={canRemove}
            isUpdating={updateRole.isPending}
            isRemoving={removeMutation.isPending}
            onRoleChange={handleRoleChange}
            onRemove={handleRemove}
          />
        );
      },
    },
  ];

  if (query.isError) {
    return (
      <PageError
        title="Failed to load members"
        message={query.error instanceof Error ? query.error.message : undefined}
      />
    );
  }

  return (
    <DataTable
      data={rows}
      columns={columns as never}
      isPending={query.isPending}
      emptyMessage="No members match."
      skeletonRows={Math.min(pageSize, 10)}
      skeletonWidths={["w-24", "w-32", "w-16", "w-8"]}
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      searchPlaceholder="Search by name or email…"
      unit="members"
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
