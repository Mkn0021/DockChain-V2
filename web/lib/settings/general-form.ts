"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { toast } from "@/components/providers/toast-provider";
import { useUpdateOrganization } from "@/lib/settings/queries";

export interface GeneralFormValues {
  name: string;
  slug: string;
}
export type GeneralFormErrors = Partial<
  Record<keyof GeneralFormValues, string>
>;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 48);
}

function validate(values: GeneralFormValues): GeneralFormErrors {
  const errors: GeneralFormErrors = {};
  const name = values.name.trim();
  const slug = values.slug.trim();

  if (name.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (name.length > 64) {
    errors.name = "Name must be 64 characters or fewer.";
  }

  if (slug.length < 2) {
    errors.slug = "Slug must be at least 2 characters.";
  } else if (slug.length > 48) {
    errors.slug = "Slug must be 48 characters or fewer.";
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    errors.slug = "Use lowercase letters, numbers, and single hyphens only.";
  }

  return errors;
}

interface Args {
  organizationId: string;
  initial: GeneralFormValues;
  canEdit: boolean;
}

export function useGeneralForm({ organizationId, initial, canEdit }: Args) {
  const router = useRouter();
  const [values, setValues] = useState<GeneralFormValues>(initial);
  const [errors, setErrors] = useState<GeneralFormErrors>({});
  const mutation = useUpdateOrganization(organizationId);

  useEffect(() => {
    setValues(initial);
    setErrors({});
  }, [initial]);

  const isDirty = values.name !== initial.name || values.slug !== initial.slug;
  const isSubmitDisabled = !canEdit || !isDirty || mutation.isPending;

  function handleNameChange(next: string) {
    setValues((prev) => ({ ...prev, name: next }));
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  }

  function handleSlugChange(next: string) {
    setValues((prev) => ({ ...prev, slug: slugify(next) }));
    if (errors.slug) {
      setErrors((prev) => ({ ...prev, slug: undefined }));
    }
  }

  function handleReset() {
    setValues(initial);
    setErrors({});
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      return;
    }

    const nextErrors = validate(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const nextSlug = values.slug.trim();

    mutation.mutate(
      { name: values.name.trim(), slug: nextSlug },
      {
        onSuccess: () => {
          toast.success("Organization updated.");
          if (nextSlug !== initial.slug) {
            router.replace(`/${nextSlug}/settings/general`);
          }
        },
        onError: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : "Failed to save changes.";
          toast.error(message);
        },
      }
    );
  }

  return {
    values,
    errors,
    canEdit,
    isDirty,
    isSubmitDisabled,
    isPending: mutation.isPending,
    handleNameChange,
    handleSlugChange,
    handleReset,
    handleSubmit,
  };
}
