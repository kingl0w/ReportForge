"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { DataSet, CombineStrategy, SmartCombineOptions, SchemaComparison } from "@/types/data";
import { parseFile as legacyParseFile } from "@/lib/reports/data-parser";
import { combineDatasets, analyzeSchemas } from "@/lib/parsers/combiner";
import { isBinaryFormat } from "@/lib/parsers";
import {
  MAX_FILE_SIZE,
  ACCEPTED_EXTENSIONS,
} from "@/lib/utils/validation";

export type UploadStatus = "idle" | "uploading" | "parsing" | "preview" | "ready" | "error";

export interface FileEntry {
  file: File;
  dataSet: DataSet | null;
  error: string | null;
}

export interface UploadState {
  status: UploadStatus;
  progress: number;
  /*first file for backward compat*/
  file: File | null;
  files: FileEntry[];
  /*combined if multiple files*/
  dataSet: DataSet | null;
  fileUrl: string | null;
  fileUrls: string[];
  error: string | null;
  combineStrategy: CombineStrategy;
  schemaComparison: SchemaComparison | null;
  smartOptions: SmartCombineOptions;
}

const INITIAL_STATE: UploadState = {
  status: "idle",
  progress: 0,
  file: null,
  files: [],
  dataSet: null,
  fileUrl: null,
  fileUrls: [],
  error: null,
  combineStrategy: "auto",
  schemaComparison: null,
  smartOptions: {},
};

export function useFileUpload(options?: { maxFileSize?: number }) {
  const maxSize = options?.maxFileSize ?? MAX_FILE_SIZE;
  const [state, setState] = useState<UploadState>(INITIAL_STATE);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  /*re-combine datasets with current strategy + options. Shared by
   * setCombineStrategy, setSmartOptions, and removeFile.*/
  const recombine = useCallback(
    (
      entries: FileEntry[],
      strategy: CombineStrategy,
      opts: SmartCombineOptions
    ): DataSet | null => {
      const parsedDataSets = entries
        .map((f) => f.dataSet)
        .filter((ds): ds is DataSet => ds !== null);

      if (parsedDataSets.length === 0) return null;
      if (parsedDataSets.length === 1) return parsedDataSets[0];
      return combineDatasets(parsedDataSets, strategy, opts);
    },
    []
  );

  const setCombineStrategy = useCallback((strategy: CombineStrategy) => {
    setState((s) => {
      if (s.combineStrategy === strategy) return s;
      const combined = recombine(s.files, strategy, s.smartOptions);
      return { ...s, combineStrategy: strategy, dataSet: combined ?? s.dataSet };
    });
  }, [recombine]);

  const setSmartOptions = useCallback((opts: Partial<SmartCombineOptions>) => {
    setState((s) => {
      const merged = { ...s.smartOptions, ...opts };
      const combined = recombine(s.files, s.combineStrategy, merged);
      return { ...s, smartOptions: merged, dataSet: combined ?? s.dataSet };
    });
  }, [recombine]);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const limitMB = (maxSize / (1024 * 1024)).toFixed(0);
      return `File is too large (${sizeMB} MB). Maximum is ${limitMB} MB.`;
    }

    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])) {
      return `Unsupported file type (${ext}). Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`;
    }

    return null;
  }, [maxSize]);

  const processFile = useCallback(async (file: File) => {
    await processFiles([file]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processFiles = useCallback(async (newFiles: File[]) => {
    if (newFiles.length === 0) return;

    for (const file of newFiles) {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(`${file.name}: ${validationError}`);
        setState((s) => ({
          ...s,
          status: "error",
          error: validationError,
          file: file,
        }));
        return;
      }
    }

    setState((s) => ({
      ...s,
      status: "uploading",
      progress: 0,
      file: newFiles[0],
      files: newFiles.map((f) => ({ file: f, dataSet: null, error: null })),
      error: null,
      dataSet: null,
      fileUrl: null,
      fileUrls: [],
      schemaComparison: null,
    }));

    try {
      const fileEntries: FileEntry[] = [];
      const total = newFiles.length;

      for (let i = 0; i < total; i++) {
        const file = newFiles[i];
        const progressBase = Math.round((i / total) * 100);

        setState((s) => ({ ...s, progress: progressBase }));

        const content = await readFileContent(file, (p) => {
          setState((s) => ({
            ...s,
            progress: progressBase + Math.round(p / total),
          }));
        });

        setState((s) => ({ ...s, status: "parsing" }));

        let dataSet: DataSet;
        try {
          const ext = file.name.split(".").pop()?.toLowerCase();
          if (ext === "pdf" || ext === "docx") {
            dataSet = {
              columns: [],
              rows: [],
              rowCount: 0,
              metadata: {
                source: file.name,
                fileSize: file.size,
                fileType: ext,
                parseWarnings: [
                  `${ext.toUpperCase()} files will be parsed on the server after upload.`,
                ],
              },
            };
          } else {
            dataSet = legacyParseFile(content, file.name, file.size);
          }

          fileEntries.push({ file, dataSet, error: null });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Parse error";
          fileEntries.push({ file, dataSet: null, error: msg });
        }
      }

      const successEntries = fileEntries.filter((e) => e.dataSet !== null);
      const failedEntries = fileEntries.filter((e) => e.error !== null);

      if (successEntries.length === 0) {
        const firstError = failedEntries[0]?.error ?? "Failed to parse files";
        setState((s) => ({
          ...s,
          status: "error",
          error: `Could not parse file: ${firstError}`,
          files: fileEntries,
        }));
        return;
      }

      if (failedEntries.length > 0) {
        for (const entry of failedEntries) {
          toast.error(`${entry.file.name}: ${entry.error}`);
        }
      }

      const parsedDataSets = successEntries
        .map((e) => e.dataSet)
        .filter((ds): ds is DataSet => ds !== null);

      let schemaComparison: SchemaComparison | null = null;
      if (parsedDataSets.length > 1) {
        schemaComparison = analyzeSchemas(parsedDataSets);
      }

      //use "smart" if multiple schema groups detected
      let effectiveStrategy = state.combineStrategy;
      if (
        effectiveStrategy === "auto" &&
        schemaComparison &&
        schemaComparison.schemaGroups.length > 1
      ) {
        effectiveStrategy = "smart";
      }

      let combined: DataSet;
      if (parsedDataSets.length === 1) {
        combined = parsedDataSets[0];
      } else {
        combined = combineDatasets(parsedDataSets, effectiveStrategy, state.smartOptions);
      }

      if (combined.rowCount === 0 && combined.metadata.parseWarnings.length > 0) {
        const firstWarning = combined.metadata.parseWarnings[0];
        setState((s) => ({
          ...s,
          status: "error",
          error: `Could not parse file: ${firstWarning}`,
          files: fileEntries,
          dataSet: null,
        }));
        return;
      }

      if (combined.columns.length === 0) {
        setState((s) => ({
          ...s,
          status: "error",
          error: "No data columns found. Check that the file has headers and data rows.",
          files: fileEntries,
          dataSet: null,
        }));
        return;
      }

      setState((s) => ({
        ...s,
        status: "preview",
        files: fileEntries,
        dataSet: combined,
        schemaComparison,
        combineStrategy: effectiveStrategy,
        progress: 100,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        status: "error",
        error: friendlyError(err),
      }));
    }
  }, [validateFile, state.combineStrategy, state.smartOptions]);

  const removeFile = useCallback((index: number) => {
    setState((s) => {
      const newFiles = s.files.filter((_, i) => i !== index);

      if (newFiles.length === 0) return INITIAL_STATE;

      const parsedDataSets = newFiles
        .map((f) => f.dataSet)
        .filter((ds): ds is DataSet => ds !== null);

      let schemaComparison: SchemaComparison | null = null;
      if (parsedDataSets.length > 1) {
        schemaComparison = analyzeSchemas(parsedDataSets);
      }

      const combined = recombine(newFiles, s.combineStrategy, s.smartOptions);

      return {
        ...s,
        files: newFiles,
        file: newFiles[0]?.file ?? null,
        dataSet: combined,
        schemaComparison,
        status: combined ? "preview" : "error",
        error: combined ? null : "No parseable files remaining",
      };
    });
  }, [recombine]);

  const confirmUpload = useCallback(async (): Promise<string | null> => {
    const filesToUpload = state.files.map((e) => e.file);
    if (filesToUpload.length === 0 || !state.dataSet) return null;

    setState((s) => ({ ...s, status: "uploading", progress: 0 }));

    try {
      const formData = new FormData();
      for (const file of filesToUpload) {
        formData.append("files", file);
      }
      formData.append("combineStrategy", state.combineStrategy);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          (body as { error?: string } | null)?.error ?? `Upload failed (${response.status})`;
        console.error("[useFileUpload] Upload failed:", message);
        toast.error(message);
        setState((s) => ({ ...s, status: "error", error: message }));
        return null;
      }

      const data = await response.json() as {
        fileUrl: string;
        fileUrls: string[];
        combinedData?: DataSet;
      };

      if (data.combinedData) {
        setState((s) => ({
          ...s,
          status: "ready",
          fileUrl: data.fileUrl,
          fileUrls: data.fileUrls,
          dataSet: data.combinedData ?? s.dataSet,
          progress: 100,
        }));
      } else {
        setState((s) => ({
          ...s,
          status: "ready",
          fileUrl: data.fileUrl,
          fileUrls: data.fileUrls,
          progress: 100,
        }));
      }

      toast.success("File uploaded and ready for analysis.");
      return data.fileUrl;
    } catch (err) {
      console.error("[useFileUpload] Upload error:", err);
      setState((s) => ({
        ...s,
        status: "error",
        error: friendlyError(err),
      }));
      return null;
    }
  }, [state.files, state.dataSet, state.combineStrategy]);

  return {
    ...state,
    processFile,
    processFiles,
    removeFile,
    confirmUpload,
    reset,
    setCombineStrategy,
    setSmartOptions,
  };
}

function readFileContent(
  file: File,
  onProgress: (percent: number) => void
): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    reader.onload = () => {
      if (reader.result === null) {
        reject(new Error("File read returned null"));
        return;
      }
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    if (isBinaryFormat(file.name)) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });
}

function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.includes("Failed to fetch")) {
      return "Network error — check your connection and try again.";
    }
    return err.message;
  }
  return "An unexpected error occurred. Please try again.";
}
