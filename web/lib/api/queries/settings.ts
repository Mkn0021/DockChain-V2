"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

import type { RequestBodyOf, ResponseOf } from "@/lib/api/response-of";

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

type SettingsPatchPath = "/organizations/{organizationId}/settings/";
type SettingsPatchBody = RequestBodyOf<SettingsPatchPath, "patch">;

function updateSettings(
  orgId: string,
  body: SettingsPatchBody
): Promise<OrgSettingsRow> {
  return apiFetch<OrgSettingsRow>(`/organizations/${orgId}/settings/`, {
    method: "PATCH",
    body,
  });
}

export function useUpdateSettings(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SettingsPatchBody) => updateSettings(orgId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all(orgId) });
    },
  });
}
