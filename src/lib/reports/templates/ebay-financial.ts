import type { ReportTemplate } from "@/types/template";

export const ebayFinancialTemplate: ReportTemplate = {
  id: "ebay-financial",
  name: "eBay Financial Overview",
  description:
    "Gross sales, eBay fees breakdown, shipping costs, net earnings, and payout history for your seller account.",
  sections: [
    { type: "cover", title: "eBay Financial Overview" },
    { type: "table_of_contents", title: "Contents" },
    {
      type: "executive_summary",
      title: "Executive Summary",
      pageBreakBefore: true,
    },
    {
      type: "key_metrics",
      title: "Financial Highlights",
      pageBreakBefore: true,
    },
    { type: "chart", title: "Revenue vs Fees vs Net" },
    { type: "chart", title: "Fee Breakdown by Type" },
    { type: "chart", title: "Payout History" },
    { type: "chart", title: "Daily Net Earnings" },
    { type: "anomalies", title: "Notable Observations" },
    {
      type: "rankings",
      title: "Top Transactions",
      pageBreakBefore: true,
    },
    {
      type: "data_table",
      title: "Transaction Details",
      pageBreakBefore: true,
    },
  ],
  colorScheme: {
    primary: "#86b817",
    secondary: "#0064d2",
    accent: "#f5af02",
    background: "#ffffff",
    surface: "#f7f7f7",
    text: "#191919",
    textMuted: "#707070",
    border: "#e5e5e5",
    chartColors: [
      "#86b817",
      "#0064d2",
      "#e53238",
      "#f5af02",
      "#5cb85c",
      "#4a90d9",
      "#ff6161",
      "#ffcc33",
    ],
    positive: "#86b817",
    negative: "#e53238",
  },
  preferredCharts: ["area", "stacked_bar", "bar", "donut"],
  pageSize: "a4",
};
