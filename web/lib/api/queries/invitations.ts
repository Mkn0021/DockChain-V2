"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

import { membersKeys } from "./members";

import type { RequestBodyOf, ResponseOf } from "@/lib/api/response-of";

type InvitationsPath = "/organizations/{organizationId}/invitations";
type InvitationsList = ResponseOf<InvitationsPath, "get">;
type InvitationRow = InvitationsList[number];
type InvitationBody = RequestBodyOf<InvitationsPath, "post">;

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

function inviteMember(
  orgId: string,
  body: InvitationBody
): Promise<ResponseOf<InvitationsPath, "post">> {
  return apiFetch<ResponseOf<InvitationsPath, "post">>(
    `/organizations/${orgId}/invitations`,
    { method: "POST", body }
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
