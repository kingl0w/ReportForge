import type { Anomaly } from "@/types/report";
import {
  mean,
  median,
  standardDeviation,
  percentile,
  extractNumbers,
} from "@/lib/analytics/statistics";

/**IQR method: values below Q1 - 1.5*IQR or above Q3 + 1.5*IQR are outliers.*/
export function detectOutliersIQR(values: number[]): {
  outliers: number[];
  lowerBound: number;
  upperBound: number;
} {
  if (values.length < 4) return { outliers: [], lowerBound: 0, upperBound: 0 };

  const q1 = percentile(values, 25);
  const q3 = percentile(values, 75);
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outliers = values.filter((v) => v < lowerBound || v > upperBound);
  return { outliers, lowerBound, upperBound };
}

/**Z-score method: values more than `threshold` std devs from mean are outliers.*/
export function detectOutliersZScore(
  values: number[],
  threshold = 2.5
): { outliers: number[]; zScores: number[] } {
  if (values.length < 3) return { outliers: [], zScores: [] };

  const avg = mean(values);
  const sd = standardDeviation(values);
  if (sd === 0) return { outliers: [], zScores: values.map(() => 0) };

  const zScores = values.map((v) => (v - avg) / sd);
  const outliers = values.filter((_, i) => Math.abs(zScores[i]) > threshold);

  return { outliers, zScores };
}

/**a sudden change is when the consecutive difference exceeds
 * `sensitivity` standard deviations of all differences.*/
export function detectSuddenChanges(
  values: number[],
  sensitivity = 2
): { index: number; value: number; previousValue: number; changePct: number }[] {
  if (values.length < 3) return [];

  const diffs: number[] = [];
  for (let i = 1; i < values.length; i++) {
    diffs.push(values[i] - values[i - 1]);
  }

  const diffMean = mean(diffs);
  const diffSd = standardDeviation(diffs);
  if (diffSd === 0) return [];

  const results: {
    index: number;
    value: number;
    previousValue: number;
    changePct: number;
  }[] = [];

  for (let i = 0; i < diffs.length; i++) {
    const zScore = Math.abs((diffs[i] - diffMean) / diffSd);
    if (zScore > sensitivity) {
      const prev = values[i];
      const curr = values[i + 1];
      const changePct =
        prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0;
      results.push({
        index: i + 1,
        value: curr,
        previousValue: prev,
        changePct,
      });
    }
  }

  return results;
}

/**combines IQR and Z-score methods, returns human-readable descriptions.*/
export function detectColumnAnomalies(
  rows: Record<string, unknown>[],
  column: string,
  maxAnomalies = 10
): Anomaly[] {
  const values = extractNumbers(rows, column);
  if (values.length < 4) return [];

  const anomalies: Anomaly[] = [];
  const avg = mean(values);
  const med = median(values);
  const sd = standardDeviation(values);

  const { outliers: iqrOutliers, lowerBound, upperBound } =
    detectOutliersIQR(values);

  for (const outlier of iqrOutliers) {
    const rowIndex = values.indexOf(outlier);
    const direction = outlier > upperBound ? "above" : "below";

    anomalies.push({
      column,
      rowIndex,
      value: outlier,
      expected: med,
      deviationScore: sd !== 0 ? Math.abs((outlier - avg) / sd) : 0,
      method: "iqr",
      description: `${column} value (${formatNum(outlier)}) is ${direction} the expected range (${formatNum(lowerBound)} – ${formatNum(upperBound)})`,
    });
  }

  //catch any outliers the IQR method missed
  const { zScores } = detectOutliersZScore(values);
  for (let i = 0; i < values.length; i++) {
    if (Math.abs(zScores[i]) > 2.5) {
      //skip if already flagged by IQR
      if (iqrOutliers.includes(values[i])) continue;

      const deviation = zScores[i].toFixed(1);
      anomalies.push({
        column,
        rowIndex: i,
        value: values[i],
        expected: avg,
        deviationScore: Math.abs(zScores[i]),
        method: "zscore",
        description: `${column} value (${formatNum(values[i])}) is ${deviation} standard deviations from the mean (${formatNum(avg)})`,
      });
    }
  }

  //assumes data may be time-ordered
  const changes = detectSuddenChanges(values);
  for (const change of changes) {
    const direction = change.changePct > 0 ? "increase" : "decrease";
    const pct = Math.abs(change.changePct).toFixed(0);

    anomalies.push({
      column,
      rowIndex: change.index,
      value: change.value,
      expected: change.previousValue,
      deviationScore: Math.abs(change.changePct) / 100,
      method: "sudden_change",
      description: `${column} had a sudden ${pct}% ${direction} (${formatNum(change.previousValue)} → ${formatNum(change.value)})`,
    });
  }

  return anomalies
    .sort((a, b) => b.deviationScore - a.deviationScore)
    .slice(0, maxAnomalies);
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toFixed(2);
}
