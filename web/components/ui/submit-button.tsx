import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import type { ReactNode } from "react";

interface SubmitButtonProps {
  className?: string;
  children: ReactNode;
  pending: boolean;
  disabled?: boolean;
  form?: string;
}

export const SubmitButton = ({
  className,
  children,
  pending,
  disabled = false,
  form,
}: SubmitButtonProps) => (
  <Button
    className={cn("w-full", className)}
    disabled={pending || disabled}
    form={form}
    type="submit"
  >
    {pending ? <Spinner /> : null}
    {children}
  </Button>
);
