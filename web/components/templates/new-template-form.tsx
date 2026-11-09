"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import InfoBox from "@/components/dashboard/info-box";
import { toast } from "@/components/providers/toast-provider";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  newTemplateSchema,
  templateFieldSchemaObject,
  type NewTemplateValues,
  type TemplateField,
} from "@/lib/schemas/template";
import { useCreateTemplate } from "@/lib/settings/queries";

import { SvgDropzone } from "./svg-dropzone";

const INSTRUCTIONS = [
  "Upload an SVG with {{placeholder}} tokens.",
  "Fields are detected automatically. Edit their labels and types.",
  "The template is ready to issue documents.",
];

function humanizeKey(key: string): string {
  return key.replaceAll("_", " ").replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

function mergeExtractedKeys(
  currentFields: TemplateField[],
  extractedKeys: string[]
): TemplateField[] {
  const byKey = new Map(currentFields.map((f) => [f.key, f]));
  return extractedKeys.map(
    (key) =>
      byKey.get(key) ?? {
        key,
        label: humanizeKey(key),
        type: "text",
        required: true,
      }
  );
}

export function NewTemplateForm({
  organizationId,
  organizationSlug,
}: {
  organizationId: string;
  organizationSlug: string;
}) {
  const router = useRouter();
  const mutation = useCreateTemplate(organizationId);

  const form = useForm<NewTemplateValues>({
    resolver: zodResolver(newTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      layout: "",
      fieldSchema: { fields: [] },
    },
    mode: "onChange",
  });

  return (
    <form
      id="new-template-form"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        const parsed = templateFieldSchemaObject.safeParse(values.fieldSchema);
        if (!parsed.success) {
          toast.error("Fix the field schema before deploying.");
          return;
        }
        mutation.mutate(
          {
            name: values.name,
            description: values.description || null,
            layout: values.layout,
            fieldSchema: parsed.data,
          },
          {
            onSuccess: (created) => {
              toast.success("Template created.");
              router.replace(`/${organizationSlug}/templates/${created.id}`);
            },
            onError: (e: unknown) =>
              toast.error(
                e instanceof Error ? e.message : "Failed to create template."
              ),
          }
        );
      })}
    >
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Controller
          control={form.control}
          name="layout"
          render={({ field, fieldState }) => (
            <Field
              data-invalid={fieldState.invalid}
              className="flex h-full justify-center"
            >
              <SvgDropzone
                value={field.value}
                onChange={(next, keys) => {
                  field.onChange(next);
                  const merged = mergeExtractedKeys(
                    form.getValues("fieldSchema.fields"),
                    keys
                  );
                  form.setValue("fieldSchema.fields", merged, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
                invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <FieldGroup>
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="template-name">Template name</FieldLabel>
                <Input
                  {...field}
                  id="template-name"
                  aria-invalid={fieldState.invalid}
                  placeholder="e.g. Bachelor of Science Diploma"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="template-description">
                  Description
                </FieldLabel>
                <Textarea
                  {...field}
                  id="template-description"
                  rows={3}
                  aria-invalid={fieldState.invalid}
                  placeholder="Short description shown to your team."
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <InfoBox title="How templates work" items={INSTRUCTIONS} />
        </FieldGroup>
      </div>

      <div className="mt-6 flex justify-center">
        <SubmitButton
          className="w-72"
          pending={mutation.isPending}
          disabled={!form.formState.isValid || mutation.isPending}
        >
          {mutation.isPending ? "Creating…" : "Create template"}
        </SubmitButton>
      </div>
    </form>
  );
}
