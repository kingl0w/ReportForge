"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { ReportStatus } from "@/types/template";

interface GenerationState {
  status: ReportStatus | "IDLE";
  step: number;
  totalSteps: number;
  message: string;
  reportId: string | null;
  fileUrl: string | null;
  error: string | null;
}

const STEP_LABELS: Record<string, string> = {
  QUEUED: "Queued...",
  PARSING: "Parsing your data...",
  PROCESSING: "Processing...",
  ANALYZING: "Running statistical analysis...",
  GENERATING_CHARTS: "Generating visualizations...",
  GENERATING: "Generating report...",
  WRITING_NARRATIVE: "Writing insights...",
  RENDERING: "Rendering PDF...",
  UPLOADING: "Uploading report...",
  COMPLETE: "Report ready!",
  FAILED: "Generation failed",
};

const POLL_INTERVAL_MS = 2000;

export function useReportGeneration() {
  const [state, setState] = useState<GenerationState>({
    status: "IDLE",
    step: 0,
    totalSteps: 6,
    message: "",
    reportId: null,
    fileUrl: null,
    error: null,
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  const pollStatus = useCallback(
    async (reportId: string) => {
      try {
        const res = await fetch(`/api/reports/${reportId}`);
        if (!res.ok || !mountedRef.current) return;

        const data = await res.json();
        if (!mountedRef.current) return;

        const status = data.status as ReportStatus;
        const metadata = data.metadata as {
          step?: number;
          totalSteps?: number;
          message?: string;
        } | null;

        setState((prev) => ({
          ...prev,
          status,
          step: metadata?.step ?? prev.step,
          totalSteps: metadata?.totalSteps ?? 6,
          message: metadata?.message ?? STEP_LABELS[status] ?? "",
          fileUrl: data.fileUrl ?? prev.fileUrl,
          error: data.errorMessage ?? null,
        }));

        if (status === "COMPLETE") {
          toast.success("Report generated successfully!");
          stopPolling();
        } else if (status === "FAILED") {
          toast.error(data.errorMessage ?? "Report generation failed.");
          stopPolling();
        }
      } catch {
        //silently retry on network errors
      }
    },
    [stopPolling]
  );

  const generate = useCallback(
    async (params: {
      title: string;
      rawDataUrl?: string;
      fileName?: string;
      connectionId?: string;
      templateId?: string;
      format?: "pdf" | "docx" | "both";
      brandColor?: string;
    }) => {
      setState({
        status: "QUEUED",
        step: 0,
        totalSteps: 6,
        message: "Starting report generation...",
        reportId: null,
        fileUrl: null,
        error: null,
      });

      try {
        const res = await fetch("/api/reports/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (!res.ok) {
          let errorMsg = `Server error (${res.status})`;
          try {
            const data = await res.json();
            errorMsg = data.error ?? errorMsg;
            if (data.stack) console.error("[generate] Server stack:", data.stack);
          } catch {
            //response wasn't JSON -- probably a Next.js compilation error page
            const text = await res.text().catch(() => "");
            console.error("[generate] Non-JSON error response:", res.status, text.slice(0, 500));
          }
          setState((prev) => ({
            ...prev,
            status: "FAILED",
            error: errorMsg,
            message: errorMsg,
          }));
          return;
        }

        const { reportId } = await res.json();

        setState((prev) => ({
          ...prev,
          reportId,
          message: "Report queued, starting generation...",
        }));

        stopPolling();
        pollRef.current = setInterval(() => pollStatus(reportId), POLL_INTERVAL_MS);
        pollStatus(reportId);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Network error";
        setState((prev) => ({
          ...prev,
          status: "FAILED",
          error: message,
          message,
        }));
      }
    },
    [pollStatus, stopPolling]
  );

  const reset = useCallback(() => {
    stopPolling();
    setState({
      status: "IDLE",
      step: 0,
      totalSteps: 6,
      message: "",
      reportId: null,
      fileUrl: null,
      error: null,
    });
  }, [stopPolling]);

  const progress =
    state.totalSteps > 0
      ? Math.round((state.step / state.totalSteps) * 100)
      : 0;

  return {
    ...state,
    progress,
    isGenerating:
      state.status !== "IDLE" &&
      state.status !== "COMPLETE" &&
      state.status !== "FAILED",
    isComplete: state.status === "COMPLETE",
    isFailed: state.status === "FAILED",
    generate,
    reset,
  };
}
