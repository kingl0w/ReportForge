import { describe, it, expect } from "vitest";
import {
  extractNumbers,
  sum,
  mean,
  median,
  mode,
  variance,
  standardDeviation,
  min,
  max,
  range,
  percentile,
  frequencyDistribution,
  groupBy,
  linearRegression,
} from "@/lib/analytics/statistics";

describe("extractNumbers", () => {
  it("extracts numeric values from rows", () => {
    const rows = [
      { revenue: 100 },
      { revenue: 200 },
      { revenue: null },
      { revenue: "300" },
      { revenue: "$400" },
    ];
    const result = extractNumbers(rows, "revenue");
    expect(result).toEqual([100, 200, 300, 400]);
  });

  it("returns empty array for non-numeric column", () => {
    const rows = [{ name: "Alice" }, { name: "Bob" }];
    expect(extractNumbers(rows, "name")).toEqual([]);
  });

  it("handles empty rows", () => {
    expect(extractNumbers([], "col")).toEqual([]);
  });
});

describe("sum", () => {
  it("sums numbers", () => {
    expect(sum([1, 2, 3, 4, 5])).toBe(15);
  });

  it("returns 0 for empty array", () => {
    expect(sum([])).toBe(0);
  });

  it("handles negative numbers", () => {
    expect(sum([-5, 5, -10, 10])).toBe(0);
  });
});

describe("mean", () => {
  it("computes average", () => {
    expect(mean([2, 4, 6])).toBe(4);
  });

  it("returns 0 for empty array", () => {
    expect(mean([])).toBe(0);
  });

  it("handles single value", () => {
    expect(mean([42])).toBe(42);
  });
});

describe("median", () => {
  it("returns middle value for odd count", () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it("returns average of two middle values for even count", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("returns 0 for empty array", () => {
    expect(median([])).toBe(0);
  });

  it("handles single value", () => {
    expect(median([7])).toBe(7);
  });
});

describe("mode", () => {
  it("returns most frequent value", () => {
    expect(mode([1, 2, 2, 3])).toBe(2);
  });

  it("returns null when all values are unique", () => {
    expect(mode([1, 2, 3, 4])).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(mode([])).toBeNull();
  });
});

describe("variance", () => {
  it("computes sample variance", () => {
    const result = variance([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(4.571, 2);
  });

  it("returns 0 for single value", () => {
    expect(variance([5])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(variance([])).toBe(0);
  });
});

describe("standardDeviation", () => {
  it("computes sample std dev", () => {
    const result = standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(2.138, 2);
  });
});

describe("min / max / range", () => {
  it("finds min", () => {
    expect(min([5, 3, 8, 1, 9])).toBe(1);
  });

  it("finds max", () => {
    expect(max([5, 3, 8, 1, 9])).toBe(9);
  });

  it("computes range", () => {
    expect(range([5, 3, 8, 1, 9])).toBe(8);
  });

  it("handles empty arrays", () => {
    expect(min([])).toBe(0);
    expect(max([])).toBe(0);
    expect(range([])).toBe(0);
  });
});

describe("percentile", () => {
  it("computes 50th percentile (median)", () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
  });

  it("computes 25th percentile", () => {
    expect(percentile([1, 2, 3, 4, 5], 25)).toBe(2);
  });

  it("computes 75th percentile", () => {
    expect(percentile([1, 2, 3, 4, 5], 75)).toBe(4);
  });

  it("returns min at 0th percentile", () => {
    expect(percentile([10, 20, 30], 0)).toBe(10);
  });

  it("returns max at 100th percentile", () => {
    expect(percentile([10, 20, 30], 100)).toBe(30);
  });

  it("returns 0 for empty array", () => {
    expect(percentile([], 50)).toBe(0);
  });
});

describe("frequencyDistribution", () => {
  it("counts occurrences and computes percentages", () => {
    const rows = [
      { color: "red" },
      { color: "blue" },
      { color: "red" },
      { color: "red" },
      { color: "blue" },
    ];
    const dist = frequencyDistribution(rows, "color");
    expect(dist[0]).toEqual({ value: "red", count: 3, percent: 60 });
    expect(dist[1]).toEqual({ value: "blue", count: 2, percent: 40 });
  });

  it("handles null/empty values", () => {
    const rows = [{ x: null }, { x: "" }, { x: "a" }];
    const dist = frequencyDistribution(rows, "x");
    expect(dist).toHaveLength(2);
    const emptyEntry = dist.find((d) => d.value === "(empty)");
    expect(emptyEntry?.count).toBe(2);
  });
});

describe("groupBy", () => {
  const rows = [
    { region: "East", revenue: 100 },
    { region: "West", revenue: 200 },
    { region: "East", revenue: 150 },
    { region: "West", revenue: 50 },
  ];

  it("groups and sums by default", () => {
    const result = groupBy(rows, "region", "revenue", "sum");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ group: "East", value: 250 });
    expect(result[1]).toEqual({ group: "West", value: 250 });
  });

  it("groups and averages", () => {
    const result = groupBy(rows, "region", "revenue", "avg");
    const east = result.find((r) => r.group === "East");
    expect(east?.value).toBe(125);
  });

  it("groups and counts", () => {
    const result = groupBy(rows, "region", "revenue", "count");
    expect(result.every((r) => r.value === 2)).toBe(true);
  });
});

describe("linearRegression", () => {
  it("detects upward trend", () => {
    const values = [1, 2, 3, 4, 5];
    const { slope, rSquared } = linearRegression(values);
    expect(slope).toBe(1);
    expect(rSquared).toBeCloseTo(1, 5);
  });

  it("detects flat trend", () => {
    const values = [5, 5, 5, 5, 5];
    const { slope, rSquared } = linearRegression(values);
    expect(slope).toBe(0);
    expect(rSquared).toBe(0);
  });

  it("detects downward trend", () => {
    const values = [10, 8, 6, 4, 2];
    const { slope } = linearRegression(values);
    expect(slope).toBe(-2);
  });

  it("handles single value", () => {
    const { slope, intercept } = linearRegression([42]);
    expect(slope).toBe(0);
    expect(intercept).toBe(42);
  });

  it("handles empty array", () => {
    const { slope, intercept, rSquared } = linearRegression([]);
    expect(slope).toBe(0);
    expect(intercept).toBe(0);
    expect(rSquared).toBe(0);
  });
});
