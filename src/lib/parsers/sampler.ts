import type { Column } from "@/types/data";

export interface SamplingOptions {
  /**target number of rows after sampling*/
  targetRows: number;
  /**column to stratify on. Auto-detected if not provided.*/
  stratifyColumn?: string;
  /**seed for deterministic sampling. Defaults to hash of row count + first values.*/
  seed?: number;
}

export interface SamplingResult {
  rows: Record<string, unknown>[];
  originalRowCount: number;
  wasSampled: boolean;
  samplingNote: string;
  method: "none" | "stratified" | "reservoir";
  seed: number;
}


function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashValues(rows: Record<string, unknown>[], rowCount: number): number {
  let h = rowCount;
  const sample = rows.slice(0, 5);
  for (const row of sample) {
    for (const val of Object.values(row)) {
      const s = String(val ?? "");
      for (let i = 0; i < s.length && i < 20; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
      }
    }
  }
  return Math.abs(h);
}

function pickStratifyColumn(
  rows: Record<string, unknown>[],
  columns: Column[],
  targetRows: number
): string | null {
  const minCard = 3;
  const maxCard = Math.floor(targetRows / 5);

  for (const col of columns) {
    if (col.type === "date") {
      const unique = new Set(rows.map((r) => String(r[col.name] ?? "")));
      if (unique.size >= minCard && unique.size <= maxCard) return col.name;
    }
  }

  let best: { name: string; cardinality: number } | null = null;
  for (const col of columns) {
    if (col.type !== "string") continue;
    const unique = new Set(rows.map((r) => String(r[col.name] ?? "")));
    if (unique.size < minCard || unique.size > maxCard) continue;
    if (!best || unique.size > best.cardinality) {
      best = { name: col.name, cardinality: unique.size };
    }
  }

  return best?.name ?? null;
}

interface MinMaxIndices {
  /**set of row indices that hold a global min or max for any numeric column*/
  indices: Set<number>;
}

function findMinMaxIndices(
  rows: Record<string, unknown>[],
  columns: Column[]
): MinMaxIndices {
  const indices = new Set<number>();
  for (const col of columns) {
    if (col.type !== "number" && col.type !== "currency" && col.type !== "percentage") continue;
    let minVal = Infinity;
    let maxVal = -Infinity;
    let minIdx = -1;
    let maxIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i][col.name];
      const v = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
      if (isNaN(v)) continue;
      if (v < minVal) { minVal = v; minIdx = i; }
      if (v > maxVal) { maxVal = v; maxIdx = i; }
    }
    if (minIdx >= 0) indices.add(minIdx);
    if (maxIdx >= 0) indices.add(maxIdx);
  }
  return { indices };
}

function seededShuffle<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function stratifiedSample(
  rows: Record<string, unknown>[],
  columns: Column[],
  stratifyCol: string,
  targetRows: number,
  rand: () => number
): Record<string, unknown>[] {
  const groups = new Map<string, number[]>();
  for (let i = 0; i < rows.length; i++) {
    const key = String(rows[i][stratifyCol] ?? "__null__");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(i);
  }

  const totalRows = rows.length;
  const groupEntries = Array.from(groups.entries());
  let allocated = 0;
  const allocations: { key: string; indices: number[]; count: number }[] = [];

  for (const [key, indices] of groupEntries) {
    const proportion = indices.length / totalRows;
    const count = Math.max(1, Math.round(proportion * targetRows));
    allocations.push({ key, indices, count });
    allocated += count;
  }

  if (allocated > targetRows) {
    allocations.sort((a, b) => b.count - a.count);
    let excess = allocated - targetRows;
    for (const alloc of allocations) {
      if (excess <= 0) break;
      const canTrim = Math.min(excess, alloc.count - 1);
      alloc.count -= canTrim;
      excess -= canTrim;
    }
  } else if (allocated < targetRows) {
    allocations.sort((a, b) => b.indices.length - a.indices.length);
    let deficit = targetRows - allocated;
    for (const alloc of allocations) {
      if (deficit <= 0) break;
      const canAdd = Math.min(deficit, alloc.indices.length - alloc.count);
      alloc.count += canAdd;
      deficit -= canAdd;
    }
  }

  const selectedIndices = new Set<number>();
  for (const alloc of allocations) {
    const groupIndices = [...alloc.indices];
    seededShuffle(groupIndices, rand);
    const take = Math.min(alloc.count, groupIndices.length);
    for (let i = 0; i < take; i++) {
      selectedIndices.add(groupIndices[i]);
    }
  }

  const { indices: minMaxSet } = findMinMaxIndices(rows, columns);
  for (const idx of minMaxSet) {
    if (!selectedIndices.has(idx)) {
      const key = String(rows[idx][stratifyCol] ?? "__null__");
      const group = groups.get(key);
      if (group) {
        const removable = group.filter(
          (i) => selectedIndices.has(i) && !minMaxSet.has(i)
        );
        if (removable.length > 0) {
          selectedIndices.delete(removable[0]);
        }
      }
      selectedIndices.add(idx);
    }
  }

  const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
  return sortedIndices.map((i) => rows[i]);
}

function reservoirSample(
  rows: Record<string, unknown>[],
  columns: Column[],
  targetRows: number,
  rand: () => number
): Record<string, unknown>[] {
  const reservoir: { row: Record<string, unknown>; originalIndex: number }[] = [];

  for (let i = 0; i < rows.length; i++) {
    if (i < targetRows) {
      reservoir.push({ row: rows[i], originalIndex: i });
    } else {
      const j = Math.floor(rand() * (i + 1));
      if (j < targetRows) {
        reservoir[j] = { row: rows[i], originalIndex: i };
      }
    }
  }

  const { indices: minMaxSet } = findMinMaxIndices(rows, columns);
  const reservoirIndices = new Set(reservoir.map((r) => r.originalIndex));

  for (const idx of minMaxSet) {
    if (!reservoirIndices.has(idx)) {
      const replaceable = reservoir.filter(
        (r) => !minMaxSet.has(r.originalIndex)
      );
      if (replaceable.length > 0) {
        const replaceIdx = Math.floor(rand() * replaceable.length);
        const target = replaceable[replaceIdx];
        const pos = reservoir.indexOf(target);
        reservoir[pos] = { row: rows[idx], originalIndex: idx };
      }
    }
  }

  reservoir.sort((a, b) => a.originalIndex - b.originalIndex);
  return reservoir.map((r) => r.row);
}

export function sampleRows(
  rows: Record<string, unknown>[],
  columns: Column[],
  options: SamplingOptions
): SamplingResult {
  const { targetRows } = options;

  if (rows.length <= targetRows) {
    return {
      rows,
      originalRowCount: rows.length,
      wasSampled: false,
      samplingNote: "",
      method: "none",
      seed: 0,
    };
  }

  const seed = options.seed ?? hashValues(rows, rows.length);
  const rand = mulberry32(seed);
  const stratifyCol =
    options.stratifyColumn ?? pickStratifyColumn(rows, columns, targetRows);

  let sampled: Record<string, unknown>[];
  let method: "stratified" | "reservoir";

  if (stratifyCol) {
    sampled = stratifiedSample(rows, columns, stratifyCol, targetRows, rand);
    method = "stratified";
  } else {
    sampled = reservoirSample(rows, columns, targetRows, rand);
    method = "reservoir";
  }

  const methodDesc =
    method === "stratified"
      ? `stratified by "${stratifyCol}", preserving extremes`
      : "random reservoir sampling, preserving extremes";

  return {
    rows: sampled,
    originalRowCount: rows.length,
    wasSampled: true,
    samplingNote: `Sampled ${sampled.length.toLocaleString()} of ${rows.length.toLocaleString()} rows (${methodDesc}). Upgrade for full analysis.`,
    method,
    seed,
  };
}
