"use client";

import { AccessDenied } from "@/components/settings/access-denied";

import type { ReactNode } from "react";

interface DataTablePageProps {
  canRead: boolean;
  headerAction?: ReactNode;
  children: ReactNode;
}

export function DataTablePage({
  canRead,
  headerAction,
  children,
}: DataTablePageProps) {
  if (!canRead) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-4">
      {headerAction ? (
        <div className="flex justify-end">{headerAction}</div>
      ) : null}
      {children}
    </div>
  );
}
