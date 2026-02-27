import { describe, it, expect } from "vitest";
import { recommendCharts } from "@/lib/analytics/chart-recommender";
import type { DataProfile } from "@/types/report";

function makeProfile(overrides: Partial<DataProfile> = {}): DataProfile {
  return {
    rowCount: 100,
    dateRange: null,
    numericColumns: [],
    categoricalColumns: [],
    dateColumns: [],
    currencyColumns: [],
    percentageColumns: [],
    ...overrides,
  };
}

function makeRows(count: number, columns: Record<string, () => unknown>) {
  return Array.from({ length: count }, () => {
    const row: Record<string, unknown> = {};
    for (const [key, gen] of Object.entries(columns)) {
      row[key] = gen();
    }
    return row;
  });
}

describe("recommendCharts", () => {
  it("recommends area chart for single numeric + date", () => {
    const profile = makeProfile({
      dateColumns: ["date"],
      numericColumns: ["revenue"],
    });
    const rows = makeRows(20, {
      date: () => "2024-01-01",
      revenue: () => Math.random() * 1000,
    });
    const charts = recommendCharts(rows, profile);
    const area = charts.find((c) => c.type === "area");
    expect(area).toBeDefined();
    expect(area!.xAxis).toBe("date");
  });

  it("recommends dual axis for 2 numeric + date", () => {
    const profile = makeProfile({
      dateColumns: ["date"],
      numericColumns: ["revenue", "orders"],
    });
    const rows = makeRows(20, {
      date: () => "2024-01-01",
      revenue: () => 1000,
      orders: () => 50,
    });
    const charts = recommendCharts(rows, profile);
    const dual = charts.find((c) => c.type === "dual_axis");
    expect(dual).toBeDefined();
  });

  it("recommends multi-line for 3+ numeric + date", () => {
    const profile = makeProfile({
      dateColumns: ["date"],
      numericColumns: ["a", "b", "c", "d"],
    });
    const rows = makeRows(20, {
      date: () => "2024-01-01",
      a: () => 1,
      b: () => 2,
      c: () => 3,
      d: () => 4,
    });
    const charts = recommendCharts(rows, profile);
    const multi = charts.find((c) => c.type === "multi_line");
    expect(multi).toBeDefined();
  });

  it("recommends donut/pie for few categories + numeric", () => {
    const categories = ["A", "B", "C"];
    const profile = makeProfile({
      categoricalColumns: ["category"],
      numericColumns: ["value"],
    });
    const rows = makeRows(30, {
      category: () => categories[Math.floor(Math.random() * 3)],
      value: () => Math.random() * 100,
    });
    const charts = recommendCharts(rows, profile);
    const donut = charts.find((c) => c.type === "donut" || c.type === "pie");
    expect(donut).toBeDefined();
  });

  it("recommends scatter for 2 numeric columns without dates", () => {
    const profile = makeProfile({
      numericColumns: ["height", "weight"],
    });
    const rows = makeRows(50, {
      height: () => 150 + Math.random() * 40,
      weight: () => 50 + Math.random() * 50,
    });
    const charts = recommendCharts(rows, profile);
    const scatter = charts.find((c) => c.type === "scatter");
    expect(scatter).toBeDefined();
    expect(scatter!.xAxis).toBe("height");
    expect(scatter!.yAxis).toBe("weight");
  });

  it("recommends bar chart for categories + numeric", () => {
    const profile = makeProfile({
      categoricalColumns: ["region"],
      numericColumns: ["sales"],
    });
    const rows = makeRows(100, {
      region: () =>
        ["East", "West", "North", "South", "Central", "NE", "NW", "SE"][
          Math.floor(Math.random() * 8)
        ],
      sales: () => Math.random() * 1000,
    });
    const charts = recommendCharts(rows, profile);
    const bar = charts.find(
      (c) => c.type === "bar" || c.type === "horizontal_bar"
    );
    expect(bar).toBeDefined();
  });

  it("limits to 6 charts max", () => {
    const profile = makeProfile({
      dateColumns: ["date"],
      numericColumns: ["a", "b", "c", "d", "e"],
      categoricalColumns: ["cat1", "cat2"],
    });
    const rows = makeRows(50, {
      date: () => "2024-01-01",
      a: () => 1,
      b: () => 2,
      c: () => 3,
      d: () => 4,
      e: () => 5,
      cat1: () => "X",
      cat2: () => "Y",
    });
    const charts = recommendCharts(rows, profile);
    expect(charts.length).toBeLessThanOrEqual(6);
  });

  it("sorts by priority", () => {
    const profile = makeProfile({
      dateColumns: ["date"],
      numericColumns: ["revenue"],
      categoricalColumns: ["region"],
    });
    const rows = makeRows(30, {
      date: () => "2024-01-01",
      revenue: () => 1000,
      region: () => ["A", "B"][Math.floor(Math.random() * 2)],
    });
    const charts = recommendCharts(rows, profile);
    for (let i = 1; i < charts.length; i++) {
      expect(charts[i - 1].priority).toBeLessThanOrEqual(charts[i].priority);
    }
  });

  it("returns empty for no columns", () => {
    const charts = recommendCharts([], makeProfile());
    expect(charts).toEqual([]);
  });
});
