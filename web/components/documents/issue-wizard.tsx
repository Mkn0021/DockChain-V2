"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { StepperLayout, StepperProvider } from "@/components/documents/stepper";
import SelectionStep from "@/components/documents/steps/step-1-template";
import DetailsStep from "@/components/documents/steps/step-2-details";
import PreviewStep from "@/components/documents/steps/step-3-preview";
import ConfirmStep from "@/components/documents/steps/step-4-confirm";
import { toast } from "@/components/providers/toast-provider";
import { apiFetch } from "@/lib/api/client";
import { useCreateDocument } from "@/lib/api/queries/documents";
import { buildIssueDocumentSchema } from "@/lib/schemas/issue-document";
import {
  parseFieldSchema,
  type DocumentFieldValues,
} from "@/lib/schemas/parse-field";

export type IssueMode = "single" | "bulk" | "csv";

export interface BulkRow {
  key: string;
  fields: Record<string, string>;
  recipientName: string;
  recipientEmail: string;
}

const STEPS = [
  {
    title: "Template",
    description: "Pick a published template to issue from.",
    nextButtonText: "Next",
  },
  {
    title: "Details",
    description: "Choose mode and fill in details.",
    nextButtonText: "Next",
  },
  {
    title: "Preview",
    description: "Confirm what will be issued.",
    nextButtonText: "Next",
  },
  {
    title: "Confirm",
    description: "Issue the document(s).",
    nextButtonText: "Issue",
  },
];

interface IssueWizardProps {
  organizationId: string;
}

export function IssueWizard({ organizationId }: IssueWizardProps) {
  const router = useRouter();

  const [current, setCurrent] = useState(0);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [versionId, setVersionId] = useState<string | null>(null);
  const [layout, setLayout] = useState("");
  const [rawFieldSchema, setRawFieldSchema] = useState<unknown>(null);

  const [mode, setMode] = useState<IssueMode>("single");

  const [expiresAt, setExpiresAt] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");

  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRowCount, setCsvRowCount] = useState(0);

  const schemaFields = useMemo(
    () => (rawFieldSchema ? parseFieldSchema(rawFieldSchema) : []),
    [rawFieldSchema]
  );

  const schemaKeys = useMemo(
    () => new Set(schemaFields.map((f) => f.key)),
    [schemaFields]
  );

  const form = useForm<Record<string, string>>({
    defaultValues: {},
    mode: "onSubmit",
    reValidateMode: "onChange",
    resolver: zodResolver(buildIssueDocumentSchema(schemaFields)),
  });

  useEffect(() => {
    if (!versionId) {
      return;
    }
    const defaults: Record<string, string> = {};
    for (const field of schemaFields) {
      defaults[field.key] = "";
    }
    form.reset(defaults);
    setRecipientName("");
    setRecipientEmail("");
    setBulkRows([]);
    setCsvFile(null);
    setCsvRowCount(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId]);

  const createDocument = useCreateDocument(organizationId);
  const mutateCreate = createDocument.mutateAsync;

  const issueSingle = useCallback(() => {
    if (!versionId) {
      return Promise.resolve(null);
    }
    const values = form.getValues();

    const fields: DocumentFieldValues = {};
    for (const [key, value] of Object.entries(values)) {
      if (!schemaKeys.has(key)) {
        continue;
      }
      const def = schemaFields.find((f) => f.key === key);
      if (def?.type === "number" && value !== "") {
        fields[key] = Number(value);
      } else {
        fields[key] = value;
      }
    }

    const name = recipientName.trim();
    const email = recipientEmail.trim();
    const recipient = name && email ? { name, email } : undefined;

    return mutateCreate({
      templateVersionId: versionId,
      fields,
      recipient,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      externalRef: externalRef || undefined,
      mode: "ready",
    });
  }, [
    form,
    mutateCreate,
    versionId,
    schemaKeys,
    schemaFields,
    expiresAt,
    externalRef,
    recipientName,
    recipientEmail,
  ]);

  const issueBulk = useCallback(() => {
    if (!versionId || bulkRows.length === 0) {
      return Promise.resolve(null);
    }
    const items = bulkRows.map((row) => {
      const fields: DocumentFieldValues = {};
      for (const [key, value] of Object.entries(row.fields)) {
        if (!schemaKeys.has(key)) {
          continue;
        }
        const def = schemaFields.find((f) => f.key === key);
        if (def?.type === "number" && value !== "") {
          fields[key] = Number(value);
        } else {
          fields[key] = value;
        }
      }
      const name = row.recipientName.trim();
      const email = row.recipientEmail.trim();
      const recipient = name && email ? { name, email } : undefined;
      return { fields, recipient };
    });

    return apiFetch<{ created: number }>(
      `/organizations/${organizationId}/documents/bulk`,
      {
        method: "POST",
        body: {
          templateVersionId: versionId,
          items,
          mode: "ready",
        },
      }
    );
  }, [organizationId, versionId, bulkRows, schemaKeys, schemaFields]);

  const issueCsv = useCallback(() => {
    if (!versionId || !csvFile) {
      return Promise.resolve(null);
    }
    const formData = new FormData();
    formData.set("templateVersionId", versionId);
    formData.set("file", csvFile);
    return apiFetch<{ created: number }>(
      `/organizations/${organizationId}/documents/import`,
      { method: "POST", body: formData }
    );
  }, [organizationId, versionId, csvFile]);

  const handleIssue = useCallback(async () => {
    try {
      if (mode === "single") {
        const doc = await issueSingle();
        if (doc?.id) {
          toast.success("Document created.");
          router.push("/documents");
          return true;
        }
        return false;
      }
      if (mode === "bulk") {
        const result = await issueBulk();
        if (result) {
          toast.success(
            `Created ${result.created} document${result.created === 1 ? "" : "s"}.`
          );
          router.push("/documents");
          return true;
        }
        return false;
      }
      const result = await issueCsv();
      if (result) {
        toast.success(
          `Imported ${result.created} document${result.created === 1 ? "" : "s"}.`
        );
        router.push("/documents");
        return true;
      }
      return false;
    } catch (error) {
      toast.error(`Issue failed: ${(error as Error).message}`);
      return false;
    }
  }, [mode, issueSingle, issueBulk, issueCsv, router]);

  function handleSelectTemplate(
    nextTemplateId: string,
    nextVersionId: string,
    nextLayout: string,
    nextFieldSchema: unknown,
    nextName: string
  ) {
    setTemplateId(nextTemplateId);
    setVersionId(nextVersionId);
    setLayout(nextLayout);
    setRawFieldSchema(nextFieldSchema);
    setTemplateName(nextName);
  }

  return (
    <StepperProvider>
      <StepperLayout
        steps={STEPS}
        current={current}
        setCurrent={(next) => {
          if (next >= STEPS.length) {
            return;
          }
          setCurrent(next);
        }}
      >
        {current === 0 ? (
          <SelectionStep
            organizationId={organizationId}
            selectedTemplateId={templateId}
            onSelectTemplate={handleSelectTemplate}
          />
        ) : null}

        {current === 1 ? (
          <DetailsStep
            mode={mode}
            onChangeMode={setMode}
            schemaFields={schemaFields}
            form={form}
            expiresAt={expiresAt}
            onChangeExpiresAt={setExpiresAt}
            externalRef={externalRef}
            onChangeExternalRef={setExternalRef}
            recipientName={recipientName}
            recipientEmail={recipientEmail}
            onChangeRecipient={(name, email) => {
              setRecipientName(name);
              setRecipientEmail(email);
            }}
            bulkRows={bulkRows}
            onChangeBulkRows={setBulkRows}
            csvFile={csvFile}
            onChangeCsvFile={(file, count) => {
              setCsvFile(file);
              setCsvRowCount(count);
            }}
          />
        ) : null}

        {current === 2 ? (
          <PreviewStep
            mode={mode}
            layout={layout}
            formValues={form.getValues()}
            recipientName={recipientName}
            recipientEmail={recipientEmail}
            bulkRows={bulkRows}
            csvFile={csvFile}
            csvRowCount={csvRowCount}
            schemaFields={schemaFields}
          />
        ) : null}

        {current === 3 ? (
          <ConfirmStep
            mode={mode}
            templateName={templateName}
            fieldValues={form.getValues()}
            schemaFields={schemaFields}
            recipientName={recipientName}
            recipientEmail={recipientEmail}
            bulkRows={bulkRows}
            csvFile={csvFile}
            csvRowCount={csvRowCount}
            expiresAt={expiresAt}
            externalRef={externalRef}
            onIssue={handleIssue}
          />
        ) : null}
      </StepperLayout>
    </StepperProvider>
  );
}
