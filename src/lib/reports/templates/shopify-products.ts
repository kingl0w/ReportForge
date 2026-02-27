import type { ReportTemplate } from "@/types/template";

export const shopifyProductsTemplate: ReportTemplate = {
  id: "shopify-products",
  name: "Shopify Product Performance",
  description:
    "Product catalog analysis with pricing distribution, inventory levels, and product type breakdown.",
  sections: [
    { type: "cover", title: "Shopify Product Performance" },
    { type: "table_of_contents", title: "Contents" },
    { type: "executive_summary", title: "Executive Summary", pageBreakBefore: true },
    { type: "key_metrics", title: "Key Metrics", pageBreakBefore: true },
    { type: "chart", title: "Products by Type" },
    { type: "chart", title: "Price Distribution" },
    { type: "chart", title: "Inventory Levels" },
    { type: "chart", title: "Products by Vendor" },
    { type: "rankings", title: "Top Products", pageBreakBefore: true },
    { type: "data_table", title: "Product Catalog", pageBreakBefore: true },
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
  preferredCharts: ["bar", "horizontal_bar", "donut", "scatter"],
  pageSize: "a4",
};
