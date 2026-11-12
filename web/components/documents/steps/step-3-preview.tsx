"use client";

import { useEffect, useMemo } from "react";

import { useStepper } from "@/components/documents/stepper";

import type { BulkRow, IssueMode } from "@/components/documents/issue-wizard";
import type { DocumentFieldDef } from "@/lib/schemas/parse-field";

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(PLACEHOLDER_RE, (_, key: string) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function labelFor(field: DocumentFieldDef): string {
  return (
    field.label ||
    field.key.replaceAll("_", " ").replaceAll(/\b\w/g, (c) => c.toUpperCase())
  );
}

interface PreviewStepProps {
  mode: IssueMode;
  layout: string;
  formValues: Record<string, string>;
  recipientName: string;
  recipientEmail: string;
  bulkRows: BulkRow[];
  csvFile: File | null;
  csvRowCount: number;
  schemaFields: DocumentFieldDef[];
}

export default function PreviewStep({
  mode,
  layout,
  formValues,
  recipientName,
  recipientEmail,
  bulkRows,
  csvFile,
  csvRowCount,
  schemaFields,
}: PreviewStepProps) {
  const { setCanGoToNextStep } = useStepper();

  const renderedDocument = useMemo(() => {
    const merged: Record<string, string> = {
      ...formValues,
      recipient_name: recipientName || formValues.recipient_name || "",
    };
    return renderTemplate(layout, merged);
  }, [layout, formValues, recipientName]);

  useEffect(() => {
    setCanGoToNextStep(true);
  }, [setCanGoToNextStep]);

  if (mode === "single") {
    return (
      <div className="grid w-full grid-cols-1 items-start gap-12 md:grid-cols-2">
        <div className="flex h-full w-full items-center justify-center">
          <div className="mx-auto flex h-72 w-96 items-center justify-center rounded-lg border bg-muted p-2 shadow-md">
            {renderedDocument ? (
              <div
                className="[&_svg]:h-auto [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:max-w-full [&_svg]:rounded-lg"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: renderedDocument }}
              />
            ) : (
              <p>No document preview available.</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">Details</h3>
          {schemaFields.map((field) => (
            <div
              key={field.key}
              className="flex items-center justify-between rounded-lg border p-3 text-sm"
            >
              <span className="text-muted-foreground">{labelFor(field)}</span>
              <span className="font-medium">
                {formValues[field.key] || "—"}
              </span>
            </div>
          ))}
          {recipientName || recipientEmail ? (
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Recipient</p>
              <p className="font-medium">
                {recipientName}
                {recipientEmail ? ` · ${recipientEmail}` : ""}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (mode === "bulk") {
    const validRows = bulkRows.filter((row) =>
      schemaFields
        .filter((f) => f.required)
        .every((f) => String(row.fields[f.key] ?? "").trim().length > 0)
    );
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Bulk rows</h3>
          <span className="text-xs text-muted-foreground">
            {bulkRows.length} total · {validRows.length} valid
          </span>
        </div>
        <div className="max-h-96 overflow-y-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                {schemaFields.map((f) => (
                  <th key={f.key} className="px-3 py-2 text-left">
                    {labelFor(f)}
                  </th>
                ))}
                <th className="px-3 py-2 text-left">Recipient</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {bulkRows.map((row, idx) => {
                const valid = schemaFields
                  .filter((f) => f.required)
                  .every(
                    (f) => String(row.fields[f.key] ?? "").trim().length > 0
                  );
                return (
                  <tr key={row.key} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">
                      {idx + 1}
                    </td>
                    {schemaFields.map((f) => (
                      <td key={f.key} className="px-3 py-2">
                        {row.fields[f.key] || "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2">{row.recipientName || "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          valid ? "text-green-600" : "text-destructive"
                        }
                      >
                        {valid ? "Ready" : "Missing fields"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-4 text-center">
      <h3 className="text-sm font-medium">CSV import</h3>
      <div className="rounded-2xl border border-border p-8">
        <p className="text-3xl font-semibold">{csvRowCount}</p>
        <p className="text-sm text-muted-foreground">
          {csvFile?.name ?? "No file selected"}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Rows will be validated by the backend on submit.
      </p>
    </div>
  );
}
