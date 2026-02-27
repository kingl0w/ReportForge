import type { ReportTemplate } from "@/types/template";

export const customTemplate: ReportTemplate = {
  id: "custom",
  name: "Custom Report",
  description:
    "Auto-generated report layout based on data structure analysis.",
  sections: [
    { type: "cover", title: "Data Analysis Report" },
    { type: "table_of_contents", title: "Contents" },
    { type: "executive_summary", title: "Executive Summary", pageBreakBefore: true },
    { type: "key_metrics", title: "Key Metrics", pageBreakBefore: true },
    { type: "chart", title: "Visualizations" },
    { type: "rankings", title: "Rankings", pageBreakBefore: true },
    { type: "anomalies", title: "Notable Observations" },
    { type: "correlations", title: "Data Relationships" },
    { type: "data_table", title: "Data Summary", pageBreakBefore: true },
  ],
  colorScheme: {
    primary: "#374151",
    secondary: "#4b5563",
    accent: "#6b7280",
    background: "#ffffff",
    surface: "#f9fafb",
    text: "#111827",
    textMuted: "#6b7280",
    border: "#e5e7eb",
    chartColors: [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
      "#06b6d4",
      "#84cc16",
    ],
    positive: "#059669",
    negative: "#dc2626",
  },
  preferredCharts: ["bar", "area", "donut", "scatter"],
  pageSize: "a4",
};
