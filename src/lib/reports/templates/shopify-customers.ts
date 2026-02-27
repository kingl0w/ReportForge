import type { ReportTemplate } from "@/types/template";

export const shopifyCustomersTemplate: ReportTemplate = {
  id: "shopify-customers",
  name: "Shopify Customer Insights",
  description:
    "Customer growth trends, spending tiers, order frequency distribution, and new vs returning analysis.",
  sections: [
    { type: "cover", title: "Shopify Customer Insights" },
    { type: "table_of_contents", title: "Contents" },
    { type: "executive_summary", title: "Executive Summary", pageBreakBefore: true },
    { type: "key_metrics", title: "Key Metrics", pageBreakBefore: true },
    { type: "chart", title: "Customer Growth" },
    { type: "chart", title: "Order Frequency Distribution" },
    { type: "chart", title: "Spending Tiers" },
    { type: "chart", title: "New vs Returning Customers" },
    { type: "rankings", title: "Top Customers", pageBreakBefore: true },
    { type: "data_table", title: "Customer Data", pageBreakBefore: true },
  ],
  colorScheme: {
    primary: "#96bf48",
    secondary: "#5a8a1a",
    accent: "#479433",
    background: "#ffffff",
    surface: "#f8faf5",
    text: "#1a1a2e",
    textMuted: "#64748b",
    border: "#e2e8f0",
    chartColors: [
      "#96bf48",
      "#5a8a1a",
      "#479433",
      "#7ab648",
      "#3d7a2a",
      "#b8d980",
      "#2d6a1a",
      "#d4e8a8",
    ],
    positive: "#059669",
    negative: "#dc2626",
  },
  preferredCharts: ["area", "bar", "donut", "pie"],
  pageSize: "a4",
};
