import { z } from "zod/v4";

export const ACCEPTED_FILE_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/json",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/tab-separated-values",
] as const;

export const ACCEPTED_EXTENSIONS = [
  ".csv",
  ".xlsx",
  ".xls",
  ".xlsm",
  ".json",
  ".pdf",
  ".docx",
  ".txt",
  ".tsv",
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const fileUploadSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileSize: z
    .number()
    .positive("File size must be positive")
    .max(MAX_FILE_SIZE, "File must be under 10 MB"),
  fileType: z.string().min(1, "File type is required"),
});

export const columnTypeSchema = z.enum([
  "string",
  "number",
  "date",
  "currency",
  "percentage",
  "boolean",
]);

export const columnSchema = z.object({
  name: z.string().min(1),
  originalName: z.string().min(1),
  type: columnTypeSchema,
  sampleValues: z.array(z.unknown()),
  nullCount: z.number().int().min(0),
});

export const dataSetMetadataSchema = z.object({
  source: z.string(),
  fileSize: z.number().int().min(0),
  fileType: z.string(),
  parseWarnings: z.array(z.string()),
  sheetNames: z.array(z.string()).optional(),
  selectedSheet: z.string().optional(),
});

export const dataSetSchema = z.object({
  columns: z.array(columnSchema),
  rows: z.array(z.record(z.string(), z.unknown())),
  rowCount: z.number().int().min(0),
  metadata: dataSetMetadataSchema,
});

export const uploadResponseSchema = z.object({
  fileUrl: z.string().url(),
  preview: dataSetSchema,
});

export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.unknown().optional(),
});

export const aggregateOptionsSchema = z.object({
  groupBy: z.string().min(1),
  metric: z.string().min(1),
  operation: z.enum(["sum", "avg", "count", "min", "max"]),
});

export const trendOptionsSchema = z.object({
  dateColumn: z.string().min(1),
  valueColumn: z.string().min(1),
  periods: z.number().int().positive().optional(),
});
