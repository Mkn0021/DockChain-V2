"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

import type { RequestBodyOf, ResponseOf } from "@/lib/api/response-of";

// ---- Single create -------------------------------------------------------

type DocumentsPath = "/organizations/{organizationId}/documents/";
export type CreatedDocument = ResponseOf<DocumentsPath, "post">;
type CreateDocumentBody = RequestBodyOf<DocumentsPath, "post">;

// ---- Bulk create ---------------------------------------------------------

type BulkPath = "/organizations/{organizationId}/documents/bulk";
export type BulkBody = RequestBodyOf<BulkPath, "post">;
export type BulkCreateResult = ResponseOf<BulkPath, "post">;

// ---- CSV import ----------------------------------------------------------

type ImportPath = "/organizations/{organizationId}/documents/import";
export type ImportResult = ResponseOf<ImportPath, "post">;

export const documentsKeys = {
  all: (orgId: string) => ["settings", "documents", orgId] as const,
};

function createDocument(
  orgId: string,
  body: CreateDocumentBody
): Promise<CreatedDocument> {
  return apiFetch<CreatedDocument>(`/organizations/${orgId}/documents/`, {
    method: "POST",
    body,
  });
}

function bulkCreateDocuments(
  orgId: string,
  body: BulkBody
): Promise<BulkCreateResult> {
  return apiFetch<BulkCreateResult>(`/organizations/${orgId}/documents/bulk`, {
    method: "POST",
    body,
  });
}

function importDocumentsCsv(
  orgId: string,
  formData: FormData
): Promise<ImportResult> {
  return apiFetch<ImportResult>(`/organizations/${orgId}/documents/import`, {
    method: "POST",
    body: formData,
  });
}

export function useCreateDocument(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDocumentBody) => createDocument(orgId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.all(orgId) });
    },
  });
}

export function useBulkCreateDocuments(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkBody) => bulkCreateDocuments(orgId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.all(orgId) });
    },
  });
}

export function useImportDocumentsCsv(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => importDocumentsCsv(orgId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.all(orgId) });
    },
  });
}
