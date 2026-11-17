"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

// ---- List ---------------------------------------------------------------

interface DocumentsListQuery {
  limit?: number;
  offset?: number;
  status?: "draft" | "ready" | "batched" | "issued" | "revoked";
  templateId?: string;
  templateVersionId?: string;
  externalRef?: string;
  issuerWalletId?: string;
  batchId?: string;
}

export type DocumentListRow = CreatedDocument;

interface DocumentsListResult {
  data: CreatedDocument[];
  meta: { limit: number; offset: number; total: number };
}

function fetchDocuments(
  orgId: string,
  query: DocumentsListQuery
): Promise<DocumentsListResult> {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit ?? 50));
  params.set("offset", String(query.offset ?? 0));
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.templateId) {
    params.set("templateId", query.templateId);
  }
  if (query.templateVersionId) {
    params.set("templateVersionId", query.templateVersionId);
  }
  if (query.externalRef) {
    params.set("externalRef", query.externalRef);
  }
  if (query.issuerWalletId) {
    params.set("issuerWalletId", query.issuerWalletId);
  }
  if (query.batchId) {
    params.set("batchId", query.batchId);
  }
  return apiFetch<DocumentsListResult>(
    `/organizations/${orgId}/documents/?${params.toString()}`
  );
}

export function useDocuments(orgId: string, query: DocumentsListQuery = {}) {
  return useQuery({
    queryKey: [...documentsKeys.all(orgId), "list", query] as const,
    queryFn: () => fetchDocuments(orgId, query),
  });
}

// ---- Detail -------------------------------------------------------------

type DocumentDetailPath =
  "/organizations/{organizationId}/documents/{documentId}";
export type DocumentDetail = ResponseOf<DocumentDetailPath, "get">;

export const documentDetailKeys = {
  detail: (orgId: string, documentId: string) =>
    [...documentsKeys.all(orgId), "detail", documentId] as const,
};

function fetchDocument(
  orgId: string,
  documentId: string
): Promise<DocumentDetail> {
  return apiFetch<DocumentDetail>(
    `/organizations/${orgId}/documents/${documentId}`
  );
}

export function useDocument(
  orgId: string | undefined,
  documentId: string | null
) {
  return useQuery({
    queryKey: documentDetailKeys.detail(orgId ?? "", documentId ?? ""),
    queryFn: () => fetchDocument(orgId as string, documentId as string),
    enabled: Boolean(orgId && documentId),
  });
}

// ---- Revoke prepare -----------------------------------------------------

type RevokePreparePath =
  "/organizations/{organizationId}/documents/{documentId}/revoke/prepare";
type RevokePrepareBody = RequestBodyOf<RevokePreparePath, "post">;
export type RevokePrepareResult = ResponseOf<RevokePreparePath, "post">;

function prepareRevoke(
  orgId: string,
  documentId: string,
  body: RevokePrepareBody
): Promise<RevokePrepareResult> {
  return apiFetch<RevokePrepareResult>(
    `/organizations/${orgId}/documents/${documentId}/revoke/prepare`,
    { method: "POST", body }
  );
}

export function usePrepareRevoke(orgId: string, documentId: string) {
  return useMutation({
    mutationFn: (body: RevokePrepareBody) =>
      prepareRevoke(orgId, documentId, body),
  });
}

// ---- Revoke submit ------------------------------------------------------

type RevokeSubmitPath =
  "/organizations/{organizationId}/documents/{documentId}/revoke";
type RevokeSubmitBody = RequestBodyOf<RevokeSubmitPath, "post">;
type RevokeSubmitResult = ResponseOf<RevokeSubmitPath, "post">;

function submitRevoke(
  orgId: string,
  documentId: string,
  body: RevokeSubmitBody
): Promise<RevokeSubmitResult> {
  return apiFetch<RevokeSubmitResult>(
    `/organizations/${orgId}/documents/${documentId}/revoke`,
    { method: "POST", body }
  );
}

export function useSubmitRevoke(orgId: string, documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RevokeSubmitBody) =>
      submitRevoke(orgId, documentId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: documentDetailKeys.detail(orgId, documentId),
      });
      queryClient.invalidateQueries({ queryKey: documentsKeys.all(orgId) });
    },
  });
}
