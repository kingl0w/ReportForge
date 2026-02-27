import { describe, it, expect } from "vitest";
import { analyzeDataset, buildDataProfile } from "@/lib/analytics/engine";
import type { Column, DataSet } from "@/types/data";

function makeColumns(defs: { name: string; type: Column["type"] }[]): Column[] {
  return defs.map((d) => ({
    name: d.name,
    originalName: d.name,
    type: d.type,
    sampleValues: [],
    nullCount: 0,
  }));
}

function makeSalesDataset(): DataSet {
  const columns = makeColumns([
    { name: "date", type: "date" },
    { name: "revenue", type: "currency" },
    { name: "orders", type: "number" },
    { name: "region", type: "string" },
  ]);

  const regions = ["East", "West", "North"];
  const rows = Array.from({ length: 30 }, (_, i) => ({
    date: `2024-${String(Math.floor(i / 10) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    revenue: 1000 + i * 100,
    orders: 50 + i * 5,
    region: regions[i % 3],
  }));

  return {
    columns,
    rows,
    rowCount: rows.length,
    metadata: {
      source: "test.csv",
      fileSize: 1024,
      fileType: "text/csv",
      parseWarnings: [],
    },
  };
}

describe("buildDataProfile", () => {
  it("categorizes columns by type", () => {
    const columns = makeColumns([
      { name: "revenue", type: "currency" },
      { name: "growth", type: "percentage" },
      { name: "count", type: "number" },
      { name: "date", type: "date" },
      { name: "name", type: "string" },
      { name: "active", type: "boolean" },
    ]);
    const rows = [
      { revenue: 100, growth: 0.1, count: 5, date: "2024-01-01", name: "A", active: true },
    ];

    const profile = buildDataProfile(rows, columns);

    expect(profile.numericColumns).toContain("revenue");
    expect(profile.numericColumns).toContain("growth");
    expect(profile.numericColumns).toContain("count");
    expect(profile.currencyColumns).toContain("revenue");
    expect(profile.percentageColumns).toContain("growth");
    expect(profile.dateColumns).toContain("date");
    expect(profile.categoricalColumns).toContain("name");
    expect(profile.categoricalColumns).toContain("active");
  });

  it("computes date range", () => {
    const columns = makeColumns([
      { name: "date", type: "date" },
      { name: "value", type: "number" },
    ]);
    const rows = [
      { date: "2024-01-15", value: 10 },
      { date: "2024-06-20", value: 20 },
      { date: "2024-03-10", value: 15 },
    ];

    const profile = buildDataProfile(rows, columns);
    expect(profile.dateRange).not.toBeNull();
    expect(profile.dateRange!.min).toBe("2024-01-15");
    expect(profile.dateRange!.max).toBe("2024-06-20");
  });

  it("returns null date range when no date columns", () => {
    const columns = makeColumns([{ name: "value", type: "number" }]);
    const rows = [{ value: 1 }];
    const profile = buildDataProfile(rows, columns);
    expect(profile.dateRange).toBeNull();
  });

  it("counts rows", () => {
    const columns = makeColumns([{ name: "x", type: "number" }]);
    const rows = Array.from({ length: 50 }, (_, i) => ({ x: i }));
    const profile = buildDataProfile(rows, columns);
    expect(profile.rowCount).toBe(50);
  });
});

describe("analyzeDataset", () => {
  it("returns a complete AnalysisResult", () => {
    const dataset = makeSalesDataset();
    const result = analyzeDataset(dataset);

    expect(result.metrics).toBeDefined();
    expect(result.trends).toBeDefined();
    expect(result.anomalies).toBeDefined();
    expect(result.rankings).toBeDefined();
    expect(result.correlations).toBeDefined();
    expect(result.chartConfigs).toBeDefined();
    expect(result.templateId).toBeDefined();
    expect(result.dataProfile).toBeDefined();
  });

  it("computes key metrics for numeric columns", () => {
    const dataset = makeSalesDataset();
    const result = analyzeDataset(dataset);

    expect(result.metrics.length).toBeGreaterThan(0);
    expect(result.metrics.length).toBeLessThanOrEqual(6);

    for (const metric of result.metrics) {
      expect(metric.name).toBeTruthy();
      expect(typeof metric.value).toBe("number");
      expect(metric.formattedValue).toBeTruthy();
      expect(["up", "down", "flat"]).toContain(metric.trend);
    }
  });

  it("detects trends for each numeric column", () => {
    const dataset = makeSalesDataset();
    const result = analyzeDataset(dataset);

    expect(result.trends.length).toBeGreaterThan(0);
    for (const trend of result.trends) {
      expect(["up", "down", "flat"]).toContain(trend.direction);
      expect(trend.movingAverage.length).toBeGreaterThan(0);
    }
  });

  it("generates chart recommendations", () => {
    const dataset = makeSalesDataset();
    const result = analyzeDataset(dataset);

    expect(result.chartConfigs.length).toBeGreaterThan(0);
    expect(result.chartConfigs.length).toBeLessThanOrEqual(6);

    for (const chart of result.chartConfigs) {
      expect(chart.type).toBeTruthy();
      expect(chart.title).toBeTruthy();
      expect(chart.xAxis).toBeTruthy();
    }
  });

  it("matches sales-report template for sales data", () => {
    const dataset = makeSalesDataset();
    const result = analyzeDataset(dataset);
    expect(result.templateId).toBe("sales-report");
  });

  it("builds rankings for category-numeric pairs", () => {
    const dataset = makeSalesDataset();
    const result = analyzeDataset(dataset);

    expect(result.rankings.length).toBeGreaterThan(0);
    for (const ranking of result.rankings) {
      expect(ranking.topN.length).toBeGreaterThan(0);
      expect(ranking.bottomN.length).toBeGreaterThan(0);
    }
  });

  it("finds correlations between numeric columns", () => {
    const dataset = makeSalesDataset();
    const result = analyzeDataset(dataset);

    expect(result.correlations.length).toBeGreaterThan(0);
    const revOrders = result.correlations.find(
      (c) =>
        (c.columnA === "revenue" && c.columnB === "orders") ||
        (c.columnA === "orders" && c.columnB === "revenue")
    );
    expect(revOrders).toBeDefined();
    expect(revOrders!.strength).toBe("strong");
  });

  it("handles minimal dataset", () => {
    const columns = makeColumns([{ name: "value", type: "number" }]);
    const rows = [{ value: 42 }];
    const dataset: DataSet = {
      columns,
      rows,
      rowCount: 1,
      metadata: { source: "test", fileSize: 10, fileType: "csv", parseWarnings: [] },
    };

    const result = analyzeDataset(dataset);
    expect(result.dataProfile.rowCount).toBe(1);
    expect(result.templateId).toBe("custom");
  });

  it("limits anomalies to 15", () => {
    const columns = makeColumns([{ name: "value", type: "number" }]);
    const rows = Array.from({ length: 100 }, (_, i) => ({
      value: i < 80 ? 100 : 10000 + i * 500,
    }));
    const dataset: DataSet = {
      columns,
      rows,
      rowCount: rows.length,
      metadata: { source: "test", fileSize: 10, fileType: "csv", parseWarnings: [] },
    };

    const result = analyzeDataset(dataset);
    expect(result.anomalies.length).toBeLessThanOrEqual(15);
  });
});
