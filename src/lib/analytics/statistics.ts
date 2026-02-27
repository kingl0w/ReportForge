import { parseNumericValue } from "@/lib/utils/data-transforms";

export function extractNumbers(
  rows: Record<string, unknown>[],
  column: string
): number[] {
  const result: number[] = [];
  for (const row of rows) {
    const n = parseNumericValue(row[column]);
    if (n !== null) result.push(n);
  }
  return result;
}

export function sum(values: number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mode(values: number[]): number | null {
  if (values.length === 0) return null;
  const counts = new Map<number, number>();
  let maxCount = 0;
  let modeValue: number | null = null;

  for (const v of values) {
    const c = (counts.get(v) ?? 0) + 1;
    counts.set(v, c);
    if (c > maxCount) {
      maxCount = c;
      modeValue = v;
    }
  }

  //no meaningful mode if all values are unique
  return maxCount > 1 ? modeValue : null;
}

export function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  let total = 0;
  for (const v of values) {
    const diff = v - avg;
    total += diff * diff;
  }
  return total / (values.length - 1); //Bessel's correction (sample variance)
}

export function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

export function min(values: number[]): number {
  if (values.length === 0) return 0;
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] < result) result = values[i];
  }
  return result;
}

export function max(values: number[]): number {
  if (values.length === 0) return 0;
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] > result) result = values[i];
  }
  return result;
}

export function range(values: number[]): number {
  if (values.length === 0) return 0;
  return max(values) - min(values);
}

/**p-th percentile (p in 0..100) using linear interpolation.*/
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  if (p <= 0) return min(values);
  if (p >= 100) return max(values);

  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const frac = index - lower;

  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - frac) + sorted[upper] * frac;
}

export function frequencyDistribution(
  rows: Record<string, unknown>[],
  column: string
): { value: string; count: number; percent: number }[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const v = row[column];
    const key = v == null || v === "" ? "(empty)" : String(v);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const total = rows.length;
  const result = Array.from(counts.entries()).map(([value, count]) => ({
    value,
    count,
    percent: total > 0 ? (count / total) * 100 : 0,
  }));

  return result.sort((a, b) => b.count - a.count);
}

export function groupBy(
  rows: Record<string, unknown>[],
  groupColumn: string,
  metricColumn: string,
  operation: "sum" | "avg" | "count" | "min" | "max" = "sum"
): { group: string; value: number }[] {
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const key = String(row[groupColumn] ?? "Unknown");
    const n = parseNumericValue(row[metricColumn]);

    if (!groups.has(key)) groups.set(key, []);
    if (n !== null) groups.get(key)!.push(n);
  }

  const result: { group: string; value: number }[] = [];

  for (const [group, values] of groups) {
    let value: number;
    switch (operation) {
      case "sum":
        value = sum(values);
        break;
      case "avg":
        value = mean(values);
        break;
      case "count":
        value = values.length;
        break;
      case "min":
        value = values.length > 0 ? Math.min(...values) : 0;
        break;
      case "max":
        value = values.length > 0 ? Math.max(...values) : 0;
        break;
    }
    result.push({ group, value });
  }

  return result.sort((a, b) => b.value - a.value);
}

/**y = slope * x + intercept. Returns slope, intercept, and R-squared.*/
export function linearRegression(values: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, rSquared: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: mean(values), rSquared: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssRes += (values[i] - predicted) ** 2;
    ssTot += (values[i] - yMean) ** 2;
  }
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, rSquared: Math.max(0, rSquared) };
}
