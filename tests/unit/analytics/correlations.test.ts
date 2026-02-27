import { describe, it, expect } from "vitest";
import {
  pearsonCorrelation,
  findCorrelations,
} from "@/lib/analytics/correlations";

describe("pearsonCorrelation", () => {
  it("returns 1 for perfectly correlated data", () => {
    const a = [1, 2, 3, 4, 5];
    const b = [2, 4, 6, 8, 10];
    expect(pearsonCorrelation(a, b)).toBeCloseTo(1, 5);
  });

  it("returns -1 for perfectly inversely correlated data", () => {
    const a = [1, 2, 3, 4, 5];
    const b = [10, 8, 6, 4, 2];
    expect(pearsonCorrelation(a, b)).toBeCloseTo(-1, 5);
  });

  it("returns ~0 for uncorrelated data", () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const b = [3, 8, 1, 6, 10, 5, 2, 9, 4, 7];
    const r = pearsonCorrelation(a, b);
    expect(Math.abs(r)).toBeLessThan(0.4);
  });

  it("returns 0 for fewer than 3 values", () => {
    expect(pearsonCorrelation([1, 2], [3, 4])).toBe(0);
  });

  it("returns 0 when all values are constant (denom=0)", () => {
    expect(pearsonCorrelation([5, 5, 5], [5, 5, 5])).toBe(0);
  });

  it("handles arrays of different lengths (uses shorter)", () => {
    const a = [1, 2, 3, 4, 5];
    const b = [2, 4, 6];
    const r = pearsonCorrelation(a, b);
    expect(r).toBeCloseTo(1, 5);
  });
});

describe("findCorrelations", () => {
  it("finds strong correlations between column pairs", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      x: i,
      y: i * 2,
      z: 100 - i,
    }));
    const result = findCorrelations(rows, ["x", "y", "z"]);
    expect(result.length).toBeGreaterThan(0);

    const xyCorr = result.find(
      (c) => (c.columnA === "x" && c.columnB === "y") ||
             (c.columnA === "y" && c.columnB === "x")
    );
    expect(xyCorr).toBeDefined();
    expect(xyCorr!.strength).toBe("strong");
    expect(xyCorr!.coefficient).toBeCloseTo(1, 2);

    const xzCorr = result.find(
      (c) => (c.columnA === "x" && c.columnB === "z") ||
             (c.columnA === "z" && c.columnB === "x")
    );
    expect(xzCorr).toBeDefined();
    expect(xzCorr!.strength).toBe("strong");
    expect(xzCorr!.coefficient).toBeCloseTo(-1, 2);
  });

  it("filters out weak correlations below threshold", () => {
    const rows = [
      { a: 1, b: 10 },
      { a: 5, b: 3 },
      { a: 2, b: 8 },
      { a: 8, b: 5 },
      { a: 3, b: 7 },
      { a: 9, b: 2 },
      { a: 4, b: 6 },
    ];
    const result = findCorrelations(rows, ["a", "b"], 0.9);
    for (const c of result) {
      expect(Math.abs(c.coefficient)).toBeGreaterThanOrEqual(0.9);
    }
  });

  it("returns empty for fewer than 2 columns", () => {
    const rows = [{ x: 1 }];
    expect(findCorrelations(rows, ["x"])).toEqual([]);
  });

  it("returns sorted by absolute coefficient", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      a: i,
      b: i * 2,
      c: i + Math.random() * 5,
    }));
    const result = findCorrelations(rows, ["a", "b", "c"]);
    for (let i = 1; i < result.length; i++) {
      expect(Math.abs(result[i - 1].coefficient)).toBeGreaterThanOrEqual(
        Math.abs(result[i].coefficient)
      );
    }
  });
});
