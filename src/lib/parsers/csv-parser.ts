import Papa from "papaparse";
import type { DataSet, ParseOptions } from "@/types/data";
import { buildColumns } from "@/lib/utils/data-transforms";

const DEFAULT_MAX_PREVIEW = 100;
const DEFAULT_ROW_LIMIT = 50_000;

/**files above this threshold use chunked parsing to reduce peak memory.*/
const STREAM_THRESHOLD = 5 * 1024 * 1024; // 5 MB

/**
 *auto-detect the delimiter used in a CSV string.
 *checks the first 5 non-empty lines for comma, semicolon, tab, and pipe.
 */
function detectDelimiter(text: string): string {
  const candidates = [",", ";", "\t", "|"] as const;
  const lines = text.split("\n").filter((l) => l.trim().length > 0).slice(0, 5);

  if (lines.length === 0) return ",";

  let bestDelim = ",";
  let bestScore = 0;

  for (const delim of candidates) {
    const counts = lines.map((line) => {
      let count = 0;
      let inQuote = false;
      for (const ch of line) {
        if (ch === '"') inQuote = !inQuote;
        else if (ch === delim && !inQuote) count++;
      }
      return count;
    });

    const minCount = Math.min(...counts);
    if (minCount > 0) {
      const variance = counts.reduce((sum, c) => sum + Math.abs(c - minCount), 0);
      const score = minCount * lines.length - variance;
      if (score > bestScore) {
        bestScore = score;
        bestDelim = delim;
      }
    }
  }

  return bestDelim;
}

/**
 *strip UTF-8 BOM from the beginning of text.
 */
function stripBOM(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 *for files larger than 5 MB, uses chunked parsing
 *to avoid holding the full parsed result in memory at once.
 */
export function parseCSV(
  text: string,
  fileName: string,
  fileSize: number,
  options?: ParseOptions
): DataSet {
  const cleaned = stripBOM(text);
  const rowLimit = options?.rowLimit ?? DEFAULT_ROW_LIMIT;

  if (fileSize > STREAM_THRESHOLD) {
    return parseCSVChunked(cleaned, fileName, fileSize, options, rowLimit);
  }

  return parseCSVFull(cleaned, fileName, fileSize, options, rowLimit);
}

/**
 *standard full-buffer parse for smaller files.
 */
function parseCSVFull(
  text: string,
  fileName: string,
  fileSize: number,
  options: ParseOptions | undefined,
  rowLimit: number
): DataSet {
  const maxPreview = options?.maxPreviewRows ?? DEFAULT_MAX_PREVIEW;
  const warnings: string[] = [];

  const delimiter = detectDelimiter(text);
  if (delimiter !== ",") {
    const delimName =
      delimiter === "\t" ? "tab" : delimiter === "|" ? "pipe" : `"${delimiter}"`;
    warnings.push(`Auto-detected ${delimName} delimiter`);
  }

  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: "greedy",
    delimiter,
    transformHeader: (h: string) => h.trim(),
  });

  if (result.errors.length > 0) {
    for (const err of result.errors.slice(0, 10)) {
      warnings.push(`Row ${err.row ?? "?"}: ${err.message}`);
    }
  }

  const allRows = result.data;
  const totalCount = allRows.length;
  let truncated = false;

  if (totalCount > rowLimit) {
    warnings.push(
      `Dataset has ${totalCount.toLocaleString()} rows. ` +
      `Truncated to ${rowLimit.toLocaleString()} rows. ` +
      `Consider filtering your data or using state-level aggregation.`
    );
    truncated = true;
  }

  const keptRows = truncated ? allRows.slice(0, rowLimit) : allRows;
  const previewRows = keptRows.slice(0, maxPreview);

  if (previewRows.length === 0) {
    return emptyDataSet(fileName, fileSize, "csv", warnings);
  }

  const originalNames = result.meta.fields ?? Object.keys(previewRows[0]);
  const columns = buildColumns(previewRows, originalNames);

  return {
    columns,
    rows: keptRows,
    rowCount: totalCount,
    metadata: {
      source: fileName,
      fileSize,
      fileType: "csv",
      parseWarnings: warnings,
    },
  };
}

/**
 *chunked parse for files > 5 MB. PapaParse processes in chunks but we
 *still receive the full result -- the key difference is we abort early
 *once we hit the row limit, avoiding parsing the entire file.
 */
function parseCSVChunked(
  text: string,
  fileName: string,
  fileSize: number,
  options: ParseOptions | undefined,
  rowLimit: number
): DataSet {
  const maxPreview = options?.maxPreviewRows ?? DEFAULT_MAX_PREVIEW;
  const warnings: string[] = [];

  const delimiter = detectDelimiter(text);
  if (delimiter !== ",") {
    const delimName =
      delimiter === "\t" ? "tab" : delimiter === "|" ? "pipe" : `"${delimiter}"`;
    warnings.push(`Auto-detected ${delimName} delimiter`);
  }

  warnings.push(`Large file (${(fileSize / (1024 * 1024)).toFixed(1)} MB) — using chunked parsing`);

  const collectedRows: Record<string, unknown>[] = [];
  let fieldNames: string[] | undefined;
  let totalRowsSeen = 0;
  let aborted = false;
  const parseErrors: Papa.ParseError[] = [];

  Papa.parse<Record<string, unknown>>(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: "greedy",
    delimiter,
    transformHeader: (h: string) => h.trim(),
    chunk(
      results: Papa.ParseResult<Record<string, unknown>>,
      parser: Papa.Parser
    ) {
      if (!fieldNames && results.meta.fields) {
        fieldNames = results.meta.fields;
      }

      parseErrors.push(...results.errors);

      const rows = results.data;
      totalRowsSeen += rows.length;

      const remaining = rowLimit - collectedRows.length;
      if (remaining > 0) {
        collectedRows.push(...rows.slice(0, remaining));
      }

      if (collectedRows.length >= rowLimit) {
        aborted = true;
        parser.abort();
      }
    },
    complete() {},
  });

  if (parseErrors.length > 0) {
    for (const err of parseErrors.slice(0, 10)) {
      warnings.push(`Row ${err.row ?? "?"}: ${err.message}`);
    }
  }

  if (aborted || totalRowsSeen > rowLimit) {
    warnings.push(
      `Dataset has ${totalRowsSeen > rowLimit ? "more than " : ""}` +
      `${totalRowsSeen.toLocaleString()} rows. ` +
      `Truncated to ${rowLimit.toLocaleString()} rows. ` +
      `Consider filtering your data or using state-level aggregation.`
    );
  }

  const previewRows = collectedRows.slice(0, maxPreview);

  if (previewRows.length === 0) {
    return emptyDataSet(fileName, fileSize, "csv", warnings);
  }

  const originalNames = fieldNames ?? Object.keys(previewRows[0]);
  const columns = buildColumns(previewRows, originalNames);

  return {
    columns,
    rows: collectedRows,
    rowCount: totalRowsSeen,
    metadata: {
      source: fileName,
      fileSize,
      fileType: "csv",
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
