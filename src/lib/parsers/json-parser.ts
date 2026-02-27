import type { DataSet, ParseOptions } from "@/types/data";
import { buildColumns } from "@/lib/utils/data-transforms";

const DEFAULT_MAX_PREVIEW = 100;
const MAX_ROWS = 10_000;

/**
 *flatten a nested object into dot-notation keys.
 *{ a: { b: 1 } } -> { "a.b": 1 }
 */
function flattenObject(
  obj: unknown,
  prefix = "",
  result: Record<string, unknown> = {}
): Record<string, unknown> {
  if (obj == null || typeof obj !== "object") {
    if (prefix) result[prefix] = obj;
    return result;
  }

  if (Array.isArray(obj)) {
    if (prefix) result[prefix] = JSON.stringify(obj);
    return result;
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      flattenObject(value, newKey, result);
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 *try to parse text as JSON Lines (one JSON object per line).
 *returns null if the text is not valid JSONL.
 */
function tryParseJSONLines(text: string): Record<string, unknown>[] | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return null;

  const rows: Record<string, unknown>[] = [];
  for (const line of lines) {
    try {
      const parsed: unknown = JSON.parse(line);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return null;
      }
      rows.push(flattenObject(parsed));
    } catch {
      return null;
    }
  }

  return rows;
}

export function parseJSON(
  text: string,
  fileName: string,
  fileSize: number,
  options?: ParseOptions
): DataSet {
  const maxRows = options?.maxPreviewRows ?? DEFAULT_MAX_PREVIEW;
  const warnings: string[] = [];

  const jsonlRows = tryParseJSONLines(text);
  if (jsonlRows) {
    warnings.push("Detected JSON Lines format (one object per line)");
    return buildDataSet(jsonlRows, fileName, fileSize, maxRows, warnings);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return emptyDataSet(fileName, fileSize, "json", ["Invalid JSON"]);
  }

  let rows: Record<string, unknown>[];

  if (Array.isArray(parsed)) {
    rows = parsed.map((item) => flattenObject(item));
  } else if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));

    if (arrayKey) {
      warnings.push(`Extracted data from "${arrayKey}" property`);
      rows = (obj[arrayKey] as unknown[]).map((item) => flattenObject(item));
    } else {
      warnings.push("JSON is a single object - treating as one row");
      rows = [flattenObject(obj)];
    }
  } else {
    return emptyDataSet(fileName, fileSize, "json", [
      "JSON must be an array or object",
    ]);
  }

  return buildDataSet(rows, fileName, fileSize, maxRows, warnings);
}

function buildDataSet(
  rows: Record<string, unknown>[],
  fileName: string,
  fileSize: number,
  maxRows: number,
  warnings: string[]
): DataSet {
  const totalCount = rows.length;

  if (totalCount > MAX_ROWS) {
    throw new Error(
      `Dataset too large: ${totalCount.toLocaleString()} rows exceeds the ${MAX_ROWS.toLocaleString()} row limit. Please reduce your dataset and try again.`
    );
  }

  const previewRows = rows.slice(0, maxRows);

  if (previewRows.length === 0) {
    return emptyDataSet(fileName, fileSize, "json", [
      ...warnings,
      "No data rows found",
    ]);
  }

  const keySet = new Set<string>();
  for (const row of previewRows) {
    for (const key of Object.keys(row)) keySet.add(key);
  }
  const originalNames = Array.from(keySet);
  const columns = buildColumns(previewRows, originalNames);

  return {
    columns,
    rows: previewRows,
    rowCount: totalCount,
    metadata: {
      source: fileName,
      fileSize,
      fileType: "json",
      parseWarnings: warnings,
    },
  };
}

function emptyDataSet(
  source: string,
  fileSize: number,
  fileType: string,
  warnings: string[]
): DataSet {
  return {
    columns: [],
    rows: [],
    rowCount: 0,
    metadata: { source, fileSize, fileType, parseWarnings: warnings },
  };
}
