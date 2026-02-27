import type { Correlation } from "@/types/report";
import { mean, extractNumbers } from "@/lib/analytics/statistics";

/**Pearson correlation coefficient between two arrays. Returns -1 to 1.*/
export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;

  const meanA = mean(a.slice(0, n));
  const meanB = mean(b.slice(0, n));

  let sumAB = 0;
  let sumA2 = 0;
  let sumB2 = 0;

  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    sumAB += da * db;
    sumA2 += da * da;
    sumB2 += db * db;
  }

  const denom = Math.sqrt(sumA2 * sumB2);
  if (denom === 0) return 0;

  return sumAB / denom;
}

function classifyStrength(
  r: number
): "strong" | "moderate" | "weak" | "none" {
  const abs = Math.abs(r);
  if (abs >= 0.7) return "strong";
  if (abs >= 0.4) return "moderate";
  if (abs >= 0.2) return "weak";
  return "none";
}

/**only returns pairs where |r| > minThreshold.*/
export function findCorrelations(
  rows: Record<string, unknown>[],
  numericColumns: string[],
  minThreshold = 0.3
): Correlation[] {
  if (numericColumns.length < 2) return [];

  const correlations: Correlation[] = [];
  const columnValues = new Map<string, number[]>();

  for (const col of numericColumns) {
    columnValues.set(col, extractNumbers(rows, col));
  }

  for (let i = 0; i < numericColumns.length; i++) {
    for (let j = i + 1; j < numericColumns.length; j++) {
      const colA = numericColumns[i];
      const colB = numericColumns[j];
      const valsA = columnValues.get(colA)!;
      const valsB = columnValues.get(colB)!;

      if (valsA.length < 3 || valsB.length < 3) continue;

      const coefficient = pearsonCorrelation(valsA, valsB);
      const strength = classifyStrength(coefficient);

      if (Math.abs(coefficient) >= minThreshold) {
        correlations.push({ columnA: colA, columnB: colB, coefficient, strength });
      }
    }
  }

  return correlations.sort(
    (a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)
  );
}
