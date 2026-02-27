import type { ReportTemplate } from "@/types/template";

export const cryptoWalletTemplate: ReportTemplate = {
  id: "crypto-wallet",
  name: "Crypto Wallet Activity",
  description:
    "Portfolio value, token allocation, transaction history, and P&L breakdown.",
  sections: [
    { type: "cover", title: "Crypto Wallet Report" },
    { type: "table_of_contents", title: "Contents" },
    { type: "executive_summary", title: "Executive Summary", pageBreakBefore: true },
    { type: "key_metrics", title: "Portfolio Overview", pageBreakBefore: true },
    { type: "chart", title: "Portfolio Value Over Time" },
    { type: "chart", title: "Token Allocation" },
    { type: "chart", title: "Transaction Analysis" },
    { type: "rankings", title: "Top Holdings", pageBreakBefore: true },
    { type: "anomalies", title: "Notable Events" },
    { type: "data_table", title: "Transaction History", pageBreakBefore: true },
  ],
  colorScheme: {
    primary: "#f59e0b",
    secondary: "#d97706",
    accent: "#fbbf24",
    background: "#ffffff",
    surface: "#fffbeb",
    text: "#1a1a2e",
    textMuted: "#64748b",
    border: "#fde68a",
    chartColors: [
      "#f59e0b",
      "#d97706",
      "#fbbf24",
      "#92400e",
      "#b45309",
      "#78350f",
      "#fcd34d",
      "#ca8a04",
    ],
    positive: "#059669",
    negative: "#dc2626",
  },
  preferredCharts: ["area", "donut", "bar", "stacked_area"],
  pageSize: "a4",
};
