"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

import type { ResponseOf } from "@/lib/api/response-of";

type WalletsPath = "/organizations/{organizationId}/wallets/";
export type WalletsList = ResponseOf<WalletsPath, "get">;
export type WalletRow = WalletsList[number];

export const walletsKeys = {
  all: (orgId: string) => ["settings", "wallets", orgId] as const,
};

function fetchWallets(orgId: string): Promise<WalletsList> {
  return apiFetch<WalletsList>(`/organizations/${orgId}/wallets/`);
}

export function useWallets(orgId: string) {
  return useQuery({
    queryKey: walletsKeys.all(orgId),
    queryFn: () => fetchWallets(orgId),
  });
}
