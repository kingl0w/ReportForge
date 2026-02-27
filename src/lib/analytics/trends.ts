import type { TrendResult } from "@/types/report";
import {
  mean,
  linearRegression,
  extractNumbers,
} from "@/lib/analytics/statistics";
import { parseNumericValue } from "@/lib/utils/data-transforms";

export function detectTrend(
  rows: Record<string, unknown>[],
  column: string
): TrendResult {
  const values = extractNumbers(rows, column);

  if (values.length < 3) {
    return {
      column,
      direction: "flat",
      slope: 0,
      rSquared: 0,
      periods: values.length,
      movingAverage: values,
    };
  }

  const { slope, rSquared } = linearRegression(values);
  const avg = mean(values);

  //normalize slope relative to mean so magnitude doesn't affect direction
  const normalizedSlope = avg !== 0 ? slope / Math.abs(avg) : 0;

  let direction: "up" | "down" | "flat";
  if (Math.abs(normalizedSlope) < 0.005) {
    direction = "flat";
  } else {
    direction = normalizedSlope > 0 ? "up" : "down";
  }

  const windowSize = Math.max(3, Math.floor(values.length / 4));
  const ma = movingAverage(values, windowSize);

  return {
    column,
    direction,
    slope,
    rSquared,
    periods: values.length,
    movingAverage: ma,
  };
}

export function movingAverage(values: number[], windowSize: number): number[] {
  if (values.length === 0) return [];
  const w = Math.min(windowSize, values.length);
  const result: number[] = [];

  let windowSum = 0;
  for (let i = 0; i < values.length; i++) {
    windowSum += values[i];
    if (i >= w) {
      windowSum -= values[i - w];
    }
    const count = Math.min(i + 1, w);
    result.push(windowSum / count);
  }

  return result;
}

/**(current - previous) / |previous| * 100*/
export function growthRate(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

type Period = "week" | "month" | "quarter" | "year";

/**groups data by period, sums values, and computes % change.*/
export function periodOverPeriod(
  rows: Record<string, unknown>[],
  dateColumn: string,
  valueColumn: string,
  period: Period = "month"
): { period: string; value: number; change: number | null }[] {
  const periodMap = new Map<string, number>();

  for (const row of rows) {
    const dateRaw = row[dateColumn];
    const numVal = parseNumericValue(row[valueColumn]);
    if (numVal === null || dateRaw == null) continue;

    const d = new Date(String(dateRaw));
    if (isNaN(d.getTime())) continue;

    const key = getPeriodKey(d, period);
    periodMap.set(key, (periodMap.get(key) ?? 0) + numVal);
  }

  const sorted = Array.from(periodMap.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  const result: { period: string; value: number; change: number | null }[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const [periodKey, value] = sorted[i];
    const prev = i > 0 ? sorted[i - 1][1] : null;
    const change = prev !== null ? growthRate(value, prev) : null;
    result.push({ period: periodKey, value, change });
  }

  return result;
}

/**compares each month's value to the overall mean to find seasonal peaks/troughs.*/
export function seasonalityDetection(
  rows: Record<string, unknown>[],
  dateColumn: string,
  valueColumn: string
): { period: string; index: number; description: string }[] {
  const monthly = periodOverPeriod(rows, dateColumn, valueColumn, "month");
  if (monthly.length < 6) return [];

  const values = monthly.map((m) => m.value);
  const avg = mean(values);
  if (avg === 0) return [];

  const results: { period: string; index: number; description: string }[] = [];

  for (const m of monthly) {
    const deviation = (m.value - avg) / avg;
    if (Math.abs(deviation) > 0.2) {
      const pct = Math.abs(deviation * 100).toFixed(0);
      const dir = deviation > 0 ? "above" : "below";
      results.push({
        period: m.period,
        index: deviation,
        description: `${m.period} is ${pct}% ${dir} average`,
      });
    }
  }

  return results;
}

function getPeriodKey(date: Date, period: Period): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;

  switch (period) {
    case "week": {
      //ISO week number
      const jan1 = new Date(y, 0, 1);
      const days = Math.floor(
        (date.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000)
      );
      const week = Math.ceil((days + jan1.getDay() + 1) / 7);
      return `${y}-W${String(week).padStart(2, "0")}`;
    }
    case "month":
      return `${y}-${String(m).padStart(2, "0")}`;
    case "quarter":
      return `${y}-Q${Math.ceil(m / 3)}`;
    case "year":
      return `${y}`;
  }
}
