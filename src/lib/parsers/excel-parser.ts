import * as XLSX from "xlsx";
import type { DataSet, ParseOptions } from "@/types/data";
import { buildColumns } from "@/lib/utils/data-transforms";

const DEFAULT_MAX_PREVIEW = 100;
const MAX_ROWS = 10_000;

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

  if (totalCount > MAX_ROWS) {
    throw new Error(
      `Dataset too large: ${totalCount.toLocaleString()} rows exceeds the ${MAX_ROWS.toLocaleString()} row limit. Please reduce your dataset and try again.`
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
