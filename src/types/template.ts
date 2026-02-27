import type { ChartType } from "@/types/report";
import type { BrandingConfig } from "@/types/settings";

export type TemplateId =
  | "sales-report"
  | "social-media"
  | "crypto-wallet"
  | "ecommerce"
  | "analytics"
  | "financial"
  | "shopify-sales"
  | "shopify-products"
  | "shopify-customers"
  | "ebay-sales"
  | "ebay-listings"
  | "ebay-financial"
  | "custom";

export type SectionType =
  | "cover"
  | "table_of_contents"
  | "executive_summary"
  | "key_metrics"
  | "chart"
  | "rankings"
  | "anomalies"
  | "correlations"
  | "data_table";

export interface TemplateSection {
  type: SectionType;
  title: string;
  pageBreakBefore?: boolean;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  /*6-8 colors*/
  chartColors: string[];
  positive: string;
  negative: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: TemplateSection[];
  colorScheme: ColorScheme;
  preferredCharts: ChartType[];
  pageSize: "a4" | "letter";
}

export type ReportStatus =
  | "QUEUED"
  | "PARSING"
  | "ANALYZING"
  | "GENERATING_CHARTS"
  | "WRITING_NARRATIVE"
  | "RENDERING"
  | "UPLOADING"
  | "COMPLETE"
  | "FAILED";

export interface ReportConfig {
  userId: string;
  reportId: string;
  title: string;
  rawDataUrl: string;
  fileName: string;
  /*null for auto-detection*/
  templateId: string | null;
  format: "pdf" | "docx" | "both";
  /*legacy, use branding instead*/
  brandColor?: string;
  branding?: BrandingConfig;
  /*rows exceeding this are sampled*/
  planRowLimit?: number;
  /*free tier only*/
  watermark?: boolean;
}

export interface GeneratedReport {
  reportId: string;
  fileUrl: string;
  fileSize: number;
  pageCount: number;
  templateId: string;
  format: "pdf" | "docx";
  generatedAt: Date;
  previewUrl?: string;
  /*stored in metadata JSON*/
  analysis?: import("@/types/report").AnalysisResult;
  /*stored in metadata JSON*/
  narrative?: import("@/types/report").NarrativeResult;
}

export interface RenderedChart {
  title: string;
  svgString: string;
  narrative: string;
}

export interface ReportProgressEvent {
  status: ReportStatus;
  step: number;
  totalSteps: number;
  message: string;
}
