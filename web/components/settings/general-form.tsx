"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { toast } from "@/components/providers/toast-provider";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  generalFormSchema,
  type GeneralFormValues,
} from "@/lib/schemas/settings-general";
import { useUpdateOrganization } from "@/lib/settings/queries";

import { Button } from "../ui/button";
import { SubmitButton } from "../ui/submit-button";

interface GeneralFormProps {
  organizationId: string;
  initialName: string;
  initialSlug: string;
  canEdit: boolean;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+/g, "")
    .slice(0, 48);
}

export function GeneralForm({
  organizationId,
  initialName,
  initialSlug,
  canEdit,
}: GeneralFormProps) {
  const router = useRouter();
  const mutation = useUpdateOrganization(organizationId);

  const form = useForm<GeneralFormValues>({
    resolver: zodResolver(generalFormSchema),
    defaultValues: { name: initialName, slug: initialSlug },
    mode: "onBlur",
  });

  useEffect(() => {
    form.reset({ name: initialName, slug: initialSlug });
  }, [form, initialName, initialSlug]);

  const { isDirty } = form.formState;

  return (
    <form
      id="general-form"
      noValidate
      onSubmit={form.handleSubmit((values) =>
        mutation.mutate(values, {
          onSuccess: () => {
            toast.success("Organization updated.");
            router.refresh();
            if (values.slug !== initialSlug) {
              router.replace(`/${values.slug}/settings/general`);
            }
          },
          onError: (error: unknown) => {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to save changes.";
            toast.error(message);
          },
        })
      )}
    >
      <FieldGroup>
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="organization-name">
                Organization name
              </FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="organization"
                disabled={!canEdit || mutation.isPending}
                id="organization-name"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="slug"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="organization-slug">Slug</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="off"
                disabled={!canEdit || mutation.isPending}
                id="organization-slug"
                onChange={(event) =>
                  field.onChange(slugify(event.target.value))
                }
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Used in URLs and invite links. Changing it will redirect you.
                </p>
              )}
            </Field>
          )}
        />

        {canEdit ? (
          <div className="flex items-center gap-2 *:w-fit">
            <SubmitButton pending={mutation.isPending} disabled={!isDirty}>
              Save changes
            </SubmitButton>
            <Button
              variant="secondary"
              onClick={() =>
                form.reset({ name: initialName, slug: initialSlug })
              }
              disabled={!isDirty || mutation.isPending}
            >
              Reset
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You do not have permission to edit this organization.
          </p>
        )}
      </FieldGroup>
    </form>
  );
}
