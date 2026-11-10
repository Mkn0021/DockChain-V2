"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

import type { RequestBodyOf, ResponseOf } from "@/lib/api/response-of";

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
