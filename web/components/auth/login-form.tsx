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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { resolvePostAuthPath } from "@/lib/auth-redirect";
import { toAuthError } from "@/lib/auth-utils";
import { type LoginValues, loginSchema } from "@/lib/schemas/auth";

export const LoginForm = ({ redirectTo }: { redirectTo: string | null }) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(loginSchema),
  });

  const login = useMutation({
    mutationFn: async (values: LoginValues) => {
      const { error } = await authClient.signIn.email(values);
      if (error) {
        throw toAuthError(error);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      router.replace(await resolvePostAuthPath(redirectTo));
      router.refresh();
    },
  });

  return (
    <form
      id="login-form"
      noValidate
      onSubmit={form.handleSubmit((values) => login.mutate(values))}
    >
      <FieldGroup>
        <FormAlert message={login.error?.message} />

        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-email">Email</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="email"
                id="login-email"
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
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <PasswordInput
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="current-password"
                id="login-password"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <SubmitButton pending={login.isPending}>Sign in</SubmitButton>
      </FieldGroup>
    </form>
  );
};
