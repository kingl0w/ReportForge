import type { ChartType } from "@/types/report";
import type { ColorScheme, SectionType } from "@/types/template";

export type BuilderSectionType = SectionType | "text_block";

export interface BuilderSection {
  id: string;
  type: BuilderSectionType;
  title: string;
  pageBreakBefore: boolean;
  /*included in the report (default: true)*/
  visible?: boolean;

  chartType?: ChartType;
  xAxisColumn?: string;
  yAxisColumns?: string[];
  groupByColumn?: string;

  visibleColumns?: string[];
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  maxRows?: number;

  content?: string;

  metricColumns?: string[];

  rankingCount?: number;

  backgroundColor?: string;
}

/*stored in UserTemplate.config JSON column*/
export interface CustomTemplateConfig {
  sections: BuilderSection[];
  colorScheme: ColorScheme;
  pageSize: "a4" | "letter";
  preferredCharts: ChartType[];
}

export interface SectionTypeInfo {
  type: BuilderSectionType;
  label: string;
  description: string;
  icon: string;
  allowMultiple: boolean;
}

export const SECTION_TYPE_INFO: SectionTypeInfo[] = [
  {
    type: "cover",
    label: "Cover Page",
    description: "Title page with report name and date",
    icon: "file-text",
    allowMultiple: false,
  },
  {
    type: "table_of_contents",
    label: "Table of Contents",
    description: "Auto-generated page list",
    icon: "list",
    allowMultiple: false,
  },
  {
    type: "executive_summary",
    label: "Executive Summary",
    description: "AI-generated overview of key findings",
    icon: "sparkles",
    allowMultiple: false,
  },
  {
    type: "key_metrics",
    label: "Metric Cards",
    description: "KPI cards with trends and change indicators",
    icon: "trending-up",
    allowMultiple: false,
  },
  {
    type: "chart",
    label: "Chart",
    description: "Data visualization (line, bar, pie, etc.)",
    icon: "bar-chart-3",
    allowMultiple: true,
  },
  {
    type: "rankings",
    label: "Rankings",
    description: "Top and bottom performers",
    icon: "trophy",
    allowMultiple: false,
  },
  {
    type: "anomalies",
    label: "Anomalies",
    description: "Detected outliers and unusual values",
    icon: "alert-triangle",
    allowMultiple: false,
  },
  {
    type: "correlations",
    label: "Correlations",
    description: "Relationships between data columns",
    icon: "git-branch",
    allowMultiple: false,
  },
  {
    type: "data_table",
    label: "Data Table",
    description: "Raw data in tabular format",
    icon: "table",
    allowMultiple: false,
  },
  {
    type: "text_block",
    label: "Text Block",
    description: "Custom text content for notes or context",
    icon: "type",
    allowMultiple: true,
  },
];

export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  primary: "#2563eb",
  secondary: "#3b82f6",
  accent: "#60a5fa",
  background: "#ffffff",
  surface: "#f8fafc",
  text: "#1a1a2e",
  textMuted: "#64748b",
  border: "#e2e8f0",
  chartColors: [
    "#2563eb",
    "#7c3aed",
    "#db2777",
    "#ea580c",
    "#16a34a",
    "#0891b2",
    "#4f46e5",
    "#c026d3",
  ],
  positive: "#059669",
  negative: "#dc2626",
};

export const DEFAULT_BUILDER_SECTIONS: BuilderSection[] = [
  { id: "s-cover", type: "cover", title: "Report Cover", pageBreakBefore: false },
  { id: "s-toc", type: "table_of_contents", title: "Contents", pageBreakBefore: false },
  { id: "s-summary", type: "executive_summary", title: "Executive Summary", pageBreakBefore: true },
  { id: "s-metrics", type: "key_metrics", title: "Key Metrics", pageBreakBefore: true },
  { id: "s-chart-1", type: "chart", title: "Primary Visualization", pageBreakBefore: false, chartType: "area" },
  { id: "s-rankings", type: "rankings", title: "Rankings", pageBreakBefore: true },
  { id: "s-table", type: "data_table", title: "Data Summary", pageBreakBefore: true },
];
