"use client";

import { Check, Copy, MoreHorizontal, ShieldCheck, Star } from "lucide-react";
import { useMemo, useState } from "react";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/dashboard/data-table";
import { toast } from "@/components/providers/toast-provider";
import { PageError } from "@/components/settings/page-states";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MenuItem } from "@/components/ui/menu-item";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import { useSettings, useUpdateSettings } from "@/lib/api/queries/settings";
import {
  type WalletRow,
  useVerifyWalletDomain,
  useWallets,
} from "@/lib/api/queries/wallets";

const WALLET_STATUS_TONE: Record<string, BadgeTone> = {
  active: "success",
  disabled: "default",
  compromised: "danger",
};

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
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const allRows = (query.data ?? []) as WalletRow[];
  const total = allRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;
  const rows = allRows.slice(offset, offset + pageSize);
  const firstRow = total === 0 ? 0 : offset + 1;
  const lastRow = Math.min(offset + rows.length, total);

  const defaultWalletId = settings.data?.defaultWalletId ?? null;

  const columns = useMemo(
    () => [
      {
        id: "label",
        accessorFn: (row: WalletRow) => row.label,
        header: ({
          column,
        }: {
          column: Parameters<typeof DataTableColumnHeader>[0]["column"];
        }) => <DataTableColumnHeader column={column} title="Label" />,
        cell: ({ row }: { row: { original: WalletRow } }) => (
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
        accessorFn: (row: WalletRow) => row.address,
        header: "Address",
        cell: ({ row }: { row: { original: WalletRow } }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {truncateAddress(row.original.address)}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (row: WalletRow) => row.status,
        header: ({
          column,
        }: {
          column: Parameters<typeof DataTableColumnHeader>[0]["column"];
        }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }: { row: { original: WalletRow } }) => (
          <StatusBadge
            label={row.original.status}
            tone={WALLET_STATUS_TONE[row.original.status] ?? "default"}
          />
        ),
      },
      {
        id: "chainId",
        accessorFn: (row: WalletRow) => row.chainId,
        header: "Chain ID",
        cell: ({ row }: { row: { original: WalletRow } }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.chainId}
          </span>
        ),
      },
      {
        id: "domain",
        accessorFn: (row: WalletRow) => row.domain ?? "",
        header: "Domain",
        cell: ({ row }: { row: { original: WalletRow } }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.domain ?? "—"}
          </span>
        ),
      },
      {
        id: "verified",
        accessorFn: (row: WalletRow) => (row.domainVerifiedAt ? "Yes" : "No"),
        header: "Verified",
        cell: ({ row }: { row: { original: WalletRow } }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.domainVerifiedAt ? "Yes" : "No"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }: { row: { original: WalletRow } }) => (
          <WalletActionsMenu
            wallet={row.original}
            organizationId={organizationId}
            isDefault={row.original.id === defaultWalletId}
          />
        ),
      },
    ],
    [defaultWalletId, organizationId]
  );

  if (query.isError) {
    return (
      <PageError
        title="Failed to load wallets"
        message={query.error instanceof Error ? query.error.message : undefined}
      />
    );
  }

  return (
    <DataTable
      data={rows}
      columns={columns as never}
      isPending={query.isPending}
      emptyMessage="No wallets yet. Connect one to start issuing."
      skeletonRows={Math.min(pageSize, 10)}
      skeletonWidths={["w-32", "w-24", "w-16", "w-12", "w-24", "w-12", "w-8"]}
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      searchPlaceholder="Search by label or address…"
      unit="wallets"
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
