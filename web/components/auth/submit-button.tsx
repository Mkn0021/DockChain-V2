import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface SubmitButtonProps {
  children: ReactNode;
  pending: boolean;
  disabled?: boolean;
}

export const SubmitButton = ({
  children,
  pending,
  disabled = false,
}: SubmitButtonProps) => (
  <Button className="w-full" disabled={pending || disabled} type="submit">
    {pending ? <Spinner /> : null}
    {children}
  </Button>
);
