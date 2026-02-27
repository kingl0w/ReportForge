import type { ChartConfig, DataProfile } from "@/types/report";
import { frequencyDistribution } from "@/lib/analytics/statistics";

const MAX_CHARTS = 6;

/**rule-based chart type selection from data profile.
 * returns an ordered list of ChartConfig (most important first, max 6).*/
export function recommendCharts(
  rows: Record<string, unknown>[],
  profile: DataProfile
): ChartConfig[] {
  const charts: ChartConfig[] = [];
  const { dateColumns, numericColumns, categoricalColumns } = profile;

  if (dateColumns.length > 0 && numericColumns.length > 0) {
    const dateCol = dateColumns[0];

    if (numericColumns.length === 1) {
      //single metric over time -> area chart with trend line
      charts.push({
        type: "area",
        title: `${numericColumns[0]} Over Time`,
        xAxis: dateCol,
        yAxis: numericColumns[0],
        priority: 1,
      });
    } else if (numericColumns.length === 2) {
      //two metrics -> dual-axis line chart
      charts.push({
        type: "dual_axis",
        title: `${numericColumns[0]} vs ${numericColumns[1]}`,
        xAxis: dateCol,
        yAxis: [numericColumns[0], numericColumns[1]],
        priority: 1,
      });
    } else {
      //3+ metrics -> multi-line chart (top 4)
      const topMetrics = numericColumns.slice(0, 4);
      charts.push({
        type: "multi_line",
        title: "Key Metrics Over Time",
        xAxis: dateCol,
        yAxis: topMetrics,
        priority: 1,
      });
    }

    //date + numeric + categorical -> grouped/stacked bar
    if (categoricalColumns.length > 0) {
      const catCol = categoricalColumns[0];
      const uniqueValues = countUnique(rows, catCol);

      if (uniqueValues <= 8) {
        charts.push({
          type: uniqueValues <= 5 ? "stacked_bar" : "grouped_bar",
          title: `${numericColumns[0]} by ${catCol}`,
          xAxis: dateCol,
          yAxis: numericColumns[0],
          groupBy: catCol,
          priority: 3,
        });
      }
    }
  }

  if (categoricalColumns.length > 0 && numericColumns.length > 0) {
    for (const catCol of categoricalColumns.slice(0, 2)) {
      const uniqueValues = countUnique(rows, catCol);

      if (uniqueValues < 8 && numericColumns.length > 0) {
        //few categories -> pie/donut
        charts.push({
          type: uniqueValues <= 6 ? "donut" : "pie",
          title: `${numericColumns[0]} by ${catCol}`,
          xAxis: catCol,
          yAxis: numericColumns[0],
          priority: 2,
        });
      }

      //horizontal if >7 categories
      charts.push({
        type: uniqueValues > 7 ? "horizontal_bar" : "bar",
        title: `${numericColumns[0]} by ${catCol}`,
        xAxis: catCol,
        yAxis: numericColumns[0],
        priority: uniqueValues > 7 ? 4 : 2,
      });
    }
  }

  if (numericColumns.length >= 2 && dateColumns.length === 0) {
    charts.push({
      type: "scatter",
      title: `${numericColumns[0]} vs ${numericColumns[1]}`,
      xAxis: numericColumns[0],
      yAxis: numericColumns[1],
      priority: 3,
    });
  }

  if (
    dateColumns.length > 0 &&
    numericColumns.length >= 3 &&
    numericColumns.length <= 6
  ) {
    charts.push({
      type: "stacked_area",
      title: "Composition Over Time",
      xAxis: dateColumns[0],
      yAxis: numericColumns.slice(0, 5),
      priority: 4,
    });
  }

  return deduplicateCharts(charts)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_CHARTS);
}

function countUnique(rows: Record<string, unknown>[], column: string): number {
  return frequencyDistribution(rows, column).length;
}

function deduplicateCharts(charts: ChartConfig[]): ChartConfig[] {
  const seen = new Set<string>();
  return charts.filter((c) => {
    const key = `${c.type}:${c.xAxis}:${JSON.stringify(c.yAxis)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
