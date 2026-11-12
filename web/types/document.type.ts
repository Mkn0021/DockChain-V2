import type { RequestBodyOf, ResponseOf } from "@/lib/api/response-of";

type DocumentsPath = "/organizations/{organizationId}/documents/";
export type DocumentRow = ResponseOf<DocumentsPath, "get">["data"][number];

type DocumentPath = "/organizations/{organizationId}/documents/{documentId}";
export type DocumentDetail = ResponseOf<DocumentPath, "get">;
export type DocumentCreateBody = RequestBodyOf<DocumentsPath, "post">;
export type DocumentPatchBody = RequestBodyOf<DocumentPath, "patch">;
export type DocumentStatus = DocumentRow["status"];

type BulkPath = "/organizations/{organizationId}/documents/bulk";
export type DocumentBulkBody = RequestBodyOf<BulkPath, "post">;
export type DocumentBulkResult = ResponseOf<BulkPath, "post">;

type ImportPath = "/organizations/{organizationId}/documents/import";
export type DocumentImportBody = RequestBodyOf<ImportPath, "post">;
export type DocumentImportResult = ResponseOf<ImportPath, "post">;

type PdfPath = "/organizations/{organizationId}/documents/{documentId}/pdf";
export type DocumentPdfResult = ResponseOf<PdfPath, "get">;

type BundlePath =
  "/organizations/{organizationId}/documents/{documentId}/bundle";
export type DocumentBundle = ResponseOf<BundlePath, "get">;

type TemplateDetailPath =
  "/organizations/{organizationId}/templates/{templateId}";
export type TemplateDetail = ResponseOf<TemplateDetailPath, "get">;
export type TemplateVersionRow = TemplateDetail["versions"][number];

export type DocumentFieldType = "text" | "number" | "date" | "email" | "enum";

export interface DocumentFieldDef {
  key: string;
  label: string;
  type: DocumentFieldType;
  required?: boolean;
  maxLength?: number;
  options?: string[];
  pattern?: string;
}

export type DocumentFieldValues = Record<
  string,
  string | number | boolean | null
>;

export interface DocumentRecipient {
  name: string;
  email: string;
}

export interface DocumentIssuePayload {
  templateVersionId: string;
  fields: DocumentFieldValues;
  recipient: DocumentRecipient;
  expiresAt?: string | null;
  externalRef?: string | null;
  issuerWalletId?: string | null;
  mode?: "draft" | "ready";
}
