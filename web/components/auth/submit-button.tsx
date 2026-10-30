import  { type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface SubmitButtonProps {
  children: ReactNode;
  pending: boolean;
}

export const SubmitButton = ({ children, pending }: SubmitButtonProps) => (
  <Button className="w-full" disabled={pending} type="submit">
    {pending ? <Spinner /> : null}
    {children}
  </Button>
);
