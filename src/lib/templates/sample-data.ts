import type { DataSet, Column } from "@/types/data";
import type { AnalysisResult } from "@/types/report";

/**realistic e-commerce sales dataset with 12 months of data for template preview rendering*/

function col(name: string, type: Column["type"], samples: unknown[]): Column {
  return {
    name,
    originalName: name,
    type,
    sampleValues: samples.slice(0, 5),
    nullCount: 0,
  };
}

const MONTHS = [
  "Jan 2025", "Feb 2025", "Mar 2025", "Apr 2025", "May 2025", "Jun 2025",
  "Jul 2025", "Aug 2025", "Sep 2025", "Oct 2025", "Nov 2025", "Dec 2025",
];

const CATEGORIES = [
  "Electronics", "Clothing", "Home & Garden", "Sports", "Books",
];

const SAMPLE_ROWS: Record<string, unknown>[] = MONTHS.flatMap((month, mi) =>
  CATEGORIES.map((category, ci) => ({
    month,
    category,
    revenue: Math.round((5000 + mi * 800 + ci * 1200 + Math.sin(mi + ci) * 2000) * 100) / 100,
    orders: Math.round(40 + mi * 5 + ci * 8 + Math.cos(mi) * 15),
    customers: Math.round(30 + mi * 3 + ci * 5 + Math.sin(mi * 2) * 10),
    avg_order_value: Math.round((80 + ci * 20 + Math.sin(mi) * 15) * 100) / 100,
    return_rate: Math.round((5 + Math.sin(mi + ci) * 3) * 100) / 100,
  }))
);

export const SAMPLE_DATASET: DataSet = {
  columns: [
    col("month", "date", MONTHS),
    col("category", "string", CATEGORIES),
    col("revenue", "currency", [12450, 8900, 15200, 11350, 9800]),
    col("orders", "number", [95, 72, 110, 88, 65]),
    col("customers", "number", [68, 55, 82, 63, 48]),
    col("avg_order_value", "currency", [131.05, 123.61, 138.18, 128.98, 150.77]),
    col("return_rate", "percentage", [4.2, 5.8, 3.1, 6.5, 2.9]),
  ],
  rows: SAMPLE_ROWS,
  rowCount: SAMPLE_ROWS.length,
  metadata: {
    source: "sample-data",
    fileSize: 0,
    fileType: "sample",
    parseWarnings: [],
  },
};

/**used in the template builder preview so we don't need to run the analytics engine*/
export const SAMPLE_ANALYSIS: AnalysisResult = {
  metrics: [
    {
      name: "Total Revenue",
      value: 652480,
      formattedValue: "$652,480",
      previousValue: 520300,
      changePercent: 25.4,
      trend: "up",
    },
    {
      name: "Total Orders",
      value: 4920,
      formattedValue: "4,920",
      previousValue: 4100,
      changePercent: 20.0,
      trend: "up",
    },
    {
      name: "Avg Order Value",
      value: 132.62,
      formattedValue: "$132.62",
      previousValue: 126.90,
      changePercent: 4.5,
      trend: "up",
    },
    {
      name: "Total Customers",
      value: 3540,
      formattedValue: "3,540",
      previousValue: 3200,
      changePercent: 10.6,
      trend: "up",
    },
    {
      name: "Return Rate",
      value: 4.58,
      formattedValue: "4.58%",
      previousValue: 5.10,
      changePercent: -10.2,
      trend: "down",
    },
    {
      name: "Revenue per Customer",
      value: 184.32,
      formattedValue: "$184.32",
      previousValue: 162.59,
      changePercent: 13.4,
      trend: "up",
    },
  ],
  trends: [
    { column: "revenue", direction: "up", slope: 2400, rSquared: 0.89, periods: 12, movingAverage: [] },
    { column: "orders", direction: "up", slope: 18, rSquared: 0.82, periods: 12, movingAverage: [] },
    { column: "return_rate", direction: "down", slope: -0.15, rSquared: 0.45, periods: 12, movingAverage: [] },
  ],
  anomalies: [
    {
      column: "revenue",
      rowIndex: 55,
      value: 18500,
      expected: 12000,
      deviationScore: 2.8,
      method: "zscore",
      description: "Revenue for Electronics in Dec 2025 was significantly higher than expected",
    },
    {
      column: "return_rate",
      rowIndex: 42,
      value: 8.1,
      expected: 4.5,
      deviationScore: 2.4,
      method: "iqr",
      description: "Return rate for Sports in Sep 2025 exceeded normal range",
    },
  ],
  rankings: [
    {
      column: "revenue",
      groupColumn: "category",
      topN: [
        { label: "Home & Garden", value: 178500, formattedValue: "$178,500", percentOfTotal: 27.4 },
        { label: "Sports", value: 145200, formattedValue: "$145,200", percentOfTotal: 22.3 },
        { label: "Electronics", value: 132800, formattedValue: "$132,800", percentOfTotal: 20.4 },
      ],
      bottomN: [
        { label: "Books", value: 89600, formattedValue: "$89,600", percentOfTotal: 13.7 },
        { label: "Clothing", value: 106380, formattedValue: "$106,380", percentOfTotal: 16.3 },
      ],
    },
  ],
  correlations: [
    { columnA: "revenue", columnB: "orders", coefficient: 0.94, strength: "strong" },
    { columnA: "orders", columnB: "customers", coefficient: 0.88, strength: "strong" },
    { columnA: "avg_order_value", columnB: "return_rate", coefficient: -0.32, strength: "weak" },
  ],
  chartConfigs: [
    { type: "area", title: "Revenue Trends", xAxis: "month", yAxis: "revenue", priority: 1 },
    { type: "bar", title: "Revenue by Category", xAxis: "category", yAxis: "revenue", priority: 2 },
    { type: "donut", title: "Category Distribution", xAxis: "category", yAxis: "revenue", priority: 3 },
    { type: "multi_line", title: "Orders & Customers", xAxis: "month", yAxis: ["orders", "customers"], priority: 4 },
  ],
  templateId: "sales-report",
  dataProfile: {
    rowCount: 60,
    dateRange: { min: "Jan 2025", max: "Dec 2025" },
    numericColumns: ["revenue", "orders", "customers", "avg_order_value", "return_rate"],
    categoricalColumns: ["category"],
    dateColumns: ["month"],
    currencyColumns: ["revenue", "avg_order_value"],
    percentageColumns: ["return_rate"],
  },
};
