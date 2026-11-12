"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

import type { RequestBodyOf, ResponseOf } from "@/lib/api/response-of";

type WalletsPath = "/organizations/{organizationId}/wallets/";
type WalletsList = ResponseOf<WalletsPath, "get">;
export type WalletRow = WalletsList[number];

type WalletPath = "/organizations/{organizationId}/wallets/{walletId}";
type WalletDetail = ResponseOf<WalletPath, "get">;

type ChallengePath = "/organizations/{organizationId}/wallets/challenge";
type ChallengeBody = RequestBodyOf<ChallengePath, "post">;
type ChallengeResult = ResponseOf<ChallengePath, "post">;

type RegisterBody = RequestBodyOf<WalletsPath, "post">;

type VerifyDomainPath =
  "/organizations/{organizationId}/wallets/{walletId}/verify-domain";
type VerifyDomainResult = ResponseOf<VerifyDomainPath, "post">;

export const walletsKeys = {
  all: (orgId: string) => ["settings", "wallets", orgId] as const,
  detail: (orgId: string, walletId: string) =>
    [...walletsKeys.all(orgId), walletId] as const,
};

function fetchWallets(orgId: string): Promise<WalletsList> {
  return apiFetch<WalletsList>(`/organizations/${orgId}/wallets/`);
}

function fetchWallet(orgId: string, walletId: string): Promise<WalletDetail> {
  return apiFetch<WalletDetail>(`/organizations/${orgId}/wallets/${walletId}`);
}

function createChallenge(
  orgId: string,
  body: ChallengeBody
): Promise<ChallengeResult> {
  return apiFetch<ChallengeResult>(
    `/organizations/${orgId}/wallets/challenge`,
    { method: "POST", body }
  );
}

function registerWallet(orgId: string, body: RegisterBody): Promise<WalletRow> {
  return apiFetch<WalletRow>(`/organizations/${orgId}/wallets/`, {
    method: "POST",
    body,
  });
}

function verifyDomain(
  orgId: string,
  walletId: string
): Promise<VerifyDomainResult> {
  return apiFetch<VerifyDomainResult>(
    `/organizations/${orgId}/wallets/${walletId}/verify-domain`,
    { method: "POST" }
  );
}

export function useWallets(orgId: string) {
  return useQuery({
    queryKey: walletsKeys.all(orgId),
    queryFn: () => fetchWallets(orgId),
  });
}

export function useWallet(orgId: string, walletId: string) {
  return useQuery({
    queryKey: walletsKeys.detail(orgId, walletId),
    queryFn: () => fetchWallet(orgId, walletId),
  });
}

export function useCreateWalletChallenge(orgId: string) {
  return useMutation({
    mutationFn: (body: ChallengeBody) => createChallenge(orgId, body),
  });
}

export function useRegisterWallet(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RegisterBody) => registerWallet(orgId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletsKeys.all(orgId) });
    },
  });
}

export function useVerifyWalletDomain(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (walletId: string) => verifyDomain(orgId, walletId),
    onSuccess: (_data, walletId) => {
      queryClient.invalidateQueries({
        queryKey: walletsKeys.detail(orgId, walletId),
      });
      queryClient.invalidateQueries({ queryKey: walletsKeys.all(orgId) });
    },
  });
}
