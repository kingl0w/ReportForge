import { describe, it, expect } from "vitest";
import {
  detectOutliersIQR,
  detectOutliersZScore,
  detectSuddenChanges,
  detectColumnAnomalies,
} from "@/lib/analytics/anomalies";

describe("detectOutliersIQR", () => {
  it("detects outliers outside 1.5*IQR bounds", () => {
    const values = [10, 12, 14, 15, 16, 18, 20, 100]; //100 is an outlier
    const { outliers, lowerBound, upperBound } = detectOutliersIQR(values);
    expect(outliers).toContain(100);
    expect(upperBound).toBeLessThan(100);
    expect(lowerBound).toBeLessThan(10);
  });

  it("returns empty for normal distribution-like data", () => {
    const values = [10, 11, 12, 13, 14, 15, 16];
    const { outliers } = detectOutliersIQR(values);
    expect(outliers).toHaveLength(0);
  });

  it("returns empty for fewer than 4 values", () => {
    const { outliers } = detectOutliersIQR([1, 2, 3]);
    expect(outliers).toEqual([]);
  });

  it("detects low outliers too", () => {
    const values = [1, 50, 52, 54, 56, 58, 60];
    const { outliers } = detectOutliersIQR(values);
    expect(outliers).toContain(1);
  });
});

describe("detectOutliersZScore", () => {
  it("detects values beyond threshold standard deviations", () => {
    const values = [10, 11, 12, 10, 11, 12, 10, 11, 100];
    const { outliers, zScores } = detectOutliersZScore(values, 2.5);
    expect(outliers).toContain(100);
    expect(zScores).toHaveLength(values.length);
  });

  it("returns empty for fewer than 3 values", () => {
    const { outliers } = detectOutliersZScore([1, 2]);
    expect(outliers).toEqual([]);
  });

  it("returns empty when all values are equal (sd=0)", () => {
    const { outliers } = detectOutliersZScore([5, 5, 5, 5]);
    expect(outliers).toEqual([]);
  });

  it("respects custom threshold", () => {
    const values = [10, 11, 12, 10, 11, 25];
    const strict = detectOutliersZScore(values, 1.5);
    const lenient = detectOutliersZScore(values, 3);
    expect(strict.outliers.length).toBeGreaterThanOrEqual(
      lenient.outliers.length
    );
  });
});

describe("detectSuddenChanges", () => {
  it("detects a sudden jump in values", () => {
    const values = [100, 101, 100, 102, 101, 100, 101, 100, 101, 100, 5000, 101, 100];
    const changes = detectSuddenChanges(values, 2);
    expect(changes.length).toBeGreaterThan(0);
    const jump = changes.find((c) => c.value === 5000);
    expect(jump).toBeDefined();
    expect(jump!.changePct).toBeGreaterThan(0);
  });

  it("detects a sudden drop", () => {
    const values = [1000, 1001, 1000, 1002, 1001, 1000, 1001, 1000, 1001, 1000, 5, 1001, 1000];
    const changes = detectSuddenChanges(values, 2);
    expect(changes.length).toBeGreaterThan(0);
    const drop = changes.find((c) => c.value === 5);
    expect(drop).toBeDefined();
    expect(drop!.changePct).toBeLessThan(0);
  });

  it("returns empty for smooth data", () => {
    const values = [10, 11, 12, 13, 14, 15];
    const changes = detectSuddenChanges(values, 2);
    expect(changes).toEqual([]);
  });

  it("returns empty for fewer than 3 values", () => {
    expect(detectSuddenChanges([1, 2], 2)).toEqual([]);
  });
});

describe("detectColumnAnomalies", () => {
  it("returns anomalies with human-readable descriptions", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      revenue: i === 15 ? 10000 : 100 + i,
    }));
    const anomalies = detectColumnAnomalies(rows, "revenue", 5);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].column).toBe("revenue");
    expect(anomalies[0].description).toBeTruthy();
    expect(typeof anomalies[0].deviationScore).toBe("number");
  });

  it("limits results to maxAnomalies", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      value: i < 40 ? 100 : 10000 + i * 1000,
    }));
    const anomalies = detectColumnAnomalies(rows, "value", 3);
    expect(anomalies.length).toBeLessThanOrEqual(3);
  });

  it("returns empty for fewer than 4 rows", () => {
    const rows = [{ x: 1 }, { x: 2 }, { x: 3 }];
    expect(detectColumnAnomalies(rows, "x")).toEqual([]);
  });

  it("sorts by deviation score descending", () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      val: i === 25 ? 5000 : i === 10 ? 3000 : 100,
    }));
    const anomalies = detectColumnAnomalies(rows, "val", 10);
    for (let i = 1; i < anomalies.length; i++) {
      expect(anomalies[i - 1].deviationScore).toBeGreaterThanOrEqual(
        anomalies[i].deviationScore
      );
    }
  });
});
