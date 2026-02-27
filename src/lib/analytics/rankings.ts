import type { RankingResult, RankedItem } from "@/types/report";
import { sum, groupBy } from "@/lib/analytics/statistics";
import { parseNumericValue } from "@/lib/utils/data-transforms";

export function topN(
  rows: Record<string, unknown>[],
  column: string,
  n = 5
): { value: number; rowIndex: number }[] {
  const indexed: { value: number; rowIndex: number }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const v = parseNumericValue(rows[i][column]);
    if (v !== null) indexed.push({ value: v, rowIndex: i });
  }

  return indexed.sort((a, b) => b.value - a.value).slice(0, n);
}

export function bottomN(
  rows: Record<string, unknown>[],
  column: string,
  n = 5
): { value: number; rowIndex: number }[] {
  const indexed: { value: number; rowIndex: number }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const v = parseNumericValue(rows[i][column]);
    if (v !== null) indexed.push({ value: v, rowIndex: i });
  }

  return indexed.sort((a, b) => a.value - b.value).slice(0, n);
}

export function percentOfTotal(
  rows: Record<string, unknown>[],
  groupColumn: string,
  valueColumn: string
): { group: string; value: number; percent: number }[] {
  const grouped = groupBy(rows, groupColumn, valueColumn, "sum");
  const total = sum(grouped.map((g) => g.value));

  return grouped.map((g) => ({
    group: g.group,
    value: g.value,
    percent: total > 0 ? (g.value / total) * 100 : 0,
  }));
}

/**Pareto (80/20) detection. Returns groups sorted by value desc with running cumulative %.*/
export function cumulativePercentage(
  rows: Record<string, unknown>[],
  groupColumn: string,
  valueColumn: string
): {
  groups: { group: string; value: number; percent: number; cumulative: number }[];
  paretoPoint: number | null;
} {
  const shares = percentOfTotal(rows, groupColumn, valueColumn);
  let cumulative = 0;
  let paretoPoint: number | null = null;

  const groups = shares.map((s, i) => {
    cumulative += s.percent;
    if (paretoPoint === null && cumulative >= 80) {
      paretoPoint = i + 1;
    }
    return { ...s, cumulative };
  });

  return { groups, paretoPoint };
}

export function buildRanking(
  rows: Record<string, unknown>[],
  groupColumn: string,
  valueColumn: string,
  n = 5
): RankingResult {
  const shares = percentOfTotal(rows, groupColumn, valueColumn);

  const toRankedItem = (s: {
    group: string;
    value: number;
    percent: number;
  }): RankedItem => ({
    label: s.group,
    value: s.value,
    formattedValue: formatValue(s.value),
    percentOfTotal: Math.round(s.percent * 10) / 10,
  });

  const topItems = shares.slice(0, n).map(toRankedItem);
  const bottomItems = shares
    .slice()
    .reverse()
    .slice(0, n)
    .map(toRankedItem);

  return {
    column: valueColumn,
    groupColumn,
    topN: topItems,
    bottomN: bottomItems,
  };
}

function formatValue(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toFixed(2);
}
