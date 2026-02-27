import type { DataSet, Column } from "@/types/data";
import type {
  AnalysisResult,
  DataProfile,
  KeyMetric,
} from "@/types/report";
import {
  mean,
  sum,
  extractNumbers,
  linearRegression,
} from "@/lib/analytics/statistics";
import { detectTrend } from "@/lib/analytics/trends";
import { detectColumnAnomalies } from "@/lib/analytics/anomalies";
import { findCorrelations } from "@/lib/analytics/correlations";
import { buildRanking } from "@/lib/analytics/rankings";
import { recommendCharts } from "@/lib/analytics/chart-recommender";
import { matchTemplate } from "@/lib/analytics/template-matcher";
import { growthRate } from "@/lib/analytics/trends";

/**all computations are local TypeScript -- zero API calls.
 * runs in milliseconds even on 10k rows.*/
export function analyzeDataset(data: DataSet): AnalysisResult {
  const { rows, columns } = data;
  const profile = buildDataProfile(rows, columns);

  const metrics = computeKeyMetrics(rows, profile);

  const trends = profile.numericColumns.map((col) => detectTrend(rows, col));

  const anomalies = profile.numericColumns.flatMap((col) =>
    detectColumnAnomalies(rows, col, 5)
  );
  //keep top 15 overall
  anomalies.sort((a, b) => b.deviationScore - a.deviationScore);
  const topAnomalies = anomalies.slice(0, 15);

  const rankings = [];
  if (
    profile.categoricalColumns.length > 0 &&
    profile.numericColumns.length > 0
  ) {
    //ranking for each category-value pair (limit to 3)
    for (const catCol of profile.categoricalColumns.slice(0, 2)) {
      for (const numCol of profile.numericColumns.slice(0, 2)) {
        rankings.push(buildRanking(rows, catCol, numCol, 5));
      }
    }
  }

  const allNumeric = [
    ...profile.numericColumns,
    ...profile.currencyColumns,
    ...profile.percentageColumns,
  ];
  const correlations = findCorrelations(rows, allNumeric);

  const chartConfigs = recommendCharts(rows, profile);

  const templateId = matchTemplate(profile);

  return {
    metrics,
    trends,
    anomalies: topAnomalies,
    rankings,
    correlations,
    chartConfigs,
    templateId,
    dataProfile: profile,
  };
}

export function buildDataProfile(
  rows: Record<string, unknown>[],
  columns: Column[]
): DataProfile {
  const numericColumns: string[] = [];
  const categoricalColumns: string[] = [];
  const dateColumns: string[] = [];
  const currencyColumns: string[] = [];
  const percentageColumns: string[] = [];

  for (const col of columns) {
    const name = col.originalName;
    switch (col.type) {
      case "number":
        numericColumns.push(name);
        break;
      case "currency":
        currencyColumns.push(name);
        numericColumns.push(name); //currency is also numeric for analysis
        break;
      case "percentage":
        percentageColumns.push(name);
        numericColumns.push(name);
        break;
      case "date":
        dateColumns.push(name);
        break;
      case "string":
      case "boolean":
        categoricalColumns.push(name);
        break;
    }
  }

  let dateRange: { min: string; max: string } | null = null;
  if (dateColumns.length > 0) {
    const dateCol = dateColumns[0];
    const dates: Date[] = [];
    for (const row of rows) {
      const d = new Date(String(row[dateCol]));
      if (!isNaN(d.getTime())) dates.push(d);
    }
    if (dates.length > 0) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      dateRange = {
        min: dates[0].toISOString().split("T")[0],
        max: dates[dates.length - 1].toISOString().split("T")[0],
      };
    }
  }

  return {
    rowCount: rows.length,
    dateRange,
    numericColumns,
    categoricalColumns,
    dateColumns,
    currencyColumns,
    percentageColumns,
  };
}

function computeKeyMetrics(
  rows: Record<string, unknown>[],
  profile: DataProfile
): KeyMetric[] {
  const metrics: KeyMetric[] = [];

  for (const col of profile.numericColumns) {
    const values = extractNumbers(rows, col);
    if (values.length === 0) continue;

    const total = sum(values);
    const avg = mean(values);

    //split into halves to derive a "previous period" comparison
    const midpoint = Math.floor(values.length / 2);
    let previousValue: number | null = null;
    let changePercent: number | null = null;
    let trend: "up" | "down" | "flat" = "flat";

    if (values.length >= 4) {
      const firstHalf = values.slice(0, midpoint);
      const secondHalf = values.slice(midpoint);
      const firstSum = sum(firstHalf);
      const secondSum = sum(secondHalf);
      previousValue = firstSum;
      changePercent = growthRate(secondSum, firstSum);

      if (changePercent !== null) {
        if (changePercent > 1) trend = "up";
        else if (changePercent < -1) trend = "down";
      }
    }

    //use sum for trending data (high R²), mean otherwise
    const { rSquared } = linearRegression(values);
    const value = rSquared > 0.5 ? total : avg;

    metrics.push({
      name: col,
      value,
      formattedValue: formatMetricValue(value),
      previousValue,
      changePercent:
        changePercent !== null ? Math.round(changePercent * 10) / 10 : null,
      trend,
    });
  }

  return metrics
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 6);
}

function formatMetricValue(n: number): string {
  if (Math.abs(n) >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toFixed(2);
}
