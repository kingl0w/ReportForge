import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { DataSet, ParseOptions } from "@/types/data";
import { buildColumns } from "@/lib/utils/data-transforms";
import { sampleRows } from "@/lib/parsers/sampler";

const DEFAULT_MAX_PREVIEW = 100;
/**absolute hard cap -- prevents OOM regardless of plan*/
const ABSOLUTE_MAX_ROWS = 500_000;

export function parseCSV(
  text: string,
  fileName: string,
  fileSize: number,
  options?: ParseOptions
): DataSet {
  const maxRows = options?.maxPreviewRows ?? DEFAULT_MAX_PREVIEW;
  const warnings: string[] = [];

  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: "greedy",
    transformHeader: (h: string) => h.trim(),
  });

  if (result.errors.length > 0) {
    for (const err of result.errors.slice(0, 10)) {
      warnings.push(
        `Row ${err.row ?? "?"}: ${err.message}`
      );
    }
  }

  const allRows = result.data;
  const totalCount = allRows.length;

  if (totalCount > ABSOLUTE_MAX_ROWS) {
    throw new Error(
      `Dataset too large: ${totalCount.toLocaleString()} rows exceeds the absolute ${ABSOLUTE_MAX_ROWS.toLocaleString()} row limit.`
    );
  }

  const previewRows = allRows.slice(0, maxRows);

  if (previewRows.length === 0) {
    return emptyDataSet(fileName, fileSize, "csv", warnings);
  }

  const originalNames = result.meta.fields ?? Object.keys(previewRows[0]);
  const columns = buildColumns(previewRows, originalNames);

  const planLimit = options?.planRowLimit;
  if (planLimit && totalCount > planLimit) {
    const sampled = sampleRows(allRows, columns, { targetRows: planLimit });
    const sampledColumns = buildColumns(sampled.rows, originalNames);
    return {
      columns: sampledColumns,
      rows: sampled.rows,
      rowCount: totalCount,
      metadata: {
        source: fileName,
        fileSize,
        fileType: "csv",
        parseWarnings: warnings,
        sampled: true,
        samplingNote: sampled.samplingNote,
      },
    };
  }

  return {
    columns,
    rows: previewRows,
    rowCount: totalCount,
    metadata: {
      source: fileName,
      fileSize,
      fileType: "csv",
      parseWarnings: warnings,
    },
  };
}

export function parseExcel(
  buffer: ArrayBuffer,
  fileName: string,
  fileSize: number,
  options?: ParseOptions
): DataSet {
  const maxRows = options?.maxPreviewRows ?? DEFAULT_MAX_PREVIEW;
  const warnings: string[] = [];

  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    return emptyDataSet(fileName, fileSize, "excel", [
      "Workbook contains no sheets",
    ]);
  }

  let sheetName: string;
  if (options?.sheet != null) {
    if (typeof options.sheet === "number") {
      sheetName = sheetNames[options.sheet] ?? sheetNames[0];
    } else {
      sheetName = sheetNames.includes(options.sheet)
        ? options.sheet
        : sheetNames[0];
      if (sheetName !== options.sheet) {
        warnings.push(
          `Sheet "${options.sheet}" not found, using "${sheetName}" instead`
        );
      }
    }
  } else {
    sheetName = sheetNames[0];
  }

  if (sheetNames.length > 1) {
    warnings.push(
      `Workbook has ${sheetNames.length} sheets. Using "${sheetName}".`
    );
  }

  const sheet = workbook.Sheets[sheetName];
  const allRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });
  const totalCount = allRows.length;

  if (totalCount > ABSOLUTE_MAX_ROWS) {
    throw new Error(
      `Dataset too large: ${totalCount.toLocaleString()} rows exceeds the absolute ${ABSOLUTE_MAX_ROWS.toLocaleString()} row limit.`
    );
  }

  const previewRows = allRows.slice(0, maxRows);

  if (previewRows.length === 0) {
    return emptyDataSet(fileName, fileSize, "excel", [
      ...warnings,
      `Sheet "${sheetName}" is empty`,
    ]);
  }

  const originalNames = Object.keys(previewRows[0]);
  const columns = buildColumns(previewRows, originalNames);

  const planLimit = options?.planRowLimit;
  if (planLimit && totalCount > planLimit) {
    const sampled = sampleRows(allRows, columns, { targetRows: planLimit });
    const sampledColumns = buildColumns(sampled.rows, originalNames);
    return {
      columns: sampledColumns,
      rows: sampled.rows,
      rowCount: totalCount,
      metadata: {
        source: fileName,
        fileSize,
        fileType: "excel",
        parseWarnings: warnings,
        sheetNames,
        selectedSheet: sheetName,
        sampled: true,
        samplingNote: sampled.samplingNote,
      },
    };
  }

  return {
    columns,
    rows: previewRows,
    rowCount: totalCount,
    metadata: {
      source: fileName,
      fileSize,
      fileType: "excel",
      parseWarnings: warnings,
      sheetNames,
      selectedSheet: sheetName,
    },
  };
}

export function parseJSON(
  text: string,
  fileName: string,
  fileSize: number,
  options?: ParseOptions
): DataSet {
  const maxRows = options?.maxPreviewRows ?? DEFAULT_MAX_PREVIEW;
  const warnings: string[] = [];

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
      warnings.push("JSON is a single object — treating as one row");
      rows = [flattenObject(obj)];
    }
  } else {
    return emptyDataSet(fileName, fileSize, "json", [
      "JSON must be an array or object",
    ]);
  }

  const totalCount = rows.length;

  if (totalCount > ABSOLUTE_MAX_ROWS) {
    throw new Error(
      `Dataset too large: ${totalCount.toLocaleString()} rows exceeds the absolute ${ABSOLUTE_MAX_ROWS.toLocaleString()} row limit.`
    );
  }

  const previewRows = rows.slice(0, maxRows);

  if (previewRows.length === 0) {
    return emptyDataSet(fileName, fileSize, "json", [
      ...warnings,
      "No data rows found",
    ]);
  }

  //JSON rows may have different keys
  const keySet = new Set<string>();
  for (const row of previewRows) {
    for (const key of Object.keys(row)) keySet.add(key);
  }
  const originalNames = Array.from(keySet);
  const columns = buildColumns(previewRows, originalNames);

  const planLimit = options?.planRowLimit;
  if (planLimit && totalCount > planLimit) {
    const sampled = sampleRows(rows, columns, { targetRows: planLimit });
    const sampledKeySet = new Set<string>();
    for (const row of sampled.rows) {
      for (const key of Object.keys(row)) sampledKeySet.add(key);
    }
    const sampledNames = Array.from(sampledKeySet);
    const sampledColumns = buildColumns(sampled.rows, sampledNames);
    return {
      columns: sampledColumns,
      rows: sampled.rows,
      rowCount: totalCount,
      metadata: {
        source: fileName,
        fileSize,
        fileType: "json",
        parseWarnings: warnings,
        sampled: true,
        samplingNote: sampled.samplingNote,
      },
    };
  }

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

export function parseFile(
  content: string | ArrayBuffer,
  fileName: string,
  fileSize: number,
  options?: ParseOptions
): DataSet {
  const ext = fileName.toLowerCase().split(".").pop();

  switch (ext) {
    case "csv":
      return parseCSV(content as string, fileName, fileSize, options);
    case "xlsx":
    case "xls":
      return parseExcel(content as ArrayBuffer, fileName, fileSize, options);
    case "json":
      return parseJSON(content as string, fileName, fileSize, options);
    default:
      return emptyDataSet(fileName, fileSize, ext ?? "unknown", [
        `Unsupported file type: .${ext}`,
      ]);
  }
}

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
    //store arrays as JSON strings to keep rows flat
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
