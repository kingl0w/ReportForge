import type { ReportTemplate } from "@/types/template";

export const ebayListingsTemplate: ReportTemplate = {
  id: "ebay-listings",
  name: "eBay Listing Performance",
  description:
    "Active listings analysis with sell-through rates, pricing distribution, top categories, and inventory status.",
  sections: [
    { type: "cover", title: "eBay Listing Performance" },
    { type: "table_of_contents", title: "Contents" },
    {
      type: "executive_summary",
      title: "Executive Summary",
      pageBreakBefore: true,
    },
    {
      type: "key_metrics",
      title: "Listing Metrics",
      pageBreakBefore: true,
    },
    { type: "chart", title: "Listings by Category" },
    { type: "chart", title: "Price Distribution" },
    { type: "chart", title: "Sell-Through Rate by Category" },
    { type: "chart", title: "Condition Breakdown" },
    {
      type: "rankings",
      title: "Top Listings",
      pageBreakBefore: true,
    },
    {
      type: "data_table",
      title: "Listing Catalog",
      pageBreakBefore: true,
    },
  ],
  colorScheme: {
    primary: "#0064d2",
    secondary: "#e53238",
    accent: "#f5af02",
    background: "#ffffff",
    surface: "#f7f7f7",
    text: "#191919",
    textMuted: "#707070",
    border: "#e5e5e5",
    chartColors: [
      "#0064d2",
      "#e53238",
      "#f5af02",
      "#86b817",
      "#4a90d9",
      "#ff6161",
      "#ffcc33",
      "#5cb85c",
    ],
    positive: "#86b817",
    negative: "#e53238",
  },
  preferredCharts: ["bar", "horizontal_bar", "donut", "scatter"],
  pageSize: "a4",
};
