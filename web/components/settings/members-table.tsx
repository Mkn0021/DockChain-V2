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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { can } from "@/lib/permissions";
import {
  type MemberRole,
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from "@/lib/settings/queries";

const ASSIGNABLE_ROLES: MemberRole[] = ["admin", "issuer", "viewer"];
export const MAX_MEMBERS = 100;

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

interface MembersTableProps {
  organizationId: string;
}

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

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    owner: "border-primary/30 bg-primary/10 text-primary",
    admin: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    issuer:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    viewer: "border-border bg-muted text-foreground/80",
  };

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

export function MembersTable({ organizationId }: MembersTableProps) {
  const { user, role } = useOrg();
  const query = useMembers(organizationId, MAX_MEMBERS, 0);
  const updateRole = useUpdateMemberRole(organizationId);
  const removeMutation = useRemoveMember(organizationId);

  const [roleFilter] = useState<string>("all");

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
  const total = query.data?.total ?? rows.length;
  const filteredRows =
    roleFilter === "all" ? rows : rows.filter((r) => r.role === roleFilter);

  const columns: ColumnDef<typeof features, MemberRow>[] = [
    {
      id: "name",
      accessorFn: (row) => row.user.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Member" />
      ),
      cell: ({ row }) => (
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
      accessorFn: (row) => row.user.email,
      header: ({ column }) => (
        <div className="hidden md:block">
          <DataTableColumnHeader column={column} title="Email" />
        </div>
      ),
      cell: ({ row }) => (
        <span className="hidden text-sm text-foreground/60 md:block">
          {row.original.user.email}
        </span>
      ),
    },
    {
      id: "role",
      accessorFn: (row) => row.role,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
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

  const table = useTable({
    features,
    data: filteredRows,
    columns,
    globalFilterFn: "includesString",
  });

  if (query.isError) {
    return (
      <PageError
        title="Failed to load members"
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
          No members match.
        </TableCell>
      </TableRow>
    );
  } else {
    bodyContent = table.getRowModel().rows.map((row) => (
      <TableRow key={row.id}>
        {row.getAllCells().map((cell) => (
          <TableCell
            key={cell.id}
            className={cn(
              "px-6 py-4",
              cell.column.id === "email" && "hidden md:table-cell"
            )}
          >
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
            placeholder="Search by name or email…"
            value={(table.state.globalFilter as string) ?? ""}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-xs text-foreground/80">
          {total} / {MAX_MEMBERS} members
        </span>
      </div>

      <div className="overflow-hidden rounded-3xl border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "h-12 px-6",
                      header.column.id === "email" && "hidden md:table-cell"
                    )}
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
          <TableBody>{bodyContent}</TableBody>
        </Table>
      </div>
    </div>
  );
}
