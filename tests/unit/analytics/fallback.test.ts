import { describe, it, expect } from "vitest";
import { generateFallbackNarrative } from "@/lib/ai/fallback";
import type { AnalysisResult, DataProfile } from "@/types/report";

function makeAnalysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  const profile: DataProfile = {
    rowCount: 100,
    dateRange: { min: "2024-01-01", max: "2024-12-31" },
    numericColumns: ["revenue", "orders"],
    categoricalColumns: ["region"],
    dateColumns: ["date"],
    currencyColumns: [],
    percentageColumns: [],
  };

  return {
    metrics: [
      {
        name: "revenue",
        value: 142350,
        formattedValue: "142.4K",
        previousValue: 115000,
        changePercent: 23.8,
        trend: "up",
      },
      {
        name: "orders",
        value: 1250,
        formattedValue: "1,250",
        previousValue: 1100,
        changePercent: 13.6,
        trend: "up",
      },
    ],
    trends: [
      {
        column: "revenue",
        direction: "up",
        slope: 150,
        rSquared: 0.85,
        periods: 12,
        movingAverage: [],
      },
    ],
    anomalies: [
      {
        column: "revenue",
        rowIndex: 10,
        value: 50000,
        expected: 12000,
        deviationScore: 3.2,
        method: "iqr",
        description: "revenue value ($50K) is above the expected range",
      },
    ],
    rankings: [
      {
        column: "revenue",
        groupColumn: "region",
        topN: [
          { label: "East", value: 50000, formattedValue: "50K", percentOfTotal: 35.1 },
          { label: "West", value: 40000, formattedValue: "40K", percentOfTotal: 28.1 },
        ],
        bottomN: [
          { label: "North", value: 10000, formattedValue: "10K", percentOfTotal: 7.0 },
        ],
      },
    ],
    correlations: [
      {
        columnA: "revenue",
        columnB: "orders",
        coefficient: 0.92,
        strength: "strong",
      },
    ],
    chartConfigs: [
      { type: "area", title: "revenue Over Time", xAxis: "date", yAxis: "revenue", priority: 1 },
      { type: "donut", title: "revenue by region", xAxis: "region", yAxis: "revenue", priority: 2 },
      { type: "scatter", title: "revenue vs orders", xAxis: "revenue", yAxis: "orders", priority: 3 },
    ],
    templateId: "sales-report",
    dataProfile: profile,
    ...overrides,
  };
}

describe("generateFallbackNarrative", () => {
  it("returns a NarrativeResult with source=fallback", () => {
    const result = generateFallbackNarrative(makeAnalysisResult());
    expect(result.source).toBe("fallback");
    expect(result.executiveSummary).toBeTruthy();
    expect(typeof result.sectionNarratives).toBe("object");
  });

  it("executive summary mentions key metrics", () => {
    const result = generateFallbackNarrative(makeAnalysisResult());
    expect(result.executiveSummary).toContain("revenue");
    expect(result.executiveSummary).toContain("142.4K");
  });

  it("executive summary mentions date range", () => {
    const result = generateFallbackNarrative(makeAnalysisResult());
    expect(result.executiveSummary).toContain("2024-01-01");
    expect(result.executiveSummary).toContain("2024-12-31");
  });

  it("executive summary mentions trends", () => {
    const result = generateFallbackNarrative(makeAnalysisResult());
    expect(result.executiveSummary).toContain("upward");
  });

  it("executive summary mentions anomalies", () => {
    const result = generateFallbackNarrative(makeAnalysisResult());
    expect(result.executiveSummary).toContain("anomal");
  });

  it("generates section narratives for each chart", () => {
    const analysis = makeAnalysisResult();
    const result = generateFallbackNarrative(analysis);

    for (const chart of analysis.chartConfigs) {
      expect(result.sectionNarratives[chart.title]).toBeTruthy();
    }
  });

  it("area chart narrative mentions metric changes", () => {
    const result = generateFallbackNarrative(makeAnalysisResult());
    const narrative = result.sectionNarratives["revenue Over Time"];
    expect(narrative).toBeTruthy();
    expect(narrative).toContain("142.4K");
  });

  it("donut chart narrative mentions top items", () => {
    const result = generateFallbackNarrative(makeAnalysisResult());
    const narrative = result.sectionNarratives["revenue by region"];
    expect(narrative).toBeTruthy();
    expect(narrative).toContain("East");
  });

  it("scatter chart narrative mentions correlation", () => {
    const result = generateFallbackNarrative(makeAnalysisResult());
    const narrative = result.sectionNarratives["revenue vs orders"];
    expect(narrative).toBeTruthy();
    expect(narrative).toContain("strong");
  });

  it("handles empty metrics gracefully", () => {
    const result = generateFallbackNarrative(
      makeAnalysisResult({ metrics: [] })
    );
    expect(result.executiveSummary).toBeTruthy();
    expect(result.source).toBe("fallback");
  });

  it("handles no trends or anomalies", () => {
    const result = generateFallbackNarrative(
      makeAnalysisResult({ trends: [], anomalies: [] })
    );
    expect(result.executiveSummary).toContain("stable");
  });

  it("handles no date range", () => {
    const analysis = makeAnalysisResult();
    analysis.dataProfile.dateRange = null;
    const result = generateFallbackNarrative(analysis);
    expect(result.executiveSummary).toBeTruthy();
  });
});
