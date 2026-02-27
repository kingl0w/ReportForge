export type ColumnType = "string" | "number" | "date" | "currency" | "percentage" | "boolean";

export interface Column {
  name: string;
  /*original name before normalization*/
  originalName: string;
  type: ColumnType;
  /*up to 5 non-null sample values*/
  sampleValues: unknown[];
  nullCount: number;
}

export interface DataSet {
  columns: Column[];
  rows: Record<string, unknown>[];
  rowCount: number;
  metadata: DataSetMetadata;
}

export interface DataSetMetadata {
  source: string;
  fileSize: number;
  fileType: string;
  parseWarnings: string[];
  sheetNames?: string[];
  selectedSheet?: string;
  sampled?: boolean;
  samplingNote?: string;
}

export type DataSourceType =
  | "csv"
  | "excel"
  | "json"
  | "pdf"
  | "docx"
  | "txt"
  | "shopify"
  | "ebay"
  | "google_analytics"
  | "custom_api";

export type CombineStrategy = "append" | "merge" | "auto" | "smart";

export interface SmartCombineOptions {
  /*pivot wide-format date columns to long format (Date | Value)*/
  pivotDates?: boolean;
  /*max rows before truncation warning (default 50_000)*/
  rowLimit?: number;
  /*aggregate city-level data to state level*/
  aggregateToState?: boolean;
}

export interface SchemaInfo {
  source: string;
  columns: string[];
  rowCount: number;
  /*sorted column names joined*/
  fingerprint: string;
}

export interface SchemaComparison {
  schemas: SchemaInfo[];
  /*columns that appear in ALL files*/
  sharedColumns: string[];
  /*columns unique to specific files*/
  uniqueColumns: Map<string, string[]>;
  /*auto-detected key columns (shared + matching values)*/
  detectedKeys: string[];
  hasWideDateColumns: boolean;
  /*files with identical column sets*/
  schemaGroups: SchemaInfo[][];
  estimatedRows: number;
}

export interface UploadResult {
  fileUrl: string;
  /*first 100 rows*/
  preview: DataSet;
}

export interface ParseOptions {
  sheet?: string | number;
  /*max rows to parse for preview (default 100)*/
  maxPreviewRows?: number;
  /*excess rows are truncated with a warning (default 50_000)*/
  rowLimit?: number;
  /*rows exceeding this will be sampled instead of rejected*/
  planRowLimit?: number;
}
