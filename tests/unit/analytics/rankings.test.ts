import { describe, it, expect } from "vitest";
import {
  topN,
  bottomN,
  percentOfTotal,
  cumulativePercentage,
  buildRanking,
} from "@/lib/analytics/rankings";

describe("topN", () => {
  const rows = [
    { revenue: 100 },
    { revenue: 500 },
    { revenue: 200 },
    { revenue: 400 },
    { revenue: 300 },
  ];

  it("returns top N values sorted descending", () => {
    const result = topN(rows, "revenue", 3);
    expect(result).toHaveLength(3);
    expect(result[0].value).toBe(500);
    expect(result[1].value).toBe(400);
    expect(result[2].value).toBe(300);
  });

  it("includes row indices", () => {
    const result = topN(rows, "revenue", 1);
    expect(result[0].rowIndex).toBe(1);
  });

  it("handles N larger than row count", () => {
    const result = topN(rows, "revenue", 10);
    expect(result).toHaveLength(5);
  });

  it("handles empty rows", () => {
    expect(topN([], "revenue", 5)).toEqual([]);
  });
});

describe("bottomN", () => {
  const rows = [
    { revenue: 100 },
    { revenue: 500 },
    { revenue: 200 },
    { revenue: 400 },
    { revenue: 300 },
  ];

  it("returns bottom N values sorted ascending", () => {
    const result = bottomN(rows, "revenue", 3);
    expect(result).toHaveLength(3);
    expect(result[0].value).toBe(100);
    expect(result[1].value).toBe(200);
    expect(result[2].value).toBe(300);
  });
});

describe("percentOfTotal", () => {
  const rows = [
    { region: "East", revenue: 300 },
    { region: "West", revenue: 200 },
    { region: "East", revenue: 200 },
    { region: "West", revenue: 300 },
  ];

  it("computes each group's share of total", () => {
    const result = percentOfTotal(rows, "region", "revenue");
    expect(result).toHaveLength(2);

    const east = result.find((r) => r.group === "East");
    const west = result.find((r) => r.group === "West");
    expect(east!.value).toBe(500);
    expect(west!.value).toBe(500);
    expect(east!.percent).toBe(50);
    expect(west!.percent).toBe(50);
  });

  it("handles zero total", () => {
    const rows = [{ cat: "A", val: 0 }, { cat: "B", val: 0 }];
    const result = percentOfTotal(rows, "cat", "val");
    expect(result.every((r) => r.percent === 0)).toBe(true);
  });
});

describe("cumulativePercentage", () => {
  const rows = [
    { product: "A", sales: 500 },
    { product: "B", sales: 300 },
    { product: "C", sales: 100 },
    { product: "D", sales: 80 },
    { product: "E", sales: 20 },
  ];

  it("computes cumulative percentages sorted by value desc", () => {
    const { groups, paretoPoint } = cumulativePercentage(rows, "product", "sales");
    expect(groups).toHaveLength(5);
    expect(groups[0].group).toBe("A");
    expect(groups[0].cumulative).toBeCloseTo(50, 0);

    expect(groups[groups.length - 1].cumulative).toBeCloseTo(100, 0);
    expect(paretoPoint).toBeDefined();
  });

  it("detects 80/20 pareto point", () => {
    const { paretoPoint } = cumulativePercentage(rows, "product", "sales");
    expect(paretoPoint).toBe(2);
  });
});

describe("buildRanking", () => {
  const rows = [
    { region: "East", revenue: 300 },
    { region: "West", revenue: 500 },
    { region: "North", revenue: 100 },
    { region: "South", revenue: 200 },
  ];

  it("returns structured ranking result", () => {
    const result = buildRanking(rows, "region", "revenue", 3);
    expect(result.column).toBe("revenue");
    expect(result.groupColumn).toBe("region");
    expect(result.topN).toHaveLength(3);
    expect(result.bottomN).toHaveLength(3);
  });

  it("topN is sorted by value descending", () => {
    const result = buildRanking(rows, "region", "revenue", 4);
    expect(result.topN[0].label).toBe("West");
    expect(result.topN[0].value).toBe(500);
  });

  it("includes formatted values and percent of total", () => {
    const result = buildRanking(rows, "region", "revenue", 2);
    for (const item of result.topN) {
      expect(item.formattedValue).toBeTruthy();
      expect(typeof item.percentOfTotal).toBe("number");
    }
  });
});
