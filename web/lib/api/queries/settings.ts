"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

import type { ResponseOf } from "@/lib/api/response-of";

type OrgSettingsPath = "/organizations/{organizationId}/settings/";
export type OrgSettingsRow = ResponseOf<OrgSettingsPath, "get">;

export const settingsKeys = {
  all: (orgId: string) => ["settings", "orgSettings", orgId] as const,
};

function fetchOrgSettings(orgId: string): Promise<OrgSettingsRow> {
  return apiFetch<OrgSettingsRow>(`/organizations/${orgId}/settings/`);
}

export function useSettings(orgId: string) {
  return useQuery({
    queryKey: settingsKeys.all(orgId),
    queryFn: () => fetchOrgSettings(orgId),
  });
}
