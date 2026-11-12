"use client";

import { useEffect } from "react";

import { useStepper } from "@/components/documents/stepper";

import type { BulkRow, IssueMode } from "@/components/documents/issue-wizard";
import type { DocumentFieldDef } from "@/lib/schemas/parse-field";

interface ConfirmStepProps {
  mode: IssueMode;
  templateName: string;
  fieldValues: Record<string, string>;
  schemaFields: DocumentFieldDef[];
  recipientName: string;
  recipientEmail: string;
  bulkRows: BulkRow[];
  csvFile: File | null;
  csvRowCount: number;
  expiresAt: string;
  externalRef: string;
  onIssue: () => Promise<boolean>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function resolveCount(mode: IssueMode, bulkCount: number, csvCount: number) {
  if (mode === "single") {
    return 1;
  }
  if (mode === "bulk") {
    return bulkCount;
  }
  return csvCount;
}

export default function ConfirmStep({
  mode,
  templateName,
  fieldValues,
  schemaFields,
  recipientName,
  recipientEmail,
  bulkRows,
  csvFile,
  csvRowCount,
  expiresAt,
  externalRef,
  onIssue,
}: ConfirmStepProps) {
  const { setCanGoToNextStep, setOnNext } = useStepper();

  useEffect(() => {
    setCanGoToNextStep(true);
  }, [setCanGoToNextStep]);

  useEffect(() => {
    setOnNext(onIssue);
  }, [setOnNext, onIssue]);

  const count = resolveCount(mode, bulkRows.length, csvRowCount);

  return (
    <div className="w-full max-w-xl space-y-6">
      <div className="rounded-2xl border border-border p-6">
        <h3 className="mb-4 text-sm font-medium">Review</h3>
        <Row label="Template" value={templateName || "—"} />
        <Row
          label="Mode"
          value={mode.charAt(0).toUpperCase() + mode.slice(1)}
        />
        <Row
          label="Documents"
          value={`${count} document${count === 1 ? "" : "s"}`}
        />
        {mode === "single"
          ? schemaFields.map((field) => (
              <Row
                key={field.key}
                label={field.label}
                value={fieldValues[field.key] || "—"}
              />
            ))
          : null}
        {mode === "single" && recipientName ? (
          <Row label="Recipient" value={recipientName} />
        ) : null}
        {mode === "single" && recipientEmail ? (
          <Row label="Recipient email" value={recipientEmail} />
        ) : null}
        {mode === "csv" && csvFile ? (
          <Row label="File" value={csvFile.name} />
        ) : null}
        {expiresAt ? (
          <Row
            label="Expires at"
            value={new Date(expiresAt).toLocaleDateString()}
          />
        ) : null}
        {externalRef ? <Row label="External ref" value={externalRef} /> : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Click Issue in the footer to create{" "}
        {count === 1 ? "this document" : `these ${count} documents`}.
        You&apos;ll be redirected to the documents list.
      </p>
    </div>
  );
}
