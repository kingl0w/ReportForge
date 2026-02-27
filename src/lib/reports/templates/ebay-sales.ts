import type { ReportTemplate } from "@/types/template";

export const ebaySalesTemplate: ReportTemplate = {
  id: "ebay-sales",
  name: "eBay Sales Summary",
  description:
    "Total sales, fees, net profit, top listings, and sales trend analysis for your eBay seller account.",
  sections: [
    { type: "cover", title: "eBay Sales Summary" },
    { type: "table_of_contents", title: "Contents" },
    {
      type: "executive_summary",
      title: "Executive Summary",
      pageBreakBefore: true,
    },
    {
      type: "key_metrics",
      title: "Sales Overview",
      pageBreakBefore: true,
    },
    { type: "chart", title: "Revenue Trend" },
    { type: "chart", title: "Top Selling Items" },
    { type: "chart", title: "Order Status Breakdown" },
    { type: "chart", title: "Fees vs Net Earnings" },
    {
      type: "rankings",
      title: "Performance Rankings",
      pageBreakBefore: true,
    },
    { type: "anomalies", title: "Notable Observations" },
    { type: "data_table", title: "Order Details", pageBreakBefore: true },
  ],
  colorScheme: {
    primary: "#e53238",
    secondary: "#0064d2",
    accent: "#f5af02",
    background: "#ffffff",
    surface: "#f7f7f7",
    text: "#191919",
    textMuted: "#707070",
    border: "#e5e5e5",
    chartColors: [
      "#e53238",
      "#0064d2",
      "#f5af02",
      "#86b817",
      "#ff6161",
      "#4a90d9",
      "#ffcc33",
      "#5cb85c",
    ],
    positive: "#86b817",
    negative: "#e53238",
  },
  preferredCharts: ["area", "bar", "donut", "stacked_bar"],
  pageSize: "a4",
};
