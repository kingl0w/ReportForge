import type { Column, ColumnType } from "@/types/data";

const CURRENCY_RE = /^[\$€£¥₹][\s]?[\d,.]+$|^[\d,.]+[\s]?[\$€£¥₹]$/;
const PERCENTAGE_RE = /^-?[\d,.]+\s?%$/;

//conservative to avoid false positives
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,                          //2025-01-15
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,               //ISO 8601
  /^\d{2}\/\d{2}\/\d{4}$/,                         //01/15/2025
  /^\d{2}-\d{2}-\d{4}$/,                           //01-15-2025
  /^\w{3}\s+\d{1,2},?\s+\d{4}$/,                   //Jan 15, 2025
  /^\d{1,2}\s+\w{3}\s+\d{4}$/,                     //15 Jan 2025
  /^\d{4}\/\d{2}\/\d{2}$/,                         //2025/01/15
];

function classifyValue(value: unknown): ColumnType | null {
  if (value == null || value === "") return null;

  const str = String(value).trim();
  if (str === "") return null;

  if (/^(true|false|yes|no|1|0)$/i.test(str)) return "boolean";
  if (CURRENCY_RE.test(str)) return "currency";
  if (PERCENTAGE_RE.test(str)) return "percentage";

  const cleaned = str.replace(/,/g, "");
  if (cleaned !== "" && !isNaN(Number(cleaned)) && isFinite(Number(cleaned))) {
    return "number";
  }

  for (const pattern of DATE_PATTERNS) {
    if (pattern.test(str)) {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) return "date";
    }
  }

  return "string";
}

/**uses majority vote — the most common non-null type wins*/
export function detectColumnTypes(
  rows: Record<string, unknown>[],
  columnNames: string[]
): Map<string, ColumnType> {
  const result = new Map<string, ColumnType>();

  for (const col of columnNames) {
    const counts: Record<string, number> = {};
    let sampled = 0;
    const maxSamples = Math.min(rows.length, 200);

    for (let i = 0; i < maxSamples; i++) {
      const type = classifyValue(rows[i][col]);
      if (type) {
        counts[type] = (counts[type] ?? 0) + 1;
        sampled++;
      }
    }

    if (sampled === 0) {
      result.set(col, "string");
      continue;
    }

    //majority vote
    let best: ColumnType = "string";
    let bestCount = 0;
    for (const [type, count] of Object.entries(counts)) {
      if (count > bestCount) {
        bestCount = count;
        best = type as ColumnType;
      }
    }

    result.set(col, best);
  }

  return result;
}

export function buildColumns(
  rows: Record<string, unknown>[],
  originalNames: string[]
): Column[] {
  const normalizedMap = normalizeHeaders(originalNames);
  const types = detectColumnTypes(rows, originalNames);

  return originalNames.map((original) => {
    const name = normalizedMap.get(original) ?? original;
    const type = types.get(original) ?? "string";

    const samples: unknown[] = [];
    for (const row of rows) {
      if (samples.length >= 5) break;
      const v = row[original];
      if (v != null && v !== "") samples.push(v);
    }

    let nullCount = 0;
    for (const row of rows) {
      const v = row[original];
      if (v == null || v === "") nullCount++;
    }

    return { name, originalName: original, type, sampleValues: samples, nullCount };
  });
}

/*trim, lowercase, replace non-alphanumeric runs with underscore,
 * and deduplicate (append _2, _3, ...).*/
export function normalizeHeaders(
  originals: string[]
): Map<string, string> {
  const result = new Map<string, string>();
  const seen = new Map<string, number>();

  for (const original of originals) {
    let normalized = original
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_|_$/g, "");

    if (normalized === "") normalized = "column";

    const count = seen.get(normalized) ?? 0;
    if (count > 0) {
      normalized = `${normalized}_${count + 1}`;
    }
    seen.set(normalized.replace(/_\d+$/, ""), count + 1);

    result.set(original, normalized);
  }

  return result;
}

type AggOp = "sum" | "avg" | "count" | "min" | "max";

export interface AggregateResult {
  group: string;
  value: number;
}

export function aggregateData(
  rows: Record<string, unknown>[],
  groupBy: string,
  metric: string,
  operation: AggOp = "sum"
): AggregateResult[] {
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const key = String(row[groupBy] ?? "Unknown");
    const rawVal = row[metric];
    const num = parseNumericValue(rawVal);
    if (num === null) continue;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(num);
  }

  const results: AggregateResult[] = [];

  for (const [group, values] of groups) {
    let value: number;
    switch (operation) {
      case "sum":
        value = values.reduce((a, b) => a + b, 0);
        break;
      case "avg":
        value = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case "count":
        value = values.length;
        break;
      case "min":
        value = Math.min(...values);
        break;
      case "max":
        value = Math.max(...values);
        break;
    }
    results.push({ group, value });
  }

  return results.sort((a, b) => b.value - a.value);
}

export interface TrendPoint {
  date: string;
  value: number;
  previousValue: number | null;
  changeAbsolute: number | null;
  changePercent: number | null;
}

/**compute value at each period and calculate period-over-period changes*/
export function calculateTrends(
  rows: Record<string, unknown>[],
  dateColumn: string,
  valueColumn: string
): TrendPoint[] {
  const points: { date: Date; dateStr: string; value: number }[] = [];

  for (const row of rows) {
    const rawDate = row[dateColumn];
    const rawVal = row[valueColumn];
    const num = parseNumericValue(rawVal);
    if (num === null) continue;

    const d = new Date(String(rawDate));
    if (isNaN(d.getTime())) continue;

    points.push({ date: d, dateStr: String(rawDate), value: num });
  }

  points.sort((a, b) => a.date.getTime() - b.date.getTime());

  const trends: TrendPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = i > 0 ? points[i - 1].value : null;
    const changeAbsolute = prev !== null ? points[i].value - prev : null;
    const changePercent =
      prev !== null && prev !== 0
        ? ((points[i].value - prev) / Math.abs(prev)) * 100
        : null;

    trends.push({
      date: points[i].dateStr,
      value: points[i].value,
      previousValue: prev,
      changeAbsolute,
      changePercent,
    });
  }

  return trends;
}

/**parse a value that may contain currency symbols, commas, or % signs into a plain number*/
export function parseNumericValue(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return isFinite(raw) ? raw : null;

  const str = String(raw).trim();
  if (str === "") return null;

  const cleaned = str.replace(/[$€£¥₹,%\s]/g, "");
  const num = Number(cleaned);
  return isFinite(num) ? num : null;
}
