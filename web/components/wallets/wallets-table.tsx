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
  Check,
  Copy,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { toast } from "@/components/providers/toast-provider";
import { PageError } from "@/components/settings/page-states";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSettings, useUpdateSettings } from "@/lib/api/queries/settings";
import {
  type WalletRow,
  useVerifyWalletDomain,
  useWallets,
} from "@/lib/api/queries/wallets";

import { MenuItem } from "../ui/menu-item";

const SORT_ICONS = { asc: ArrowUp, desc: ArrowDown } as const;

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric },
});

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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:
      "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
    disabled: "border-border bg-muted text-foreground/80",
    compromised:
      "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        styles[status] ?? styles.disabled
      )}
    >
      {status}
    </span>
  );
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function WalletActionsMenu({
  wallet,
  organizationId,
  isDefault,
}: {
  wallet: WalletRow;
  organizationId: string;
  isDefault: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const verify = useVerifyWalletDomain(organizationId);
  const updateSettings = useUpdateSettings(organizationId);

  async function handleCopy() {
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    toast.success("Address copied.");
    setTimeout(() => setCopied(false), 1500);
  }

  function handleVerify() {
    verify.mutate(wallet.id, {
      onSuccess: () => toast.success("Domain verified."),
      onError: (err: unknown) =>
        toast.error(
          err instanceof Error ? err.message : "Domain verification failed."
        ),
    });
  }

  function handleSetDefault() {
    updateSettings.mutate(
      { defaultWalletId: wallet.id },
      {
        onSuccess: () => toast.success("Default wallet updated."),
        onError: (err: unknown) =>
          toast.error(
            err instanceof Error ? err.message : "Failed to set default wallet."
          ),
      }
    );
  }

  let verifyLabel: string;
  if (verify.isPending) {
    verifyLabel = "Verifying…";
  } else if (wallet.domainVerifiedAt) {
    verifyLabel = "Re-verify domain";
  } else {
    verifyLabel = "Verify domain";
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
          icon={copied ? Check : Copy}
          label="Copy address"
          onClick={() => {
            handleCopy();
            setOpen(false);
          }}
        />
        {wallet.status === "active" && wallet.domain ? (
          <MenuItem
            size="sm"
            icon={ShieldCheck}
            label={verifyLabel}
            disabled={verify.isPending}
            onClick={() => {
              handleVerify();
              setOpen(false);
            }}
          />
        ) : null}
        {wallet.status === "active" && !isDefault ? (
          <MenuItem
            size="sm"
            icon={Star}
            label="Set as default"
            disabled={updateSettings.isPending}
            onClick={() => {
              handleSetDefault();
              setOpen(false);
            }}
          />
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function WalletsTable({ organizationId }: { organizationId: string }) {
  const query = useWallets(organizationId);
  const settings = useSettings(organizationId);
  const rows = (query.data ?? []) as WalletRow[];
  const defaultWalletId = settings.data?.defaultWalletId ?? null;

  const columns: ColumnDef<typeof features, WalletRow>[] = [
    {
      id: "label",
      accessorFn: (row) => row.label,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Label" />
      ),
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          {row.original.label}
          {row.original.id === defaultWalletId ? (
            <Star className="size-3 fill-primary text-primary" />
          ) : null}
        </span>
      ),
    },
    {
      id: "address",
      accessorFn: (row) => row.address,
      header: "Address",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {truncateAddress(row.original.address)}
        </span>
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
      id: "chainId",
      accessorFn: (row) => row.chainId,
      header: "Chain ID",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.chainId}
        </span>
      ),
    },
    {
      id: "domain",
      accessorFn: (row) => row.domain ?? "",
      header: "Domain",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.domain ?? "—"}
        </span>
      ),
    },
    {
      id: "verified",
      accessorFn: (row) => (row.domainVerifiedAt ? "Yes" : "No"),
      header: "Verified",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.domainVerifiedAt ? "Yes" : "No"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <WalletActionsMenu
          wallet={row.original}
          organizationId={organizationId}
          isDefault={row.original.id === defaultWalletId}
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
        title="Failed to load wallets"
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
          No wallets yet. Connect one to start issuing.
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
            placeholder="Search by label or address…"
            value={(table.state.globalFilter as string) ?? ""}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-xs text-foreground/80">
          {rows.length} wallets
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
