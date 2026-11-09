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

// ---- Members -------------------------------------------------------------

type MembersPath = "/organizations/{organizationId}/members";
type MembersList = ResponseOf<MembersPath, "get">;
type MemberRow = MembersList["members"][number];

type MemberPath = "/organizations/{organizationId}/members/{memberId}";
type MemberUpdateBody = RequestBodyOf<MemberPath, "patch">;

export type MemberRole = MemberUpdateBody["role"];

export const membersKeys = {
  all: (orgId: string) => ["settings", "members", orgId] as const,
  page: (orgId: string, limit: number, offset: number) =>
    [...membersKeys.all(orgId), { limit, offset }] as const,
};

function fetchMembers(
  orgId: string,
  limit: number,
  offset: number
): Promise<MembersList> {
  return apiFetch<MembersList>(
    `/organizations/${orgId}/members?limit=${limit}&offset=${offset}`
  );
}

function updateMemberRole(
  orgId: string,
  memberId: string,
  body: MemberUpdateBody
): Promise<{ member: MemberRow }> {
  return apiFetch<{ member: MemberRow }>(
    `/organizations/${orgId}/members/${memberId}`,
    { method: "PATCH", body }
  );
}

function removeMember(
  orgId: string,
  memberId: string
): Promise<{ member: MemberRow }> {
  return apiFetch<{ member: MemberRow }>(
    `/organizations/${orgId}/members/${memberId}`,
    { method: "DELETE" }
  );
}

function leaveOrganization(orgId: string): Promise<unknown> {
  return apiFetch<unknown>(`/organizations/${orgId}/leave`, { method: "POST" });
}

export function useMembers(orgId: string, limit = 50, offset = 0) {
  return useQuery({
    queryKey: membersKeys.page(orgId, limit, offset),
    queryFn: () => fetchMembers(orgId, limit, offset),
  });
}

export function useUpdateMemberRole(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: MemberRole }) =>
      updateMemberRole(orgId, memberId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKeys.all(orgId) });
    },
  });
}

export function useRemoveMember(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMember(orgId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKeys.all(orgId) });
    },
  });
}

export function useLeaveOrganization(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leaveOrganization(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

type InvitationsPath = "/organizations/{organizationId}/invitations";
type InvitationBody = RequestBodyOf<InvitationsPath, "post">;

function inviteMember(
  orgId: string,
  body: InvitationBody
): Promise<ResponseOf<InvitationsPath, "post">> {
  return apiFetch<ResponseOf<InvitationsPath, "post">>(
    `/organizations/${orgId}/invitations`,
    { method: "POST", body }
  );
}

export function useInviteMember(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: InvitationBody) => inviteMember(orgId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationsKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: membersKeys.all(orgId) });
    },
  });
}

// ---- Invitations ---------------------------------------------------------

type InvitationsList = ResponseOf<InvitationsPath, "get">;
type InvitationRow = InvitationsList[number];

export const invitationsKeys = {
  all: (orgId: string) => ["settings", "invitations", orgId] as const,
};

function fetchInvitations(orgId: string): Promise<InvitationsList> {
  return apiFetch<InvitationsList>(`/organizations/${orgId}/invitations`);
}

function cancelInvitation(
  orgId: string,
  invitationId: string
): Promise<InvitationRow> {
  return apiFetch<InvitationRow>(
    `/organizations/${orgId}/invitations/${invitationId}`,
    { method: "DELETE" }
  );
}

export function useInvitations(orgId: string) {
  return useQuery({
    queryKey: invitationsKeys.all(orgId),
    queryFn: () => fetchInvitations(orgId),
  });
}

export function useCancelInvitation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => cancelInvitation(orgId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationsKeys.all(orgId) });
    },
  });
}

// ---- Templates -----------------------------------------------------------

type TemplatesPath = "/organizations/{organizationId}/templates/";
type TemplatesList = ResponseOf<TemplatesPath, "get">;
type TemplateRow = TemplatesList["data"][number];

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

type NewTemplatePath = "/organizations/{organizationId}/templates/";
type NewTemplateBody = RequestBodyOf<NewTemplatePath, "post">;
type NewTemplateResult = ResponseOf<NewTemplatePath, "post">;

function createTemplate(
  orgId: string,
  body: NewTemplateBody
): Promise<NewTemplateResult> {
  return apiFetch<NewTemplateResult>(`/organizations/${orgId}/templates/`, {
    method: "POST",
    body,
  });
}

export function useCreateTemplate(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: NewTemplateBody) => createTemplate(orgId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templatesKeys.all(orgId) });
    },
  });
}
