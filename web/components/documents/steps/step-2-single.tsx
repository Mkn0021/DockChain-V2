"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  inputTypeForField,
  type DocumentFieldDef,
} from "@/lib/schemas/parse-field";

interface SingleBodyProps {
  schemaFields: DocumentFieldDef[];
  form: UseFormReturn<Record<string, string>>;
  expiresAt: string;
  onChangeExpiresAt: (value: string) => void;
  externalRef: string;
  onChangeExternalRef: (value: string) => void;
  recipientName: string;
  recipientEmail: string;
  onChangeRecipient: (name: string, email: string) => void;
}

function labelFor(field: DocumentFieldDef): string {
  return (
    field.label ||
    field.key.replaceAll("_", " ").replaceAll(/\b\w/g, (c) => c.toUpperCase())
  );
}

export default function SingleBody({
  schemaFields,
  form,
  expiresAt,
  onChangeExpiresAt,
  externalRef,
  onChangeExternalRef,
  recipientName,
  recipientEmail,
  onChangeRecipient,
}: SingleBodyProps) {
  return (
    <form
      className="grid grid-cols-1 gap-6 md:grid-cols-2"
      onSubmit={(e) => e.preventDefault()}
    >
      {schemaFields.map((field) => (
        <Controller
          key={field.key}
          control={form.control}
          name={field.key}
          render={({ field: rhf, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.key}>
                {labelFor(field)}
                {field.required ? (
                  <span className="text-destructive"> *</span>
                ) : null}
              </FieldLabel>
              {field.type === "enum" ? (
                <select
                  {...rhf}
                  className="w-full rounded-xl border-2 border-input/70 bg-transparent px-6 py-3 text-base"
                  id={field.key}
                  aria-invalid={fieldState.invalid}
                >
                  <option value="">Select…</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  {...rhf}
                  aria-invalid={fieldState.invalid}
                  id={field.key}
                  type={inputTypeForField(field)}
                  placeholder={`Enter ${labelFor(field)}`}
                />
              )}
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      ))}

      <div>
        <label
          htmlFor="recipient_name"
          className="mb-1 block text-sm font-medium"
        >
          Recipient name
        </label>
        <Input
          id="recipient_name"
          placeholder="Optional"
          value={recipientName}
          onChange={(e) => onChangeRecipient(e.target.value, recipientEmail)}
        />
      </div>

      <div>
        <label
          htmlFor="recipient_email"
          className="mb-1 block text-sm font-medium"
        >
          Recipient email
        </label>
        <Input
          id="recipient_email"
          type="email"
          placeholder="Optional"
          value={recipientEmail}
          onChange={(e) => onChangeRecipient(recipientName, e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="expires_at" className="mb-1 block text-sm font-medium">
          Expires at
        </label>
        <Input
          id="expires_at"
          type="date"
          value={expiresAt}
          onChange={(e) => onChangeExpiresAt(e.target.value)}
        />
      </div>

      <div>
        <label
          htmlFor="external_ref"
          className="mb-1 block text-sm font-medium"
        >
          External reference
        </label>
        <Input
          id="external_ref"
          placeholder="e.g. PO-2025-001"
          value={externalRef}
          onChange={(e) => onChangeExternalRef(e.target.value)}
        />
      </div>
    </form>
  );
}
