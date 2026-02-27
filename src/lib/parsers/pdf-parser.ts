import type { DataSet } from "@/types/data";
import { buildColumns } from "@/lib/utils/data-transforms";

const MAX_ROWS = 10_000;
const DEFAULT_MAX_PREVIEW = 100;

/**
 *extracts text from PDF, detects tabular data by looking for lines with
 *consistent column separators. Falls back to paragraphs if no tables found.
 */
export async function parsePDF(
  buffer: Buffer,
  fileName: string,
  fileSize: number
): Promise<DataSet> {
  const warnings: string[] = [];

  let text: string;
  let numPages: number;
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    text = result.text;
    numPages = result.total;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return emptyDataSet(fileName, fileSize, "pdf", [
      `Failed to parse PDF: ${msg}`,
    ]);
  }

  if (!text || text.trim().length === 0) {
    return emptyDataSet(fileName, fileSize, "pdf", [
      "PDF contains no extractable text. It may be image-based (scanned).",
    ]);
  }

  warnings.push(`Extracted text from ${numPages} page(s)`);

  const tableResult = detectTable(text);

  if (tableResult) {
    warnings.push(
      `Detected table with ${tableResult.headers.length} columns`
    );
    const allRows = tableResult.rows;
    const totalCount = allRows.length;

    if (totalCount > MAX_ROWS) {
      throw new Error(
        `Dataset too large: ${totalCount.toLocaleString()} rows exceeds the ${MAX_ROWS.toLocaleString()} row limit.`
      );
    }

    const previewRows = allRows.slice(0, DEFAULT_MAX_PREVIEW);
    const columns = buildColumns(previewRows, tableResult.headers);

    return {
      columns,
      rows: previewRows,
      rowCount: totalCount,
      metadata: {
        source: fileName,
        fileSize,
        fileType: "pdf",
        parseWarnings: warnings,
      },
    };
  }

  warnings.push(
    "No tabular data detected. Extracted text as paragraphs for text analysis."
  );

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);

  const rows: Record<string, unknown>[] = paragraphs
    .slice(0, MAX_ROWS)
    .map((t, i) => ({
      paragraph_number: i + 1,
      text: t,
      word_count: t.split(/\s+/).length,
    }));

  const previewRows = rows.slice(0, DEFAULT_MAX_PREVIEW);
  const columns = buildColumns(previewRows, [
    "paragraph_number",
    "text",
    "word_count",
  ]);

  return {
    columns,
    rows: previewRows,
    rowCount: rows.length,
    metadata: {
      source: fileName,
      fileSize,
      fileType: "pdf",
      parseWarnings: warnings,
    },
  };
}

interface TableDetection {
  headers: string[];
  rows: Record<string, unknown>[];
}

/**
 *detect tabular data in extracted PDF text.
 *looks for lines that split into a consistent number of columns
 *using common separators (multiple spaces, tabs, pipes).
 */
function detectTable(text: string): TableDetection | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return null;

  const separators = [/\s{2,}/, /\t+/, /\s*\|\s*/];

  for (const sep of separators) {
    const splitLines = lines.map((line) =>
      line.split(sep).map((cell) => cell.trim()).filter((cell) => cell.length > 0)
    );

    const countMap = new Map<number, number>();
    for (const parts of splitLines) {
      if (parts.length > 1) {
        countMap.set(parts.length, (countMap.get(parts.length) ?? 0) + 1);
      }
    }

    if (countMap.size === 0) continue;

    let bestCount = 0;
    let bestFreq = 0;
    for (const [count, freq] of countMap) {
      if (freq > bestFreq) {
        bestFreq = freq;
        bestCount = count;
      }
    }

    if (bestFreq < 3) continue;

    const matchingLines = splitLines.filter((parts) => parts.length === bestCount);

    const headers = matchingLines[0];
    const dataLines = matchingLines.slice(1);

    //verify headers look like column names (not all numeric)
    const numericHeaders = headers.filter((h) => !isNaN(Number(h)));
    if (numericHeaders.length === headers.length) continue;

    const rows: Record<string, unknown>[] = dataLines.map((parts) => {
      const row: Record<string, unknown> = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i]] = parts[i] ?? null;
      }
      return row;
    });

    if (rows.length > 0) {
      return { headers, rows };
    }
  }

  return null;
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
