"use client";

import { cn } from "cn";
import { FileSpreadsheet, Layers, User } from "lucide-react";
import { useEffect } from "react";

import { useStepper } from "@/components/documents/stepper";
import BulkBody from "@/components/documents/steps/step-2-bulk";
import CsvBody from "@/components/documents/steps/step-2-csv";
import SingleBody from "@/components/documents/steps/step-2-single";

import type { BulkRow, IssueMode } from "@/components/documents/issue-wizard";
import type { DocumentFieldDef } from "@/lib/schemas/parse-field";
import type { UseFormReturn } from "react-hook-form";

const MODES: {
  id: IssueMode;
  title: string;
  description: string;
  Icon: typeof User;
}[] = [
  {
    id: "single",
    title: "Single",
    description: "Issue one document at a time.",
    Icon: User,
  },
  {
    id: "bulk",
    title: "Bulk",
    description: "Create up to 500 rows at once.",
    Icon: Layers,
  },
  {
    id: "csv",
    title: "CSV",
    description: "Upload a spreadsheet of recipients.",
    Icon: FileSpreadsheet,
  },
];

interface DetailsStepProps {
  mode: IssueMode;
  onChangeMode: (mode: IssueMode) => void;
  schemaFields: DocumentFieldDef[];
  form: UseFormReturn<Record<string, string>>;
  expiresAt: string;
  onChangeExpiresAt: (value: string) => void;
  externalRef: string;
  onChangeExternalRef: (value: string) => void;
  recipientName: string;
  recipientEmail: string;
  onChangeRecipient: (name: string, email: string) => void;
  bulkRows: BulkRow[];
  onChangeBulkRows: (rows: BulkRow[]) => void;
  csvFile: File | null;
  onChangeCsvFile: (file: File | null, rowCount: number) => void;
}

export default function DetailsStep({
  mode,
  onChangeMode,
  schemaFields,
  form,
  expiresAt,
  onChangeExpiresAt,
  externalRef,
  onChangeExternalRef,
  recipientName,
  recipientEmail,
  onChangeRecipient,
  bulkRows,
  onChangeBulkRows,
  csvFile,
  onChangeCsvFile,
}: DetailsStepProps) {
  const { setCanGoToNextStep } = useStepper();

  useEffect(() => {
    if (mode === "single") {
      const values = form.getValues();
      const allRequired = schemaFields
        .filter((f) => f.required)
        .every((f) => String(values[f.key] ?? "").trim().length > 0);
      setCanGoToNextStep(allRequired);
    } else if (mode === "bulk") {
      const valid =
        bulkRows.length > 0 &&
        bulkRows.every((row) =>
          schemaFields
            .filter((f) => f.required)
            .every((f) => String(row.fields[f.key] ?? "").trim().length > 0)
        );
      setCanGoToNextStep(valid);
    } else {
      setCanGoToNextStep(Boolean(csvFile));
    }
  }, [mode, schemaFields, form, bulkRows, csvFile, setCanGoToNextStep]);

  useEffect(() => {
    if (mode !== "single") {
      return;
    }
    const sub = form.watch(() => {
      const values = form.getValues();
      const allRequired = schemaFields
        .filter((f) => f.required)
        .every((f) => String(values[f.key] ?? "").trim().length > 0);
      setCanGoToNextStep(allRequired);
    });
    return () => sub.unsubscribe();
  }, [mode, form, schemaFields, setCanGoToNextStep]);

  return (
    <div className="w-full max-w-5xl space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {MODES.map(({ id, title, description, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChangeMode(id)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-2xl border p-5 text-left transition-all",
              mode === id
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted"
            )}
          >
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-full",
                mode === id ? "bg-primary/10 text-primary" : "bg-muted"
              )}
            >
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </button>
        ))}
      </div>

      <div>
        {mode === "single" ? (
          <SingleBody
            schemaFields={schemaFields}
            form={form}
            expiresAt={expiresAt}
            onChangeExpiresAt={onChangeExpiresAt}
            externalRef={externalRef}
            onChangeExternalRef={onChangeExternalRef}
            recipientName={recipientName}
            recipientEmail={recipientEmail}
            onChangeRecipient={onChangeRecipient}
          />
        ) : null}

        {mode === "bulk" ? (
          <BulkBody
            schemaFields={schemaFields}
            rows={bulkRows}
            onChangeRows={onChangeBulkRows}
          />
        ) : null}

        {mode === "csv" ? (
          <CsvBody
            schemaFields={schemaFields}
            file={csvFile}
            onChangeFile={onChangeCsvFile}
          />
        ) : null}
      </div>
    </div>
  );
}
