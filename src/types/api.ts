import type { ReportStatus } from "@/types/template";

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export interface GenerateReportRequest {
  title: string;
  rawDataUrl: string;
  fileName: string;
  templateId?: string;
  format?: "pdf" | "docx" | "both";
  /*legacy single color override (use branding instead)*/
  brandColor?: string;
  /*full branding configuration (Pro users)*/
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    footerText?: string;
    showReportForgeBranding?: boolean;
  };
}

export interface GenerateReportResponse {
  reportId: string;
  status: ReportStatus;
}

export interface ReportStatusResponse {
  reportId: string;
  status: ReportStatus;
  step: number;
  totalSteps: number;
  message: string;
  fileUrl?: string;
  error?: string;
}
