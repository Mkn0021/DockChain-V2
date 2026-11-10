"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { safeRedirect } from "@/lib/auth/utils";

type Mode = "login" | "signup";

const COPY = {
  login: {
    action: "Sign up",
    description: "Sign in to manage and issue documents.",
    prompt: "Don't have an account?",
    title: "Welcome back",
  },
  signup: {
    action: "Sign in",
    description: "Start issuing documents anyone can verify.",
    prompt: "Already have an account?",
    title: "Create your account",
  },
} as const;

export const AuthPanel = () => {
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));
  const [mode, setMode] = useState<Mode>("login");
  const copy = COPY[mode];

  const toggleMode = useCallback(
    () => setMode((current) => (current === "login" ? "signup" : "login")),
    []
  );

  return (
    <AuthCard
      description={copy.description}
      footer={
        <span>
          {copy.prompt}{" "}
          <button
            className="h-auto p-0 font-medium text-primary underline-offset-4 hover:underline"
            onClick={toggleMode}
            type="button"
          >
            {copy.action}
          </button>
        </span>
      }
      title={copy.title}
    >
      {mode === "login" ? (
        <LoginForm redirectTo={redirectTo} />
      ) : (
        <SignupForm redirectTo={redirectTo} />
      )}
    </AuthCard>
  );
};
