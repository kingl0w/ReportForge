"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Loader2,
  Lock,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  FileText,
  ExternalLink,
  Store,
  Upload,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import DataUploader from "@/components/reports/DataUploader";
import TemplateSelector from "@/components/reports/TemplateSelector";
import ChartConfigurator from "@/components/reports/ChartConfigurator";
import ReportPreview from "@/components/reports/ReportPreview";
import UpgradeModal from "@/components/reports/UpgradeModal";

import { analyzeDataset } from "@/lib/analytics/engine";
import { getTemplate } from "@/lib/reports/templates";
import { getPlanLimits } from "@/lib/stripe/plans";
import { useReportGeneration } from "@/hooks/useReportGeneration";
import { useSubscription } from "@/hooks/useSubscription";
import { useConnections } from "@/hooks/useConnections";

import type { DataSet } from "@/types/data";
import type { AnalysisResult, ChartType } from "@/types/report";
import type { ReportTemplate, SectionType } from "@/types/template";

type Step = 1 | 2 | 3 | 4;

interface WizardState {
  step: Step;
  dataSet: DataSet | null;
  fileUrl: string | null;
  fileName: string;
  connectionId: string | null;
  dataSourceType: "file" | "connection";
  analysis: AnalysisResult | null;
  selectedTemplateId: string;
  resolvedTemplate: ReportTemplate | null;
  title: string;
  brandColor: string;
  enabledSections: SectionType[];
  chartOverrides: Record<string, ChartType>;
  format: "pdf" | "docx" | "both";
}

const INITIAL_STATE: WizardState = {
  step: 1,
  dataSet: null,
  fileUrl: null,
  fileName: "",
  connectionId: null,
  dataSourceType: "file",
  analysis: null,
  selectedTemplateId: "custom",
  resolvedTemplate: null,
  title: "",
  brandColor: "",
  enabledSections: [
    "cover",
    "table_of_contents",
    "executive_summary",
    "key_metrics",
    "chart",
    "rankings",
    "anomalies",
    "correlations",
    "data_table",
  ],
  chartOverrides: {},
  format: "pdf",
};

const STORAGE_KEY = "reportforge_wizard_draft";
const STORAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000; //24 hours
const LARGE_DATASET_THRESHOLD = 5000;

const COLOR_PRESETS = [
  { label: "Blue", value: "#2563eb" },
  { label: "Emerald", value: "#059669" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Rose", value: "#e11d48" },
  { label: "Amber", value: "#d97706" },
  { label: "Slate", value: "#475569" },
];

const SECTION_LABELS: Record<SectionType, string> = {
  cover: "Cover Page",
  table_of_contents: "Table of Contents",
  executive_summary: "Executive Summary",
  key_metrics: "Key Metrics",
  chart: "Charts",
  rankings: "Rankings",
  anomalies: "Anomalies",
  correlations: "Correlations",
  data_table: "Data Table",
};

function saveDraft(state: WizardState): void {
  try {
    const serializable = { ...state, savedAt: Date.now() };
    //skip large row data to stay under 5MB
    if (
      serializable.dataSet &&
      serializable.dataSet.rows.length > LARGE_DATASET_THRESHOLD
    ) {
      serializable.dataSet = {
        ...serializable.dataSet,
        rows: serializable.dataSet.rows.slice(0, 100),
      };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    //silently fail -- quota exceeded or private browsing
  }
}

function loadDraft(): WizardState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WizardState & { savedAt?: number };
    if (parsed.savedAt && Date.now() - parsed.savedAt > STORAGE_MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearDraft(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export default function ReportWizard() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [analyzing, setAnalyzing] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const generation = useReportGeneration();
  const subscription = useSubscription();

  //focus step heading on step change for accessibility
  const prevStepRef = useRef(state.step);
  useEffect(() => {
    if (state.step !== prevStepRef.current) {
      prevStepRef.current = state.step;
      //allow DOM to settle after AnimatePresence swap
      requestAnimationFrame(() => {
        stepHeadingRef.current?.focus();
      });
    }
  }, [state.step]);

  const progressAnnouncement = useMemo(() => {
    if (generation.isGenerating) return generation.message;
    if (generation.isComplete) return "Report generated successfully!";
    if (generation.isFailed) return `Generation failed: ${generation.error}`;
    return "";
  }, [generation.isGenerating, generation.isComplete, generation.isFailed, generation.message, generation.error]);

  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.dataSet) {
      setState(draft);
      setDraftLoaded(true);
    }
  }, []);

  //auto-save with debounce
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveDraft(state), 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state]);

  const updateState = useCallback(
    (partial: Partial<WizardState>) =>
      setState((prev) => ({ ...prev, ...partial })),
    []
  );

  const goTo = useCallback(
    (step: Step) => updateState({ step }),
    [updateState]
  );

  const handleStartOver = useCallback(() => {
    clearDraft();
    setState(INITIAL_STATE);
    generation.reset();
    setDraftLoaded(false);
  }, [generation]);

  const handleDataReady = useCallback(
    (dataSet: DataSet, fileUrl: string | null) => {
      const fileName =
        dataSet.metadata.source || "data";
      updateState({ dataSet, fileUrl, fileName, step: 2 });
    },
    [updateState]
  );

  useEffect(() => {
    if (state.step !== 2 || !state.dataSet || state.analysis) return;

    setAnalyzing(true);

    //small delay for UX polish
    const timer = setTimeout(() => {
      const analysis = analyzeDataset(state.dataSet!);
      const template = getTemplate(analysis.templateId);

      const autoTitle = generateTitle(state.fileName, analysis.templateId);

      updateState({
        analysis,
        selectedTemplateId: analysis.templateId,
        resolvedTemplate: template,
        title: autoTitle,
        enabledSections: template.sections.map((s) => s.type),
      });
      setAnalyzing(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [state.step, state.dataSet, state.analysis, state.fileName, updateState]);

  const handleGenerate = useCallback(() => {
    if (!state.analysis) return;

    if (state.dataSourceType === "file" && !state.fileUrl) return;
    if (state.dataSourceType === "connection" && !state.connectionId) return;

    if (!subscription.canGenerateReport) {
      setUpgradeOpen(true);
      return;
    }

    if (state.connectionId) {
      generation.generate({
        title: state.title || "Untitled Report",
        connectionId: state.connectionId,
        templateId: state.selectedTemplateId,
        format: state.format,
        brandColor: state.brandColor || undefined,
      });
    } else {
      generation.generate({
        title: state.title || "Untitled Report",
        rawDataUrl: state.fileUrl!,
        fileName: state.fileName,
        templateId: state.selectedTemplateId,
        format: state.format,
        brandColor: state.brandColor || undefined,
      });
    }
  }, [state, generation, subscription.canGenerateReport]);

  const handleDownload = useCallback(() => {
    if (generation.fileUrl) {
      window.open(generation.fileUrl, "_blank");
    }
  }, [generation.fileUrl]);

  const didHandleComplete = useRef(false);

  useEffect(() => {
    if (generation.isComplete && !didHandleComplete.current) {
      didHandleComplete.current = true;
      clearDraft();
      subscription.refresh();
    }
    //reset the guard when generation resets to idle
    if (generation.status === "IDLE") {
      didHandleComplete.current = false;
    }
    //subscription.refresh is stable (useCallback with [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation.isComplete, generation.status]);

  const currentTemplate =
    state.resolvedTemplate ?? getTemplate(state.selectedTemplateId);

  return (
    <div className="space-y-6">
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        subscription={subscription}
      />

      {draftLoaded && state.step > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3">
          <p className="text-sm text-blue-400">
            Draft restored from your previous session.
          </p>
          <Button
            size="sm"
            className="bg-white/10 border border-white/20 text-white hover:bg-white/20"
            onClick={handleStartOver}
          >
            Start Over
          </Button>
        </div>
      )}

      <StepIndicator currentStep={state.step} onStepClick={goTo} />

      <AnimatePresence mode="wait">
        <motion.div
          key={state.step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {state.step === 1 && (
            <StepUpload
              onDataReady={handleDataReady}
              onConnectionDataReady={(dataSet, connId) => {
                updateState({
                  dataSet,
                  fileUrl: null,
                  fileName: `shopify:${connId}`,
                  connectionId: connId,
                  dataSourceType: "connection",
                  step: 2,
                });
              }}
              headingRef={stepHeadingRef}
            />
          )}

          {state.step === 2 && (
            <StepAnalysis
              analyzing={analyzing}
              analysis={state.analysis}
              templateId={state.selectedTemplateId}
            />
          )}

          {state.step === 3 && state.analysis && (
            <StepCustomize
              title={state.title}
              brandColor={state.brandColor}
              selectedTemplateId={state.selectedTemplateId}
              recommendedTemplateId={
                state.analysis.templateId ?? "custom"
              }
              enabledSections={state.enabledSections}
              chartConfigs={state.analysis.chartConfigs}
              chartOverrides={state.chartOverrides}
              templateSections={currentTemplate.sections.map((s) => s.type)}
              onUpdate={updateState}
            />
          )}

          {state.step === 4 &&
            state.dataSet &&
            state.analysis && (
              <StepPreviewGenerate
                dataSet={state.dataSet}
                analysis={state.analysis}
                template={currentTemplate}
                title={state.title}
                brandColor={state.brandColor}
                enabledSections={state.enabledSections}
                chartOverrides={state.chartOverrides}
                format={state.format}
                generation={generation}
                fileUrl={state.fileUrl}
                connectionId={state.connectionId}
                subscription={subscription}
                onFormatChange={(format) => updateState({ format })}
                onGenerate={handleGenerate}
                onDownload={handleDownload}
                onUpgrade={() => setUpgradeOpen(true)}
              />
            )}
        </motion.div>
      </AnimatePresence>

      <div aria-live="polite" aria-atomic className="sr-only">
        {progressAnnouncement}
      </div>

      <div className="flex items-center justify-between">
        <div>
          {state.step > 1 && (
            <Button
              className="h-10 bg-white/10 border border-white/20 text-white hover:bg-white/20"
              onClick={() => goTo((state.step - 1) as Step)}
              disabled={generation.isGenerating}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {state.step > 1 && (
            <Button
              variant="ghost"
              className="h-10 text-white/70 hover:text-white hover:bg-white/10 dark:hover:bg-white/10"
              onClick={handleStartOver}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Start Over
            </Button>
          )}
          {state.step === 2 && state.analysis && !analyzing && (
            <Button
              className="h-10 bg-blue-600 text-white font-medium hover:bg-blue-500"
              onClick={() => goTo(3)}
            >
              Customize Report
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {state.step === 3 && (
            <Button
              className="h-10 bg-blue-600 text-white font-medium hover:bg-blue-500"
              onClick={() => goTo(4)}
            >
              Preview &amp; Generate
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { num: 1, label: "Upload Data" },
  { num: 2, label: "Analysis" },
  { num: 3, label: "Customize" },
  { num: 4, label: "Generate" },
] as const;

function StepIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: Step;
  onStepClick: (step: Step) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((step, i) => {
        const isComplete = currentStep > step.num;
        const isCurrent = currentStep === step.num;
        const isClickable = step.num < currentStep;

        return (
          <div key={step.num} className="flex items-center">
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step.num as Step)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                isComplete &&
                  "cursor-pointer text-emerald-500 hover:bg-emerald-500/10",
                isCurrent && "bg-blue-600/15 text-blue-500",
                !isComplete && !isCurrent && "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isComplete && "bg-emerald-500/20",
                  isCurrent && "bg-blue-600 text-white",
                  !isComplete && !isCurrent && "bg-muted"
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  step.num
                )}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-1 h-px w-8",
                  currentStep > step.num ? "bg-emerald-500/40" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepUpload({
  onDataReady,
  onConnectionDataReady,
  headingRef,
}: {
  onDataReady: (dataSet: DataSet, fileUrl: string | null) => void;
  onConnectionDataReady: (dataSet: DataSet, connectionId: string) => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  const [tab, setTab] = useState<"file" | "connection">("file");
  const connections = useConnections();
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleUseConnection = useCallback(
    async (connectionId: string, provider?: string) => {
      setSyncingId(connectionId);
      try {
        const dataSet = await connections.syncConnection(connectionId, provider);
        onConnectionDataReady(dataSet, connectionId);
      } catch {
        //syncConnection already shows errors via the hook
      } finally {
        setSyncingId(null);
      }
    },
    [connections, onConnectionDataReady]
  );

  return (
    <div className="space-y-4">
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold text-foreground outline-none"
        >
          Choose Your Data Source
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload a file or select a connected data source to get started.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("file")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "file"
              ? "bg-blue-600 text-white"
              : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
          )}
        >
          <Upload className="h-4 w-4" />
          Upload Files
        </button>
        <button
          type="button"
          onClick={() => setTab("connection")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "connection"
              ? "bg-blue-600 text-white"
              : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
          )}
        >
          <Store className="h-4 w-4" />
          Connected Sources
        </button>
      </div>

      {tab === "file" && <DataUploader onDataReady={onDataReady} />}

      {tab === "connection" && (
        <div className="space-y-3">
          {connections.loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!connections.loading && connections.connections.length === 0 && (
            <Card className="bg-card">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Store className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No connected sources yet.
                </p>
                <a
                  href="/dashboard/connections"
                  className="text-sm font-medium text-blue-400 hover:text-blue-300"
                >
                  Connect a store (Shopify, eBay)
                </a>
              </CardContent>
            </Card>
          )}

          {!connections.loading &&
            connections.connections.map((conn) => {
              const isEbay = conn.provider === "EBAY";
              const iconColor = isEbay ? "#0064d2" : "#96bf48";
              const providerLabel = isEbay ? "eBay" : "Shopify";
              const displayName =
                conn.shopDomain ??
                conn.config?.shop ??
                `${providerLabel} Store`;

              return (
                <Card key={conn.id} className="bg-card">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${iconColor}15` }}
                      >
                        <Store
                          className="h-5 w-5"
                          style={{ color: iconColor }}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {providerLabel}
                          {conn.lastSyncAt
                            ? ` · Last synced ${new Date(conn.lastSyncAt).toLocaleDateString()}`
                            : " · Never synced"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="gap-2 bg-blue-600 text-white hover:bg-blue-500"
                      onClick={() =>
                        handleUseConnection(conn.id, conn.provider)
                      }
                      disabled={syncingId === conn.id}
                    >
                      {syncingId === conn.id ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        "Use this data"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}

function StepAnalysis({
  analyzing,
  analysis,
  templateId,
}: {
  analyzing: boolean;
  analysis: AnalysisResult | null;
  templateId: string;
}) {
  if (analyzing || !analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/15">
            <Sparkles className="h-7 w-7 text-blue-500" />
          </div>
        </div>
        <p className="mt-6 text-sm font-medium text-foreground">
          Analyzing your data...
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Computing statistics, detecting trends, and finding insights
        </p>
      </div>
    );
  }

  const template = getTemplate(templateId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Analysis Complete
          </h2>
          <p className="text-sm text-muted-foreground">
            {analysis.dataProfile.rowCount.toLocaleString()} rows analyzed
            across {analysis.dataProfile.numericColumns.length} numeric and{" "}
            {analysis.dataProfile.categoricalColumns.length} categorical columns
          </p>
        </div>
        <Badge
          variant="secondary"
          className="gap-1 bg-blue-500/15 text-blue-400"
        >
          <FileText className="h-3 w-3" />
          {template.name}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {analysis.metrics.slice(0, 6).map((metric) => (
          <Card key={metric.name} className="bg-card">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{metric.name}</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {metric.formattedValue}
              </p>
              {metric.changePercent !== null && (
                <div className="mt-1 flex items-center gap-1">
                  {metric.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : metric.trend === "down" ? (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  ) : (
                    <Minus className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span
                    className={cn(
                      "text-xs font-medium",
                      metric.trend === "up" && "text-emerald-500",
                      metric.trend === "down" && "text-red-500",
                      metric.trend === "flat" && "text-muted-foreground"
                    )}
                  >
                    {metric.changePercent > 0 ? "+" : ""}
                    {metric.changePercent.toFixed(1)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-sm">Key Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.trends.slice(0, 2).map((trend) => (
            <div
              key={trend.column}
              className="flex items-start gap-3 text-sm"
            >
              {trend.direction === "up" ? (
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : trend.direction === "down" ? (
                <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              ) : (
                <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  {trend.column}
                </span>{" "}
                is trending {trend.direction} across {trend.periods} periods
                (R²={trend.rSquared.toFixed(2)})
              </span>
            </div>
          ))}

          {analysis.anomalies.slice(0, 2).map((anomaly, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span className="text-muted-foreground">
                {anomaly.description}
              </span>
            </div>
          ))}

          {analysis.rankings.length > 0 && analysis.rankings[0].topN[0] && (
            <div className="flex items-start gap-3 text-sm">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <span className="text-muted-foreground">
                Top{" "}
                <span className="font-medium text-foreground">
                  {analysis.rankings[0].topN[0].label}
                </span>{" "}
                accounts for {analysis.rankings[0].topN[0].percentOfTotal}% of{" "}
                {analysis.rankings[0].column}
              </span>
            </div>
          )}

          {analysis.chartConfigs.length > 0 && (
            <div className="flex items-start gap-3 text-sm">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
              <span className="text-muted-foreground">
                {analysis.chartConfigs.length} chart
                {analysis.chartConfigs.length !== 1 ? "s" : ""} recommended for
                your data
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StepCustomize({
  title,
  brandColor,
  selectedTemplateId,
  recommendedTemplateId,
  enabledSections,
  chartConfigs,
  chartOverrides,
  templateSections,
  onUpdate,
}: {
  title: string;
  brandColor: string;
  selectedTemplateId: string;
  recommendedTemplateId: string;
  enabledSections: SectionType[];
  chartConfigs: AnalysisResult["chartConfigs"];
  chartOverrides: Record<string, ChartType>;
  templateSections: SectionType[];
  onUpdate: (partial: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Customize Your Report
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose a template, customize the title and branding, and configure
          which sections to include.
        </p>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-sm">Report Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-title">Report Title</Label>
            <Input
              id="report-title"
              value={title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="e.g., Q4 Sales Performance Report"
            />
          </div>

          <div className="space-y-2">
            <Label>Brand Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() =>
                    onUpdate({
                      brandColor:
                        brandColor === preset.value ? "" : preset.value,
                    })
                  }
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                    brandColor === preset.value
                      ? "border-white scale-110"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: preset.value }}
                  title={preset.label}
                  aria-label={`Select ${preset.label} as brand color`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-sm">Report Template</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateSelector
            recommendedId={recommendedTemplateId}
            selectedId={selectedTemplateId}
            onSelect={(id, template) => {
              onUpdate({
                selectedTemplateId: id,
                resolvedTemplate: template,
                enabledSections: template.sections.map((s) => s.type),
              });
            }}
          />
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-sm">Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {templateSections.map((section, index) => {
              const checked = enabledSections.includes(section);
              return (
                <label
                  key={`${section}-${index}`}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(val) => {
                      const next = val
                        ? [...enabledSections, section]
                        : enabledSections.filter((s) => s !== section);
                      onUpdate({ enabledSections: next });
                    }}
                  />
                  <span className="text-sm text-foreground">
                    {SECTION_LABELS[section]}
                  </span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {chartConfigs.length > 0 && (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-sm">Chart Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartConfigurator
              configs={chartConfigs}
              overrides={chartOverrides}
              onOverridesChange={(overrides) =>
                onUpdate({ chartOverrides: overrides })
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepPreviewGenerate({
  dataSet,
  analysis,
  template,
  title,
  brandColor,
  enabledSections,
  chartOverrides,
  format,
  generation,
  fileUrl,
  connectionId,
  subscription,
  onFormatChange,
  onGenerate,
  onDownload,
  onUpgrade,
}: {
  dataSet: DataSet;
  analysis: AnalysisResult;
  template: ReturnType<typeof getTemplate>;
  title: string;
  brandColor: string;
  enabledSections: SectionType[];
  chartOverrides: Record<string, ChartType>;
  format: "pdf" | "docx" | "both";
  generation: ReturnType<typeof useReportGeneration>;
  fileUrl: string | null;
  connectionId: string | null;
  subscription: ReturnType<typeof useSubscription>;
  onFormatChange: (format: "pdf" | "docx" | "both") => void;
  onGenerate: () => void;
  onDownload: () => void;
  onUpgrade: () => void;
}) {
  const canGenerate = !!fileUrl || !!connectionId;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Preview &amp; Generate
        </h2>
        <p className="text-sm text-muted-foreground">
          Review the preview below, then generate your final report.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <ReportPreview
          dataSet={dataSet}
          analysis={analysis}
          template={template}
          title={title || "Untitled Report"}
          brandColor={brandColor || undefined}
          enabledSections={enabledSections}
          chartOverrides={chartOverrides}
        />

        <div className="space-y-4">
          <FormatSelector
            format={format}
            plan={subscription.plan ?? "FREE"}
            onFormatChange={onFormatChange}
          />

          {generation.isGenerating && (
            <Card className="bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {generation.message}
                    </p>
                    <Progress value={generation.progress} className="mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {generation.isComplete && (
            <Card className="border-emerald-500/30 bg-card">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-3 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  <p className="text-sm font-medium text-foreground">
                    Report generated successfully!
                  </p>
                  <Button
                    className="w-full gap-2 bg-emerald-600 text-white font-medium hover:bg-emerald-500"
                    onClick={onDownload}
                  >
                    <Download className="h-4 w-4" />
                    Download Report
                  </Button>
                  {generation.reportId && (
                    <a
                      href={`/report/${generation.reportId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Interactive Report
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {generation.isFailed && (
            <Card className="border-destructive/30 bg-card">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-3 text-center">
                  <AlertTriangle className="h-10 w-10 text-destructive" />
                  <p className="text-sm font-medium text-foreground">
                    Generation failed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {generation.error}
                  </p>
                  <Button
                    className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20"
                    onClick={onGenerate}
                  >
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!generation.isGenerating &&
            !generation.isComplete &&
            !generation.isFailed && (
              <>
                {!subscription.canGenerateReport ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-center">
                      <p className="text-sm font-medium text-amber-400">
                        Report limit reached
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {subscription.reportsUsed}/{subscription.reportsLimit} free reports used
                      </p>
                    </div>
                    <Button
                      className="w-full gap-2 bg-blue-600 text-white font-medium hover:bg-blue-500"
                      onClick={onUpgrade}
                    >
                      <Sparkles className="h-4 w-4" />
                      Upgrade to Generate
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      className="w-full gap-2 bg-blue-600 text-white font-medium hover:bg-blue-500"
                      onClick={onGenerate}
                      disabled={!canGenerate}
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate Report
                    </Button>
                    {!subscription.isPro && (
                      <p className="text-center text-xs text-muted-foreground">
                        {subscription.reportsRemaining} report{subscription.reportsRemaining !== 1 ? "s" : ""} remaining
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

          {!canGenerate && subscription.canGenerateReport && (
            <p className="text-center text-xs text-amber-500">
              Upload a file or select a connected source (Step 1) to enable
              report generation. You can still preview locally.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FormatSelector({
  format,
  plan,
  onFormatChange,
}: {
  format: "pdf" | "docx" | "both";
  plan: string;
  onFormatChange: (format: "pdf" | "docx" | "both") => void;
}) {
  const limits = getPlanLimits(plan);
  const allowed = new Set(limits.formats.map((f) => f.toLowerCase()));

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-sm">Output Format</CardTitle>
      </CardHeader>
      <CardContent>
        <Select
          value={format}
          onValueChange={(val) => {
            if (allowed.has(val)) onFormatChange(val as "pdf" | "docx" | "both");
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="docx" disabled={!allowed.has("docx")}>
              <span className="flex items-center gap-2">
                DOCX (Word)
                {!allowed.has("docx") && (
                  <span className="inline-flex items-center gap-1 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
                    <Lock className="h-2.5 w-2.5" /> Pro
                  </span>
                )}
              </span>
            </SelectItem>
            <SelectItem value="both" disabled={!allowed.has("both")}>
              <span className="flex items-center gap-2">
                Both PDF &amp; DOCX
                {!allowed.has("both") && (
                  <span className="inline-flex items-center gap-1 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
                    <Lock className="h-2.5 w-2.5" /> Pro
                  </span>
                )}
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}

function generateTitle(fileName: string, templateId: string): string {
  const baseName = fileName
    .replace(/\.(csv|xlsx?|xlsm|json|tsv|txt|pdf|docx?)$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const templateNames: Record<string, string> = {
    "sales-report": "Sales Report",
    "social-media": "Social Media Report",
    "crypto-wallet": "Crypto Wallet Report",
    ecommerce: "E-commerce Report",
    analytics: "Analytics Report",
    financial: "Financial Report",
    "shopify-sales": "Shopify Sales Report",
    "shopify-products": "Shopify Product Report",
    "shopify-customers": "Shopify Customer Report",
    "ebay-sales": "eBay Sales Report",
    "ebay-listings": "eBay Listing Report",
    "ebay-financial": "eBay Financial Report",
    custom: "Data Report",
  };

  const suffix = templateNames[templateId] ?? "Report";
  return `${baseName} — ${suffix}`;
}
