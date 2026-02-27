import type { DataSet } from "@/types/data";
import { buildColumns } from "@/lib/utils/data-transforms";

const MAX_ROWS = 10_000;
const DEFAULT_MAX_PREVIEW = 100;

interface MammothTable {
  headers: string[];
  rows: Record<string, unknown>[];
}

/**
 *extracts HTML via mammoth, looks for <table> elements and parses them
 *into structured rows. Falls back to text paragraphs if no tables found.
 */
export async function parseDOCX(
  buffer: Buffer,
  fileName: string,
  fileSize: number
): Promise<DataSet> {
  const warnings: string[] = [];

  let html: string;
  let messages: Array<{ type: string; message: string }>;
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml({ buffer });
    html = result.value;
    messages = result.messages;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return emptyDataSet(fileName, fileSize, "docx", [
      `Failed to parse DOCX: ${msg}`,
    ]);
  }

  for (const msg of messages) {
    if (msg.type === "warning") {
      warnings.push(msg.message);
    }
  }

  const tables = extractTables(html);

  if (tables.length > 0) {
    if (tables.length > 1) {
      warnings.push(
        `Document contains ${tables.length} tables. Using the largest one.`
      );
    }

    const bestTable = tables.reduce((a, b) =>
      a.rows.length >= b.rows.length ? a : b
    );

    warnings.push(
      `Extracted table with ${bestTable.headers.length} columns and ${bestTable.rows.length} rows`
    );

    const totalCount = bestTable.rows.length;

    if (totalCount > MAX_ROWS) {
      throw new Error(
        `Dataset too large: ${totalCount.toLocaleString()} rows exceeds the ${MAX_ROWS.toLocaleString()} row limit.`
      );
    }

    const previewRows = bestTable.rows.slice(0, DEFAULT_MAX_PREVIEW);
    const columns = buildColumns(previewRows, bestTable.headers);

    return {
      columns,
      rows: previewRows,
      rowCount: totalCount,
      metadata: {
        source: fileName,
        fileSize,
        fileType: "docx",
        parseWarnings: warnings,
      },
    };
  }

  warnings.push(
    "No tables found in document. Extracted text as paragraphs for text analysis."
  );

  const textContent = stripHTML(html);
  const paragraphs = textContent
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) {
    return emptyDataSet(fileName, fileSize, "docx", [
      ...warnings,
      "Document appears to be empty.",
    ]);
  }

  const rows: Record<string, unknown>[] = paragraphs
    .slice(0, MAX_ROWS)
    .map((text, i) => ({
      paragraph_number: i + 1,
      text,
      word_count: text.split(/\s+/).length,
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
      fileType: "docx",
      parseWarnings: warnings,
    },
  };
}

/**
 *regex-based HTML table extraction to avoid a DOM dependency in Node.js.
 */
function extractTables(html: string): MammothTable[] {
  const tables: MammothTable[] = [];
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;

  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableHTML = tableMatch[1];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const parsedRows: string[][] = [];

    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowRegex.exec(tableHTML)) !== null) {
      const rowHTML = rowMatch[1];
      const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
      const cells: string[] = [];

      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellRegex.exec(rowHTML)) !== null) {
        cells.push(stripHTML(cellMatch[1]).trim());
      }

      if (cells.length > 0) {
        parsedRows.push(cells);
      }
    }

    if (parsedRows.length < 2) continue;

    const headers = parsedRows[0];
    const dataRows = parsedRows.slice(1);

    const rows: Record<string, unknown>[] = dataRows.map((cells) => {
      const row: Record<string, unknown> = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i] || `column_${i + 1}`] = cells[i] ?? null;
      }
      return row;
    });

    if (rows.length > 0) {
      tables.push({ headers, rows });
    }
  }

  return tables;
}

/**
 *strip HTML tags, converting to plain text.
 */
function stripHTML(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
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
