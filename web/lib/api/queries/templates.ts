"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

import type { RequestBodyOf, ResponseOf } from "@/lib/api/response-of";

type TemplatesPath = "/organizations/{organizationId}/templates/";
type TemplatesList = ResponseOf<TemplatesPath, "get">;
type TemplateRow = TemplatesList["data"][number];
type TemplateBody = RequestBodyOf<TemplatesPath, "post">;
type TemplateResult = ResponseOf<TemplatesPath, "post">;

export const templatesKeys = {
  all: (orgId: string) => ["settings", "templates", orgId] as const,
  page: (orgId: string, limit: number, offset: number) =>
    [...templatesKeys.all(orgId), { limit, offset }] as const,
};

function fetchTemplates(
  orgId: string,
  limit: number,
  offset: number
): Promise<TemplatesList> {
  return apiFetch<TemplatesList>(
    `/organizations/${orgId}/templates/?limit=${limit}&offset=${offset}`
  );
}

function archiveTemplate(
  orgId: string,
  templateId: string
): Promise<TemplateRow> {
  return apiFetch<TemplateRow>(
    `/organizations/${orgId}/templates/${templateId}`,
    { method: "DELETE" }
  );
}

function createTemplate(
  orgId: string,
  body: TemplateBody
): Promise<TemplateResult> {
  return apiFetch<TemplateResult>(`/organizations/${orgId}/templates/`, {
    method: "POST",
    body,
  });
}

export function useTemplates(orgId: string, limit = 100, offset = 0) {
  return useQuery({
    queryKey: templatesKeys.page(orgId, limit, offset),
    queryFn: () => fetchTemplates(orgId, limit, offset),
  });
}

export function useArchiveTemplate(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => archiveTemplate(orgId, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templatesKeys.all(orgId) });
    },
  });
}

export function useCreateTemplate(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TemplateBody) => createTemplate(orgId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templatesKeys.all(orgId) });
    },
  });
}
