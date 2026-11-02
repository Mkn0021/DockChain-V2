"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

export interface OrgUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface OrgContextValue {
  organization: OrgSummary;
  organizations: OrgSummary[];
  user: OrgUser;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({
  value,
  children,
}: {
  value: OrgContextValue;
  children: ReactNode;
}) {
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within OrgProvider");
  }
  return ctx;
}
