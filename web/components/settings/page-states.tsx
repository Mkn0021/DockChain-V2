"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-8 md:grid-cols-2"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-1/3" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

interface PageErrorProps {
  title?: string;
  message?: string;
}

export function PageError({
  title = "Something went wrong",
  message,
}: PageErrorProps) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {message ??
          "Try reloading the page. If it keeps happening, contact support."}
      </AlertDescription>
    </Alert>
  );
}

interface PageEmptyProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageEmpty({ title, description, action }: PageEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
