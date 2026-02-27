import type { DataSet, ParseOptions } from "@/types/data";
import { parseCSV } from "./csv-parser";
import { parseExcel } from "./excel-parser";
import { parseJSON } from "./json-parser";
import { parseTXT } from "./txt-parser";

function getExtension(fileName: string): string {
  return (fileName.split(".").pop() ?? "").toLowerCase();
}

/**
 *determine whether a file needs to be read as binary (ArrayBuffer/Buffer)
 *rather than text.
 */
export function isBinaryFormat(fileName: string): boolean {
  const ext = getExtension(fileName);
  return ["xlsx", "xls", "xlsm", "pdf", "docx"].includes(ext);
}

/**
 *unified parser that routes to the correct format-specific parser.
 *PDF and DOCX parsing is async (dynamic imports), so this always returns a Promise.
 */
export async function parseFile(
  content: string | ArrayBuffer | Buffer,
  fileName: string,
  fileSize: number,
  options?: ParseOptions
): Promise<DataSet> {
  const ext = getExtension(fileName);

  switch (ext) {
    case "csv":
      return parseCSV(content as string, fileName, fileSize, options);

    case "tsv":
      return parseTXT(content as string, fileName, fileSize, options);

    case "xlsx":
    case "xls":
    case "xlsm": {
      let ab: ArrayBuffer;
      if (content instanceof Buffer) {
        //Buffer.buffer can be SharedArrayBuffer, so copy to a proper ArrayBuffer
        ab = new Uint8Array(content).buffer as ArrayBuffer;
      } else {
        ab = content as ArrayBuffer;
      }
      return parseExcel(ab, fileName, fileSize, options);
    }

    case "json":
      return parseJSON(content as string, fileName, fileSize, options);

    case "pdf": {
      const { parsePDF } = await import("./pdf-parser");
      const buf =
        content instanceof Buffer
          ? content
          : Buffer.from(content as ArrayBuffer);
      return parsePDF(buf, fileName, fileSize);
    }

    case "docx": {
      const { parseDOCX } = await import("./docx-parser");
      const buf =
        content instanceof Buffer
          ? content
          : Buffer.from(content as ArrayBuffer);
      return parseDOCX(buf, fileName, fileSize);
    }

    case "txt":
      return parseTXT(content as string, fileName, fileSize, options);

    default:
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        metadata: {
          source: fileName,
          fileSize,
          fileType: ext || "unknown",
          parseWarnings: [`Unsupported file type: .${ext}`],
        },
      };
  }
}

export { parseCSV } from "./csv-parser";
export { parseExcel } from "./excel-parser";
export { parseJSON } from "./json-parser";
export { parsePDF } from "./pdf-parser";
export { parseDOCX } from "./docx-parser";
export { parseTXT } from "./txt-parser";
export { combineDatasets, analyzeSchemas, pivotWideToLong } from "./combiner";
