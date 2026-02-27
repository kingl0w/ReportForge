import type { ReportTemplate } from "@/types/template";

export const socialMediaTemplate: ReportTemplate = {
  id: "social-media",
  name: "Social Media Analytics",
  description:
    "Follower growth, engagement rates, top content, and audience insights.",
  sections: [
    { type: "cover", title: "Social Media Analytics Report" },
    { type: "table_of_contents", title: "Contents" },
    { type: "executive_summary", title: "Executive Summary", pageBreakBefore: true },
    { type: "key_metrics", title: "Key Metrics", pageBreakBefore: true },
    { type: "chart", title: "Growth Trends" },
    { type: "chart", title: "Engagement Analysis" },
    { type: "chart", title: "Content Performance" },
    { type: "rankings", title: "Top Performers", pageBreakBefore: true },
    { type: "anomalies", title: "Notable Observations" },
    { type: "data_table", title: "Detailed Data", pageBreakBefore: true },
  ],
  colorScheme: {
    primary: "#7c3aed",
    secondary: "#8b5cf6",
    accent: "#a78bfa",
    background: "#ffffff",
    surface: "#faf5ff",
    text: "#1a1a2e",
    textMuted: "#64748b",
    border: "#e9d5ff",
    chartColors: [
      "#7c3aed",
      "#8b5cf6",
      "#a78bfa",
      "#c4b5fd",
      "#6d28d9",
      "#5b21b6",
      "#ddd6fe",
      "#4c1d95",
    ],
    positive: "#059669",
    negative: "#dc2626",
  },
  preferredCharts: ["area", "multi_line", "bar", "donut"],
  pageSize: "a4",
};
