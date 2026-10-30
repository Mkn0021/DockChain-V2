/* eslint-disable react-perf/jsx-no-new-function-as-prop -- react-hook-form Controller render callbacks must be inline */

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import { FormAlert } from "@/components/auth/form-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { AuthError, toAuthError } from "@/lib/auth-utils";
import { type SignupValues, signupSchema } from "@/lib/schemas/auth";

const DUPLICATE_CODES = new Set([
  "USER_ALREADY_EXISTS",
  "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
]);

export const SignupForm = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<SignupValues>({
    defaultValues: { confirmPassword: "", email: "", name: "", password: "" },
    resolver: zodResolver(signupSchema),
  });

  const signup = useMutation({
    mutationFn: async ({ email, name, password }: SignupValues) => {
      const { error } = await authClient.signUp.email({
        email,
        name,
        password,
      });
      if (error) {
        throw toAuthError(error);
      }
    },
    onError: (error) => {
      if (
        error instanceof AuthError &&
        error.code &&
        DUPLICATE_CODES.has(error.code)
      ) {
        form.setError("email", { message: error.message });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      router.replace("/onboarding");
      router.refresh();
    },
  });

  const emailTaken = Boolean(form.formState.errors.email);

  return (
    <form
      id="signup-form"
      noValidate
      onSubmit={form.handleSubmit((values) => signup.mutate(values))}
    >
      <FieldGroup>
        {emailTaken ? null : <FormAlert message={signup.error?.message} />}

        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="signup-name">Name</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="name"
                id="signup-name"
                placeholder="Ada Lovelace"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="signup-email">Email</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="email"
                id="signup-email"
                placeholder="name@company.com"
                type="email"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="signup-password">Password</FieldLabel>
              <PasswordInput
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="new-password"
                id="signup-password"
              />
              <FieldDescription>Use at least 8 characters.</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="signup-confirm-password">
                Confirm password
              </FieldLabel>
              <PasswordInput
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="new-password"
                id="signup-confirm-password"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <SubmitButton pending={signup.isPending}>Create account</SubmitButton>
      </FieldGroup>
    </form>
  );
};
