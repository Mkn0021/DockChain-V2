import { DASHBOARD_PAGE_PATH } from "@/data/dashboard.data";

export type DashboardPagePath = keyof typeof DASHBOARD_PAGE_PATH;

export interface VerificationResult {
  exists: boolean;
  isValid: boolean;
  issuer: string;
  issuedAt: string;
}
