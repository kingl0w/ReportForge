import { describe, it, expect } from "vitest";
import {
  detectTrend,
  movingAverage,
  growthRate,
  periodOverPeriod,
  seasonalityDetection,
} from "@/lib/analytics/trends";

describe("detectTrend", () => {
  it("detects upward trend", () => {
    const rows = [
      { value: 10 },
      { value: 20 },
      { value: 30 },
      { value: 40 },
      { value: 50 },
    ];
    const result = detectTrend(rows, "value");
    expect(result.direction).toBe("up");
    expect(result.column).toBe("value");
    expect(result.slope).toBeGreaterThan(0);
    expect(result.rSquared).toBeCloseTo(1, 2);
  });

  it("detects downward trend", () => {
    const rows = [
      { value: 50 },
      { value: 40 },
      { value: 30 },
      { value: 20 },
      { value: 10 },
    ];
    const result = detectTrend(rows, "value");
    expect(result.direction).toBe("down");
    expect(result.slope).toBeLessThan(0);
  });

  it("detects flat trend for constant values", () => {
    const rows = [
      { value: 100 },
      { value: 100 },
      { value: 100 },
      { value: 100 },
    ];
    const result = detectTrend(rows, "value");
    expect(result.direction).toBe("flat");
  });

  it("returns flat for fewer than 3 values", () => {
    const rows = [{ value: 10 }, { value: 20 }];
    const result = detectTrend(rows, "value");
    expect(result.direction).toBe("flat");
    expect(result.periods).toBe(2);
  });

  it("includes moving average", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ value: i * 10 }));
    const result = detectTrend(rows, "value");
    expect(result.movingAverage.length).toBe(20);
  });
});

describe("movingAverage", () => {
  it("computes moving average with window 3", () => {
    const values = [1, 2, 3, 4, 5];
    const result = movingAverage(values, 3);
    expect(result).toHaveLength(5);
    expect(result[0]).toBeCloseTo(1, 5);
    expect(result[1]).toBeCloseTo(1.5, 5);
    expect(result[2]).toBeCloseTo(2, 5);
    expect(result[3]).toBeCloseTo(3, 5);
    expect(result[4]).toBeCloseTo(4, 5);
  });

  it("returns empty for empty input", () => {
    expect(movingAverage([], 3)).toEqual([]);
  });

  it("handles window larger than array", () => {
    const result = movingAverage([10, 20], 5);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(10);
    expect(result[1]).toBe(15);
  });
});

describe("growthRate", () => {
  it("computes positive growth", () => {
    expect(growthRate(120, 100)).toBe(20);
  });

  it("computes negative growth", () => {
    expect(growthRate(80, 100)).toBe(-20);
  });

  it("returns 0 when both are 0", () => {
    expect(growthRate(0, 0)).toBe(0);
  });

  it("returns null when previous is 0 and current is nonzero", () => {
    expect(growthRate(100, 0)).toBeNull();
  });

  it("handles negative previous values", () => {
    const result = growthRate(10, -10);
    //(10 - (-10)) / |-10| * 100 = 200
    expect(result).toBe(200);
  });
});

describe("periodOverPeriod", () => {
  it("groups by month and computes changes", () => {
    const rows = [
      { date: "2024-01-15", sales: 100 },
      { date: "2024-01-20", sales: 150 },
      { date: "2024-02-10", sales: 200 },
      { date: "2024-02-25", sales: 100 },
      { date: "2024-03-05", sales: 400 },
    ];
    const result = periodOverPeriod(rows, "date", "sales", "month");
    expect(result).toHaveLength(3);
    expect(result[0].period).toBe("2024-01");
    expect(result[0].value).toBe(250);
    expect(result[0].change).toBeNull();
    expect(result[1].period).toBe("2024-02");
    expect(result[1].value).toBe(300);
    expect(result[1].change).toBeCloseTo(20, 0);
  });

  it("handles quarter grouping", () => {
    const rows = [
      { date: "2024-01-15", revenue: 100 },
      { date: "2024-04-15", revenue: 200 },
      { date: "2024-07-15", revenue: 300 },
    ];
    const result = periodOverPeriod(rows, "date", "revenue", "quarter");
    expect(result).toHaveLength(3);
    const periods = result.map((r) => r.period);
    expect(periods[0]).toContain("Q1");
    expect(periods[1]).toContain("Q2");
    expect(periods[2]).toContain("Q3");
  });

  it("skips invalid dates", () => {
    const rows = [
      { date: "not-a-date", value: 100 },
      { date: "2024-01-01", value: 200 },
    ];
    const result = periodOverPeriod(rows, "date", "value", "month");
    expect(result).toHaveLength(1);
  });
});

describe("seasonalityDetection", () => {
  it("detects seasonal highs and lows", () => {
    const rows = [];
    for (let m = 1; m <= 12; m++) {
      const value = m === 12 ? 500 : 100;
      rows.push({
        date: `2024-${String(m).padStart(2, "0")}-15`,
        sales: value,
      });
    }
    const result = seasonalityDetection(rows, "date", "sales");
    expect(result.length).toBeGreaterThan(0);
    const december = result.find((r) => r.period === "2024-12");
    expect(december).toBeDefined();
    expect(december!.description).toContain("above");
  });

  it("returns empty for fewer than 6 months", () => {
    const rows = [
      { date: "2024-01-01", value: 100 },
      { date: "2024-02-01", value: 100 },
      { date: "2024-03-01", value: 100 },
    ];
    const result = seasonalityDetection(rows, "date", "value");
    expect(result).toEqual([]);
  });
});
