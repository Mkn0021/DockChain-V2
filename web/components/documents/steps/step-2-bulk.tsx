"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  inputTypeForField,
  type DocumentFieldDef,
} from "@/lib/schemas/parse-field";

import type { BulkRow } from "@/components/documents/issue-wizard";

const MAX_ROWS = 500;

function newRow(): BulkRow {
  return {
    key: Math.random().toString(36).slice(2),
    fields: {},
    recipientName: "",
    recipientEmail: "",
  };
}

interface BulkBodyProps {
  schemaFields: DocumentFieldDef[];
  rows: BulkRow[];
  onChangeRows: (rows: BulkRow[]) => void;
}

function labelFor(field: DocumentFieldDef): string {
  return (
    field.label ||
    field.key.replaceAll("_", " ").replaceAll(/\b\w/g, (c) => c.toUpperCase())
  );
}

export default function BulkBody({
  schemaFields,
  rows,
  onChangeRows,
}: BulkBodyProps) {
  useEffect(() => {
    if (rows.length === 0) {
      onChangeRows([newRow()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateRow(key: string, patch: Partial<BulkRow>) {
    onChangeRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function updateField(rowKey: string, fieldKey: string, value: string) {
    onChangeRows(
      rows.map((r) =>
        r.key === rowKey
          ? { ...r, fields: { ...r.fields, [fieldKey]: value } }
          : r
      )
    );
  }

  function addRow() {
    if (rows.length >= MAX_ROWS) {
      return;
    }
    onChangeRows([...rows, newRow()]);
  }

  function removeRow(key: string) {
    if (rows.length === 1) {
      return;
    }
    onChangeRows(rows.filter((r) => r.key !== key));
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Rows</h3>
        <span className="text-xs text-muted-foreground">
          {rows.length} / {MAX_ROWS}
        </span>
      </div>

      {rows.map((row, index) => (
        <div
          key={row.key}
          className="space-y-4 rounded-2xl border border-border p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Row {index + 1}
            </span>
            {rows.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeRow(row.key)}
                aria-label={`Remove row ${index + 1}`}
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {schemaFields.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={`${row.key}-${field.key}`}
                  className="mb-1 block text-sm font-medium"
                >
                  {labelFor(field)}
                  {field.required ? (
                    <span className="text-destructive"> *</span>
                  ) : null}
                </label>
                <Input
                  id={`${row.key}-${field.key}`}
                  type={inputTypeForField(field)}
                  value={row.fields[field.key] ?? ""}
                  onChange={(e) =>
                    updateField(row.key, field.key, e.target.value)
                  }
                />
              </div>
            ))}

            <div>
              <label
                htmlFor={`${row.key}-recipient_name`}
                className="mb-1 block text-sm font-medium"
              >
                Recipient name
              </label>
              <Input
                id={`${row.key}-recipient_name`}
                placeholder="Optional"
                value={row.recipientName}
                onChange={(e) =>
                  updateRow(row.key, { recipientName: e.target.value })
                }
              />
            </div>

            <div>
              <label
                htmlFor={`${row.key}-recipient_email`}
                className="mb-1 block text-sm font-medium"
              >
                Recipient email
              </label>
              <Input
                id={`${row.key}-recipient_email`}
                type="email"
                placeholder="Optional"
                value={row.recipientEmail}
                onChange={(e) =>
                  updateRow(row.key, { recipientEmail: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addRow}
        disabled={rows.length >= MAX_ROWS}
        className="w-full"
      >
        <Plus className="size-4" />
        Add row
      </Button>
    </div>
  );
}
