"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { RequestBodyOf, ResponseOf } from "@/lib/api/response-of";

type OrgPath = "/organizations/{organizationId}";
type OrgDetail = ResponseOf<OrgPath, "get">;
type OrgUpdate = RequestBodyOf<OrgPath, "patch">;

export const settingsKeys = {
  all: ["settings"] as const,
  organization: (id: string) =>
    [...settingsKeys.all, "organization", id] as const,
};

function fetchOrganization(id: string): Promise<OrgDetail> {
  return apiFetch<OrgDetail>(`/organizations/${id}`);
}

function updateOrganization(id: string, body: OrgUpdate): Promise<OrgDetail> {
  return apiFetch<OrgDetail>(`/organizations/${id}`, { method: "PATCH", body });
}

function deleteOrganization(id: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/organizations/${id}`, { method: "DELETE" });
}

export function useOrganization(organizationId: string | undefined) {
  return useQuery({
    queryKey: settingsKeys.organization(organizationId ?? ""),
    queryFn: () => fetchOrganization(organizationId as string),
    enabled: Boolean(organizationId),
  });
}

export function useUpdateOrganization(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: OrgUpdate) => updateOrganization(organizationId, body),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.organization(organizationId), data);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

export function useDeleteOrganization(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteOrganization(organizationId),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: settingsKeys.organization(organizationId),
      });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}
