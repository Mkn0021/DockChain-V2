"use client";

import { Upload } from "lucide-react";
import { useRef } from "react";

import type { DocumentFieldDef } from "@/lib/schemas/parse-field";

interface CsvBodyProps {
  schemaFields: DocumentFieldDef[];
  file: File | null;
  onChangeFile: (file: File | null, rowCount: number) => void;
}

async function countCsvRows(file: File): Promise<number> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return Math.max(0, lines.length - 1);
}

export default function CsvBody({
  schemaFields,
  file,
  onChangeFile,
}: CsvBodyProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    if (!next) {
      onChangeFile(null, 0);
      return;
    }
    const count = await countCsvRows(next);
    onChangeFile(next, count);
  }

  const fieldColumns = schemaFields.map((f) => f.key);
  const optionalColumns = [
    "recipient_name",
    "recipient_email",
    "expires_at",
    "external_ref",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium">Expected columns</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {fieldColumns.map((col) => (
            <code key={col} className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {col}
            </code>
          ))}
          {optionalColumns.map((col) => (
            <code
              key={col}
              className="rounded bg-muted/60 px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              {col}
            </code>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          The header row must include every template field key. Optional columns
          can be added for recipient and metadata.
        </p>
      </div>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleChange}
        />
        {file ? (
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onChangeFile(null, 0);
                if (inputRef.current) {
                  inputRef.current.value = "";
                }
              }}
              className="text-sm text-destructive hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-12 hover:border-muted-foreground"
          >
            <Upload className="size-10 text-muted-foreground" />
            <p className="text-sm font-medium">Upload CSV</p>
            <p className="text-xs text-muted-foreground">
              Click to select a file
            </p>
          </button>
        )}
      </div>
    </div>
  );
}
