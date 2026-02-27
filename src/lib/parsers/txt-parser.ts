import type { DataSet, ParseOptions } from "@/types/data";
import { buildColumns } from "@/lib/utils/data-transforms";

const DEFAULT_MAX_PREVIEW = 100;
const MAX_ROWS = 10_000;

type DetectedFormat =
  | { kind: "tsv"; delimiter: "\t" }
  | { kind: "pipe"; delimiter: "|" }
  | { kind: "fixed_width"; positions: number[] }
  | { kind: "freeform" };

/**
 *auto-detects TSV, pipe-separated, fixed-width, or free-form text.
 */
export function parseTXT(
  text: string,
  fileName: string,
  fileSize: number,
  options?: ParseOptions
): DataSet {
  const maxRows = options?.maxPreviewRows ?? DEFAULT_MAX_PREVIEW;
  const warnings: string[] = [];

  const lines = text.split("\n").filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return emptyDataSet(fileName, fileSize, "txt", ["File is empty"]);
  }

  const format = detectFormat(lines);

  if (format.kind === "tsv" || format.kind === "pipe") {
    const delimName = format.kind === "tsv" ? "tab" : "pipe";
    warnings.push(`Detected ${delimName}-separated format`);
    return parseDelimited(lines, format.delimiter, fileName, fileSize, maxRows, warnings);
  }

  if (format.kind === "fixed_width") {
    warnings.push("Detected fixed-width column format");
    return parseFixedWidth(lines, format.positions, fileName, fileSize, maxRows, warnings);
  }

  warnings.push("Treating as free-form text (no structured data detected)");
  return parseFreeform(lines, fileName, fileSize, maxRows, warnings);
}

function detectFormat(lines: string[]): DetectedFormat {
  const sampleLines = lines.slice(0, Math.min(10, lines.length));

  const tabCounts = sampleLines.map(
    (l) => (l.match(/\t/g) ?? []).length
  );
  const avgTabs = tabCounts.reduce((a, b) => a + b, 0) / tabCounts.length;
  if (avgTabs >= 1) {
    const consistent = tabCounts.every(
      (c) => Math.abs(c - tabCounts[0]) <= 1
    );
    if (consistent && tabCounts[0] >= 1) {
      return { kind: "tsv", delimiter: "\t" };
    }
  }

  const pipeCounts = sampleLines.map(
    (l) => (l.match(/\|/g) ?? []).length
  );
  const avgPipes = pipeCounts.reduce((a, b) => a + b, 0) / pipeCounts.length;
  if (avgPipes >= 1) {
    const consistent = pipeCounts.every(
      (c) => Math.abs(c - pipeCounts[0]) <= 1
    );
    if (consistent && pipeCounts[0] >= 1) {
      return { kind: "pipe", delimiter: "|" };
    }
  }

  if (sampleLines.length >= 3) {
    const positions = detectFixedWidthPositions(sampleLines);
    if (positions.length >= 2) {
      return { kind: "fixed_width", positions };
    }
  }

  return { kind: "freeform" };
}

/**
 *detect fixed-width column boundaries by looking for positions
 *where spaces appear consistently across all sample lines.
 */
function detectFixedWidthPositions(lines: string[]): number[] {
  const maxLen = Math.max(...lines.map((l) => l.length));
  if (maxLen < 10) return [];

  const spacePositions: number[] = [];
  for (let pos = 1; pos < maxLen - 1; pos++) {
    const hasSpace = lines.every(
      (l) => pos < l.length && l[pos] === " " && l[pos - 1] !== " "
    );
    if (hasSpace) spacePositions.push(pos);
  }

  if (spacePositions.length < 2) return [];

  //columns should be reasonably spaced (at least 3 chars apart)
  const filtered: number[] = [spacePositions[0]];
  for (let i = 1; i < spacePositions.length; i++) {
    if (spacePositions[i] - filtered[filtered.length - 1] >= 3) {
      filtered.push(spacePositions[i]);
    }
  }

  return filtered.length >= 2 ? filtered : [];
}

function parseDelimited(
  lines: string[],
  delimiter: string,
  fileName: string,
  fileSize: number,
  maxRows: number,
  warnings: string[]
): DataSet {
  const headerLine = lines[0];
  const headers = headerLine
    .split(delimiter)
    .map((h) => h.trim())
    .filter((h) => h.length > 0);

  const allRows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delimiter).map((c) => c.trim());
    const row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = cells[j] ?? null;
    }
    allRows.push(row);
  }

  const totalCount = allRows.length;

  if (totalCount > MAX_ROWS) {
    throw new Error(
      `Dataset too large: ${totalCount.toLocaleString()} rows exceeds the ${MAX_ROWS.toLocaleString()} row limit.`
    );
  }

  const previewRows = allRows.slice(0, maxRows);

  if (previewRows.length === 0) {
    return emptyDataSet(fileName, fileSize, "txt", [
      ...warnings,
      "No data rows found",
    ]);
  }

  const columns = buildColumns(previewRows, headers);

  return {
    columns,
    rows: previewRows,
    rowCount: totalCount,
    metadata: {
      source: fileName,
      fileSize,
      fileType: "txt",
      parseWarnings: warnings,
    },
  };
}

function parseFixedWidth(
  lines: string[],
  positions: number[],
  fileName: string,
  fileSize: number,
  maxRows: number,
  warnings: string[]
): DataSet {
  const boundaries = [0, ...positions];

  const headerLine = lines[0];
  const headers = boundaries.map((start, i) => {
    const end = i < boundaries.length - 1 ? boundaries[i + 1] : headerLine.length;
    return headerLine.slice(start, end).trim();
  }).filter((h) => h.length > 0);

  const allRows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      const start = boundaries[j];
      const end = j < boundaries.length - 1 ? boundaries[j + 1] : line.length;
      row[headers[j]] = line.slice(start, end).trim() || null;
    }
    allRows.push(row);
  }

  const totalCount = allRows.length;

  if (totalCount > MAX_ROWS) {
    throw new Error(
      `Dataset too large: ${totalCount.toLocaleString()} rows exceeds the ${MAX_ROWS.toLocaleString()} row limit.`
    );
  }

  const previewRows = allRows.slice(0, maxRows);

  if (previewRows.length === 0) {
    return emptyDataSet(fileName, fileSize, "txt", [
      ...warnings,
      "No data rows found",
    ]);
  }

  const columns = buildColumns(previewRows, headers);

  return {
    columns,
    rows: previewRows,
    rowCount: totalCount,
    metadata: {
      source: fileName,
      fileSize,
      fileType: "txt",
      parseWarnings: warnings,
    },
  };
}

function parseFreeform(
  lines: string[],
  fileName: string,
  fileSize: number,
  maxRows: number,
  warnings: string[]
): DataSet {
  const paragraphs: string[] = [];
  let current = "";

  for (const line of lines) {
    if (line.trim().length === 0) {
      if (current.length > 0) {
        paragraphs.push(current.trim());
        current = "";
      }
    } else {
      current += (current ? " " : "") + line.trim();
    }
  }
  if (current.length > 0) paragraphs.push(current.trim());

  const items = paragraphs.length > 1 ? paragraphs : lines.map((l) => l.trim());

  const rows: Record<string, unknown>[] = items
    .slice(0, MAX_ROWS)
    .map((text, i) => ({
      line_number: i + 1,
      text,
      word_count: text.split(/\s+/).length,
    }));

  const previewRows = rows.slice(0, maxRows);
  const columns = buildColumns(previewRows, ["line_number", "text", "word_count"]);

  return {
    columns,
    rows: previewRows,
    rowCount: rows.length,
    metadata: {
      source: fileName,
      fileSize,
      fileType: "txt",
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
