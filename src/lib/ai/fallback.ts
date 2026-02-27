import type { AnalysisResult, NarrativeResult } from "@/types/report";

/**template-based narrative generation -- zero API calls.
 * used when Gemini is unavailable, rate-limited, or returns invalid data.
 * reports should still look professional with these narratives.*/
export function generateFallbackNarrative(
  analysis: AnalysisResult
): NarrativeResult {
  const executiveSummary = buildFallbackSummary(analysis);
  const sectionNarratives = buildFallbackSections(analysis);

  return {
    executiveSummary,
    sectionNarratives,
    source: "fallback",
  };
}

function buildFallbackSummary(analysis: AnalysisResult): string {
  const { metrics, trends, anomalies, dataProfile } = analysis;
  const parts: string[] = [];

  if (metrics.length > 0) {
    const metricDescriptions = metrics.slice(0, 3).map((m) => {
      let desc = `${m.name} of ${m.formattedValue}`;
      if (m.changePercent !== null) {
        const dir = m.changePercent > 0 ? "an increase" : "a decrease";
        desc += ` (${dir} of ${Math.abs(m.changePercent).toFixed(1)}%)`;
      }
      return desc;
    });

    const dateInfo = dataProfile.dateRange
      ? ` for the period ${dataProfile.dateRange.min} to ${dataProfile.dateRange.max}`
      : "";

    parts.push(
      `This report analyzes ${dataProfile.rowCount.toLocaleString()} data points${dateInfo}. Key highlights include ${joinList(metricDescriptions)}.`
    );
  } else {
    parts.push(
      `This report analyzes ${dataProfile.rowCount.toLocaleString()} data points across ${dataProfile.numericColumns.length} numeric and ${dataProfile.categoricalColumns.length} categorical dimensions.`
    );
  }

  const trendParts: string[] = [];

  const upTrends = trends.filter((t) => t.direction === "up");
  const downTrends = trends.filter((t) => t.direction === "down");

  if (upTrends.length > 0) {
    const names = upTrends.slice(0, 2).map((t) => t.column);
    trendParts.push(`${joinList(names)} ${upTrends.length === 1 ? "shows" : "show"} an upward trend`);
  }

  if (downTrends.length > 0) {
    const names = downTrends.slice(0, 2).map((t) => t.column);
    trendParts.push(`${joinList(names)} ${downTrends.length === 1 ? "shows" : "show"} a downward trend`);
  }

  if (anomalies.length > 0) {
    trendParts.push(
      `${anomalies.length} anomal${anomalies.length === 1 ? "y was" : "ies were"} detected that may warrant further investigation`
    );
  }

  if (trendParts.length > 0) {
    parts.push(`Notable observations: ${joinList(trendParts)}.`);
  } else {
    parts.push(
      "The data shows relatively stable patterns with no significant anomalies or trend changes detected in the analyzed period."
    );
  }

  return parts.join("\n\n");
}

function buildFallbackSections(
  analysis: AnalysisResult
): Record<string, string> {
  const narratives: Record<string, string> = {};
  const { metrics, rankings, correlations, anomalies, chartConfigs } = analysis;

  for (const chart of chartConfigs) {
    const title = chart.title;
    const yAxis = Array.isArray(chart.yAxis)
      ? chart.yAxis[0]
      : chart.yAxis;

    const metric = metrics.find(
      (m) => m.name === yAxis || title.toLowerCase().includes(m.name.toLowerCase())
    );

    const ranking = rankings.find(
      (r) => r.column === yAxis || r.groupColumn === chart.xAxis
    );

    const correlation = correlations.find(
      (c) => c.columnA === yAxis || c.columnB === yAxis
    );

    const parts: string[] = [];

    switch (chart.type) {
      case "area":
      case "line":
      case "multi_line": {
        if (metric) {
          parts.push(
            `${yAxis} totaled ${metric.formattedValue}${metric.changePercent !== null ? `, representing a ${Math.abs(metric.changePercent).toFixed(1)}% ${metric.changePercent > 0 ? "increase" : "decrease"} compared to the prior period` : ""}.`
          );
        } else {
          parts.push(`This chart shows the progression of ${yAxis} over time.`);
        }
        break;
      }

      case "bar":
      case "horizontal_bar":
      case "stacked_bar":
      case "grouped_bar": {
        if (ranking && ranking.topN.length > 0) {
          const top = ranking.topN[0];
          parts.push(
            `${top.label} leads with ${top.formattedValue} (${top.percentOfTotal}% of total).`
          );
          if (ranking.topN.length > 1) {
            const second = ranking.topN[1];
            parts.push(
              `${second.label} follows at ${second.formattedValue} (${second.percentOfTotal}%).`
            );
          }
        } else {
          parts.push(
            `This chart compares ${yAxis} across different ${chart.xAxis} categories.`
          );
        }
        break;
      }

      case "pie":
      case "donut": {
        if (ranking && ranking.topN.length > 0) {
          const topItems = ranking.topN.slice(0, 3);
          const descriptions = topItems.map(
            (t) => `${t.label} (${t.percentOfTotal}%)`
          );
          parts.push(
            `The breakdown of ${yAxis} by ${chart.xAxis} shows ${joinList(descriptions)} as the leading segments.`
          );
        } else {
          parts.push(
            `This chart shows the distribution of ${yAxis} across ${chart.xAxis} categories.`
          );
        }
        break;
      }

      case "scatter": {
        if (correlation) {
          parts.push(
            `There is a ${correlation.strength} ${correlation.coefficient > 0 ? "positive" : "negative"} correlation (r=${correlation.coefficient.toFixed(2)}) between ${chart.xAxis} and ${yAxis}.`
          );
        } else {
          parts.push(
            `This chart explores the relationship between ${chart.xAxis} and ${yAxis}.`
          );
        }
        break;
      }

      case "dual_axis": {
        const cols = Array.isArray(chart.yAxis) ? chart.yAxis : [chart.yAxis];
        parts.push(
          `This chart compares ${cols.join(" and ")} on separate axes to reveal how they move relative to each other over time.`
        );
        break;
      }

      case "stacked_area": {
        parts.push(
          `This chart shows how the composition of values has changed over time, revealing shifts in the relative contribution of each metric.`
        );
        break;
      }

      default:
        parts.push(`This visualization presents ${yAxis} data for analysis.`);
    }

    const relevantAnomalies = anomalies.filter((a) => a.column === yAxis);
    if (relevantAnomalies.length > 0) {
      parts.push(
        `Note: ${relevantAnomalies.length} anomal${relevantAnomalies.length === 1 ? "y was" : "ies were"} detected in this data.`
      );
    }

    narratives[title] = parts.join(" ");
  }

  return narratives;
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
