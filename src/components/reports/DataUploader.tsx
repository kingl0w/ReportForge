"use client";

import { useCallback, useRef, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  FileText,
  FileType,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Layers,
  ArrowDownUp,
  CalendarRange,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFileUpload } from "@/hooks/useFileUpload";
import { ACCEPTED_EXTENSIONS } from "@/lib/utils/validation";
import type { DataSet, Column, ColumnType, SchemaComparison } from "@/types/data";
import { cn } from "@/lib/utils";

const ACCEPT_STRING = ACCEPTED_EXTENSIONS.join(",");
const PREVIEW_ROWS = 10;

interface DataUploaderProps {
  onDataReady?: (dataSet: DataSet, fileUrl: string | null) => void;
  /**plan-based limits for display -- passed from ReportWizard*/
  planLimits?: { maxFileSize: number; maxRows: number };
}

export default function DataUploader({ onDataReady, planLimits }: DataUploaderProps) {
  const {
    status,
    progress,
    file,
    files,
    dataSet,
    error,
    combineStrategy,
    schemaComparison,
    smartOptions,
    processFile,
    processFiles,
    removeFile,
    confirmUpload,
    reset,
    setCombineStrategy,
    setSmartOptions,
  } = useFileUpload();

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length === 1) {
        processFile(droppedFiles[0]);
      } else if (droppedFiles.length > 1) {
        processFiles(droppedFiles);
      }
    },
    [processFile, processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files ?? []);
      if (selectedFiles.length === 1) {
        processFile(selectedFiles[0]);
      } else if (selectedFiles.length > 1) {
        processFiles(selectedFiles);
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [processFile, processFiles]
  );

  const handleConfirm = useCallback(async () => {
    const url = await confirmUpload();
    if (dataSet) {
      onDataReady?.(dataSet, url);
    }
  }, [confirmUpload, dataSet, onDataReady]);

  const handleUsePreview = useCallback(() => {
    if (dataSet) {
      onDataReady?.(dataSet, null);
    }
  }, [dataSet, onDataReady]);

  if (status === "idle") {
    return (
      <Card className="bg-card">
        <CardContent className="pt-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors",
              dragOver
                ? "border-blue-500 bg-blue-600/5"
                : "border-border hover:border-muted-foreground/50 hover:bg-accent/30"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_STRING}
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10">
              <Upload className="h-7 w-7 text-blue-500" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">
              Drop your files here, or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              CSV, Excel, PDF, Word, JSON, or TXT &mdash; up to{" "}
              {planLimits ? `${(planLimits.maxFileSize / (1024 * 1024)).toFixed(0)} MB` : "10 MB"} per file
              {planLimits && ` \u00b7 ${planLimits.maxRows.toLocaleString()} rows`}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <FileIcon ext="csv" />
              <FileIcon ext="xlsx" />
              <FileIcon ext="json" />
              <FileIcon ext="pdf" />
              <FileIcon ext="docx" />
              <FileIcon ext="txt" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "uploading" || status === "parsing") {
    return (
      <Card className="bg-card">
        <CardContent className="flex flex-col items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-4 text-sm font-medium text-foreground">
            {status === "uploading" ? "Reading file..." : "Parsing data..."}
          </p>
          {file && (
            <p className="mt-1 text-xs text-muted-foreground">
              {files.length > 1
                ? `Processing ${files.length} files...`
                : file.name}
            </p>
          )}
          <Progress value={progress} className="mt-4 w-64" />
          <p className="mt-1 text-xs text-muted-foreground">{progress}%</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="border-destructive/50 bg-card">
        <CardContent className="flex flex-col items-center py-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">
            Upload failed
          </p>
          <p className="mt-1 max-w-md text-center text-sm text-muted-foreground">
            {error}
          </p>
          <Button onClick={reset} className="mt-4 bg-white/10 border border-white/20 text-white hover:bg-white/20">
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if ((status === "preview" || status === "ready") && dataSet) {
    const multiFile = files.filter((f) => f.dataSet !== null).length > 1;

    return (
      <div className="space-y-4">
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="space-y-3">
              {files.map((entry, index) => (
                <div
                  key={`${entry.file.name}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <FileTypeIcon fileName={entry.file.name} />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {entry.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(entry.file.size)}
                        {entry.dataSet && (
                          <>
                            {" "}&middot; {entry.dataSet.rowCount.toLocaleString()} rows
                            {" "}&middot; {entry.dataSet.columns.length} columns
                          </>
                        )}
                        {entry.error && (
                          <span className="text-destructive"> &middot; {entry.error}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.error && (
                      <Badge className="bg-destructive/20 text-destructive">
                        Error
                      </Badge>
                    )}
                    {status === "ready" && !entry.error && (
                      <Badge className="gap-1 bg-emerald-600/20 text-emerald-500">
                        <CheckCircle2 className="h-3 w-3" />
                        Uploaded
                      </Badge>
                    )}
                    {status === "preview" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 dark:hover:bg-white/10"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-3.5 w-3.5" />
                        <span className="sr-only">Remove file</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {multiFile && schemaComparison && status === "preview" && (
          <SchemaComparisonCard comparison={schemaComparison} />
        )}

        {multiFile && status === "preview" && (
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Layers className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-foreground">Combine Strategy</span>
                </div>
                {schemaComparison && (
                  <span className="text-xs text-muted-foreground">
                    Est. {schemaComparison.estimatedRows.toLocaleString()} combined rows
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STRATEGY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCombineStrategy(opt.value)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors",
                      combineStrategy === opt.value
                        ? "border-blue-500 bg-blue-600/10"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <p className="text-xs font-medium text-foreground">{opt.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {combineStrategy === "smart" && schemaComparison && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {schemaComparison.hasWideDateColumns && (
                    <ToggleChip
                      icon={<CalendarRange className="h-3 w-3" />}
                      label="Pivot date columns to long format"
                      active={!!smartOptions.pivotDates}
                      onClick={() => setSmartOptions({ pivotDates: !smartOptions.pivotDates })}
                    />
                  )}
                  <ToggleChip
                    icon={<MapPin className="h-3 w-3" />}
                    label="Aggregate to state level"
                    active={!!smartOptions.aggregateToState}
                    onClick={() => setSmartOptions({ aggregateToState: !smartOptions.aggregateToState })}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {dataSet.metadata.sampled && dataSet.metadata.samplingNote && (
          <Card className="border-amber-500/30 bg-card">
            <CardContent className="pt-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-xs font-medium text-amber-400">Data was sampled</p>
                  <p className="mt-0.5 text-xs text-amber-500/80">{dataSet.metadata.samplingNote}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {dataSet.metadata.parseWarnings.length > 0 && (
          <Card className="border-yellow-500/30 bg-card">
            <CardContent className="pt-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                <div className="space-y-1">
                  {dataSet.metadata.parseWarnings.map((w, i) => (
                    <p key={i} className="text-xs text-yellow-500">
                      {w}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-sm text-foreground">
              Column Summary
              {multiFile && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (combined &middot; {dataSet.columns.length} columns &middot; {dataSet.rowCount.toLocaleString()} rows)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {dataSet.columns.map((col) => (
                <ColumnBadge key={col.name} column={col} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-foreground">
              Data Preview
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (first {Math.min(PREVIEW_ROWS, dataSet.rows.length)} of{" "}
                {dataSet.rowCount.toLocaleString()} rows)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    {dataSet.columns.map((col) => (
                      <TableHead
                        key={col.name}
                        className="text-xs text-muted-foreground"
                      >
                        {col.originalName}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataSet.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                    <TableRow key={i} className="border-border hover:bg-accent/30">
                      {dataSet.columns.map((col) => (
                        <TableCell
                          key={col.name}
                          className="max-w-[200px] truncate text-xs text-foreground"
                        >
                          {formatCellValue(row[col.originalName])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {status === "preview" && (
          <div className="flex justify-end gap-3">
            <Button className="bg-white/10 border border-white/20 text-white hover:bg-white/20" onClick={reset}>
              Choose different file
            </Button>
            <Button className="bg-white/10 border border-white/20 text-white hover:bg-white/20" onClick={handleUsePreview}>
              Use without uploading
            </Button>
            <Button
              className="bg-blue-600 text-white font-medium hover:bg-blue-500"
              onClick={handleConfirm}
            >
              Upload &amp; continue
            </Button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

const STRATEGY_OPTIONS = [
  {
    value: "auto" as const,
    label: "Auto",
    desc: "Auto-detect best strategy",
  },
  {
    value: "smart" as const,
    label: "Smart (recommended)",
    desc: "Group, join, and optionally pivot",
  },
  {
    value: "append" as const,
    label: "Stack Rows",
    desc: "Combine rows vertically",
  },
  {
    value: "merge" as const,
    label: "Merge on Key",
    desc: "Join on matching columns",
  },
];

function SchemaComparisonCard({ comparison }: { comparison: SchemaComparison }) {
  const { schemas, sharedColumns, detectedKeys, hasWideDateColumns, schemaGroups } = comparison;
  const sharedSet = new Set(sharedColumns);
  const keySet = new Set(detectedKeys);

  const allColumns = new Set<string>();
  for (const s of schemas) {
    for (const col of s.columns) allColumns.add(col);
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm text-foreground">
            <ArrowDownUp className="h-4 w-4 text-blue-500" />
            Schema Comparison
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{schemaGroups.length} schema group{schemaGroups.length > 1 ? "s" : ""}</span>
            <span>{sharedColumns.length} shared column{sharedColumns.length !== 1 ? "s" : ""}</span>
            {detectedKeys.length > 0 && (
              <span className="text-emerald-500">{detectedKeys.length} key{detectedKeys.length !== 1 ? "s" : ""} detected</span>
            )}
            {hasWideDateColumns && (
              <span className="text-purple-400">date columns detected</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="sticky left-0 bg-card text-xs text-muted-foreground">
                  Column
                </TableHead>
                {schemas.map((s, i) => (
                  <TableHead key={i} className="text-xs text-muted-foreground">
                    <div className="max-w-[140px] truncate" title={s.source}>
                      {s.source}
                    </div>
                    <div className="font-normal text-muted-foreground/60">
                      {s.rowCount.toLocaleString()} rows
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(allColumns).map((col) => {
                const isShared = sharedSet.has(col);
                const isKey = keySet.has(col);

                return (
                  <TableRow
                    key={col}
                    className={cn(
                      "border-border hover:bg-accent/30",
                      isKey && "bg-emerald-500/5",
                      isShared && !isKey && "bg-blue-500/5"
                    )}
                  >
                    <TableCell className="sticky left-0 bg-card text-xs font-medium text-foreground">
                      <span className="flex items-center gap-1.5">
                        {col}
                        {isKey && (
                          <Badge className="bg-emerald-600/20 px-1.5 py-0 text-[10px] text-emerald-500">
                            key
                          </Badge>
                        )}
                        {isShared && !isKey && (
                          <Badge className="bg-blue-600/20 px-1.5 py-0 text-[10px] text-blue-400">
                            shared
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    {schemas.map((s, i) => {
                      const has = s.columns.includes(col);
                      return (
                        <TableCell key={i} className="text-center text-xs">
                          {has ? (
                            <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <span className="text-muted-foreground/30">&mdash;</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleChip({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-blue-500 bg-blue-600/10 text-blue-400"
          : "border-border text-muted-foreground hover:border-muted-foreground/50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function FileIcon({ ext }: { ext: string }) {
  return (
    <span className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
      {ext === "csv" && <FileText className="h-3 w-3" />}
      {ext === "xlsx" && <FileSpreadsheet className="h-3 w-3" />}
      {ext === "json" && <FileJson className="h-3 w-3" />}
      {ext === "pdf" && <FileType className="h-3 w-3" />}
      {ext === "docx" && <FileText className="h-3 w-3" />}
      {ext === "txt" && <FileText className="h-3 w-3" />}
      .{ext}
    </span>
  );
}

function FileTypeIcon({ fileName }: { fileName: string }) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const iconClass = "h-5 w-5 text-blue-500";

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10">
      {ext === "csv" && <FileText className={iconClass} />}
      {(ext === "xlsx" || ext === "xls" || ext === "xlsm") && (
        <FileSpreadsheet className={iconClass} />
      )}
      {ext === "json" && <FileJson className={iconClass} />}
      {ext === "pdf" && <FileType className={iconClass} />}
      {ext === "docx" && <FileText className={iconClass} />}
      {ext === "txt" && <FileText className={iconClass} />}
      {ext === "tsv" && <FileText className={iconClass} />}
      {!["csv", "xlsx", "xls", "xlsm", "json", "pdf", "docx", "txt", "tsv"].includes(ext ?? "") && (
        <FileText className={iconClass} />
      )}
    </div>
  );
}

const TYPE_COLORS: Record<ColumnType, string> = {
  string: "bg-slate-500/20 text-slate-400",
  number: "bg-blue-500/20 text-blue-400",
  date: "bg-purple-500/20 text-purple-400",
  currency: "bg-emerald-500/20 text-emerald-400",
  percentage: "bg-amber-500/20 text-amber-400",
  boolean: "bg-pink-500/20 text-pink-400",
};

function ColumnBadge({ column }: { column: Column }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
        TYPE_COLORS[column.type]
      )}
    >
      <span className="text-foreground">{column.originalName}</span>
      <span className="opacity-70">{column.type}</span>
      {column.nullCount > 0 && (
        <span className="opacity-50">({column.nullCount} null)</span>
      )}
    </span>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCellValue(value: unknown): string {
  if (value == null) return "\u2014";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
