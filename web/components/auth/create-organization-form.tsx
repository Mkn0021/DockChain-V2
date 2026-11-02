"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { AuthCard } from "@/components/auth/auth-card";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { slugify } from "@/lib/auth-utils";
import {
  type OrganizationValues,
  organizationSchema,
} from "@/lib/schemas/auth";

export const CreateOrganizationForm = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const slugEdited = useRef(false);

  const form = useForm<OrganizationValues>({
    defaultValues: { name: "", slug: "" },
    resolver: zodResolver(organizationSchema),
  });

  const createOrganization = useMutation({
    mutationFn: async (values: OrganizationValues) => {
      const organization = await apiFetch<{ id: string }>("/organizations", {
        body: values,
        method: "POST",
      });

      const { error } = await authClient.organization.setActive({
        organizationId: organization.id,
      });
      if (error) {
        throw new Error(error.message ?? "Could not open the organization");
      }

      return organization;
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        form.setError("slug", { message: "That slug is already taken" });
      }
    },
    onSuccess: async (_organization, values) => {
      await queryClient.invalidateQueries();
      toast.success("Organization created");
      router.replace(`/${values.slug}/dashboard`);
      router.refresh();
    },
  });

  const slugTaken = Boolean(form.formState.errors.slug);

  return (
    <AuthCard
      description="Your workspace for templates, wallets and documents."
      footer="You can invite your team in the next step."
      title="New organization"
    >
      <form
        id="organization-form"
        noValidate
        onSubmit={form.handleSubmit((values) =>
          createOrganization.mutate(values)
        )}
      >
        <FieldGroup>
          {slugTaken ? null : (
            <FormAlert message={createOrganization.error?.message} />
          )}

          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="organization-name">Name</FieldLabel>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  autoComplete="organization"
                  id="organization-name"
                  onChange={(event) => {
                    field.onChange(event);
                    if (!slugEdited.current) {
                      form.setValue("slug", slugify(event.target.value), {
                        shouldValidate: form.formState.isSubmitted,
                      });
                    }
                  }}
                  placeholder="Acme University"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
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
                  id="organization-slug"
                  onChange={(event) => {
                    slugEdited.current = true;
                    field.onChange(event);
                  }}
                  placeholder="acme-university"
                />
                <FieldDescription>
                  Used in your URLs. Filled in from the name.
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <SubmitButton pending={createOrganization.isPending}>
            Create organization
          </SubmitButton>
        </FieldGroup>
      </form>
    </AuthCard>
  );
};
