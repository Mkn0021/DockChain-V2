"use client";

import { cn } from "cn";
import { Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FaChevronLeft } from "react-icons/fa";

import { toast } from "@/components/providers/toast-provider";
import { PageError } from "@/components/settings/page-states";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { useDocument } from "@/lib/api/queries/documents";

import { DocumentRevokeDialog } from "./document-revoke-dialog";

const STATUSES = {
  draft: "border-border bg-muted text-foreground/80",
  ready: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  batched:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  issued:
    "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
  revoked: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
} as const;

function formatDate(value: unknown): string {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

interface DocumentDetailViewProps {
  organizationId: string;
  documentId: string;
  orgSlug: string;
}

export function DocumentDetailView({
  organizationId,
  documentId,
  orgSlug,
}: DocumentDetailViewProps) {
  const query = useDocument(organizationId, documentId);
  const [downloading, setDownloading] = useState(false);

  if (query.isError) {
    return (
      <PageError
        title="Failed to load document"
        message={query.error instanceof Error ? query.error.message : undefined}
      />
    );
  }

  if (query.isPending || !query.data) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const doc = query.data;
  const canRevoke = doc.status === "issued" || doc.status === "batched";

  async function handleDownload() {
    setDownloading(true);
    try {
      const pdf = await apiFetch<{ url: string }>(
        `/organizations/${organizationId}/documents/${documentId}/pdf?preview=false`
      );
      if (pdf.url) {
        window.open(pdf.url, "_blank");
      }
    } catch (error) {
      toast.error(
        `Download failed: ${error instanceof Error ? error.message : "unknown"}`
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${orgSlug}/documents`}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "hover:translate-y-0"
          )}
        >
          <FaChevronLeft className="size-4" />
          Back
        </Link>
        <div className="flex gap-2">
          {canRevoke ? (
            <DocumentRevokeDialog
              organizationId={organizationId}
              documentId={documentId}
            />
          ) : null}
          <Button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="hover:translate-y-0"
          >
            <Download className="size-4" />
            {downloading ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-border p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Document</h2>
            <p className="font-mono text-xs text-muted-foreground">{doc.id}</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize",
              STATUSES[doc.status]
            )}
          >
            {doc.status}
          </span>
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Template version</dt>
            <dd className="font-mono text-xs">{doc.templateVersionId}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Issuer wallet</dt>
            <dd className="font-mono text-xs">{doc.issuerWalletId}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Created</dt>
            <dd className="text-sm">{formatDate(doc.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Expires</dt>
            <dd className="text-sm">
              {doc.expiresAt ? formatDate(doc.expiresAt) : "Never"}
            </dd>
          </div>
          {doc.externalRef ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">External ref</dt>
              <dd className="text-sm">{doc.externalRef}</dd>
            </div>
          ) : null}
          {doc.recipient ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Recipient</dt>
              <dd className="text-sm">
                {doc.recipient.name}
                {doc.recipient.email ? ` · ${doc.recipient.email}` : ""}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="rounded-3xl border border-border p-6">
        <h3 className="mb-4 text-sm font-medium">Fields</h3>
        {Object.keys(doc.fields ?? {}).length === 0 ? (
          <p className="text-sm text-muted-foreground">No fields stored.</p>
        ) : (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(doc.fields).map(([key, value]) => (
              <div key={key} className="rounded-lg border p-3 text-sm">
                <dt className="text-xs text-muted-foreground">{key}</dt>
                <dd className="font-medium">
                  {value === null || value === undefined ? "—" : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
