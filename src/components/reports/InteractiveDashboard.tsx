"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Trophy,
  BarChart3,
  ArrowUpDown,
  Link2,
  Share2,
  Check,
  Globe,
  Lock,
  Trash2,
} from "lucide-react";
import type {
  AnalysisResult,
  NarrativeResult,
  ChartConfig,
  KeyMetric,
  RankingResult,
  Anomaly,
  Correlation,
} from "@/types/report";

const CHART_COLORS = [
  "#6366f1", // indigo
  "#22d3ee", // cyan
  "#f59e0b", // amber
  "#10b981", // emerald
  "#f43f5e", // rose
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#f97316", // orange
];

interface InteractiveDashboardProps {
  reportId: string;
  title: string;
  templateId: string | null;
  analysis: AnalysisResult;
  narrative: NarrativeResult | null;
  fileUrl: string | null;
  docxUrl: string | null;
  format: string;
  generatedAt: string;
  isPublic: boolean;
  blurCharts?: boolean;
}

export default function InteractiveDashboard({
  reportId,
  title,
  analysis,
  narrative,
  fileUrl,
  docxUrl,
  format,
  generatedAt,
  isPublic: initialIsPublic,
  blurCharts = false,
}: InteractiveDashboardProps) {
  const router = useRouter();
  const [activeChart, setActiveChart] = useState<number | null>(null);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [copied, setCopied] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reportUrl = useMemo(
    () =>
      typeof window !== "undefined"
        ? `${window.location.origin}/report/${reportId}`
        : `/report/${reportId}`,
    [reportId]
  );

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(reportUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      //fallback for older browsers
      const input = document.createElement("input");
      input.value = reportUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [reportUrl]);

  const handleTogglePublic = useCallback(async () => {
    setTogglingPublic(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      if (res.ok) {
        setIsPublic(!isPublic);
      }
    } catch {
      //silently fail
    } finally {
      setTogglingPublic(false);
    }
  }, [reportId, isPublic]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Delete failed");
      }
      toast.success("Report deleted");
      router.push("/dashboard/reports");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast.error(msg);
      setDeleting(false);
    }
  }, [reportId, router]);

  const formattedDate = useMemo(() => {
    try {
      return new Date(generatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return generatedAt;
    }
  }, [generatedAt]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              href="/dashboard/reports"
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold sm:text-xl">
                {title}
              </h1>
              <p className="text-xs text-zinc-500">Generated {formattedDate}</p>
            </div>
          </div>
          <div className="ml-4 flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                  title="Delete report"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {deleting ? "Deleting..." : "Delete"}
                  </span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-zinc-700 bg-zinc-900 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Delete report?</AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400">
                    This will permanently delete the report and its generated
                    files. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-zinc-600 bg-white text-black hover:bg-zinc-200">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={handleDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <button
              onClick={handleTogglePublic}
              disabled={togglingPublic}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 disabled:opacity-50"
              title={isPublic ? "Make private" : "Make public"}
            >
              {isPublic ? (
                <Globe className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {isPublic ? "Public" : "Private"}
              </span>
            </button>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {copied ? "Copied!" : "Copy Link"}
              </span>
            </button>
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {docxUrl ? "Download PDF" : `Download ${format === "DOCX" ? "DOCX" : "PDF"}`}
                </span>
              </a>
            )}
            {docxUrl && (
              <a
                href={docxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download DOCX</span>
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        {narrative?.executiveSummary && (
          <section className="mb-8">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Executive Summary
              </h2>
              <p className="leading-relaxed text-zinc-300 whitespace-pre-line">
                {narrative.executiveSummary}
              </p>
            </div>
          </section>
        )}

        {analysis.metrics.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Key Metrics
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {analysis.metrics.slice(0, 8).map((metric) => (
                <MetricCard key={metric.name} metric={metric} />
              ))}
            </div>
          </section>
        )}

        {analysis.chartConfigs.length > 0 && (
          <BlurredUpgradeOverlay active={blurCharts}>
            <section className="mb-8">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Visualizations
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {analysis.chartConfigs.map((config, i) => (
                  <ChartCard
                    key={`${config.title}-${i}`}
                    config={config}
                    analysis={analysis}
                    narrativeText={
                      narrative?.sectionNarratives[config.title] ?? null
                    }
                    colorIndex={i}
                    isExpanded={activeChart === i}
                    onToggleExpand={() =>
                      setActiveChart(activeChart === i ? null : i)
                    }
                  />
                ))}
              </div>
            </section>
          </BlurredUpgradeOverlay>
        )}

        {analysis.rankings.length > 0 && (
          <BlurredUpgradeOverlay active={blurCharts}>
            <section className="mb-8">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Rankings
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {analysis.rankings.map((ranking, i) => (
                  <RankingCard key={`${ranking.column}-${i}`} ranking={ranking} />
                ))}
              </div>
            </section>
          </BlurredUpgradeOverlay>
        )}

        {analysis.anomalies.length > 0 && (
          <BlurredUpgradeOverlay active={blurCharts}>
            <section className="mb-8">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Anomalies Detected
              </h2>
              <div className="space-y-3">
                {analysis.anomalies.slice(0, 10).map((anomaly, i) => (
                  <AnomalyRow key={`${anomaly.column}-${anomaly.rowIndex}-${i}`} anomaly={anomaly} />
                ))}
              </div>
            </section>
          </BlurredUpgradeOverlay>
        )}

        {analysis.correlations.length > 0 && (
          <BlurredUpgradeOverlay active={blurCharts}>
            <section className="mb-8">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Correlations
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {analysis.correlations
                  .filter((c) => c.strength !== "none")
                  .slice(0, 6)
                  .map((corr, i) => (
                    <CorrelationCard key={`${corr.columnA}-${corr.columnB}-${i}`} correlation={corr} />
                  ))}
              </div>
            </section>
          </BlurredUpgradeOverlay>
        )}

        <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-zinc-600">
          <p>
            {analysis.dataProfile.rowCount.toLocaleString()} rows analyzed
            {analysis.dataProfile.dateRange && (
              <> &middot; {analysis.dataProfile.dateRange.min} to {analysis.dataProfile.dateRange.max}</>
            )}
          </p>
          <p className="mt-1">Generated by ReportForge</p>
        </footer>
      </main>
    </div>
  );
}

function BlurredUpgradeOverlay({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  if (!active) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0a0f]/60 backdrop-blur-[2px]">
        <Lock className="h-8 w-8 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-300">
          Upgrade to unlock interactive charts
        </p>
        <a
          href="/dashboard/upgrade"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          Upgrade
        </a>
      </div>
    </div>
  );
}

function MetricCard({ metric }: { metric: KeyMetric }) {
  const TrendIcon =
    metric.trend === "up"
      ? TrendingUp
      : metric.trend === "down"
        ? TrendingDown
        : Minus;

  const trendColor =
    metric.trend === "up"
      ? "text-emerald-400"
      : metric.trend === "down"
        ? "text-rose-400"
        : "text-zinc-500";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
      <p className="mb-1 truncate text-xs font-medium text-zinc-500">
        {metric.name}
      </p>
      <p className="text-2xl font-bold tracking-tight">
        {metric.formattedValue}
      </p>
      {metric.changePercent !== null && (
        <div className={`mt-1 flex items-center gap-1 text-xs ${trendColor}`}>
          <TrendIcon className="h-3 w-3" />
          <span>
            {metric.changePercent > 0 ? "+" : ""}
            {metric.changePercent.toFixed(1)}%
          </span>
          {metric.previousValue !== null && (
            <span className="text-zinc-600">
              vs {formatCompact(metric.previousValue)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ChartCard({
  config,
  analysis,
  narrativeText,
  colorIndex,
  isExpanded,
  onToggleExpand,
}: {
  config: ChartConfig;
  analysis: AnalysisResult;
  narrativeText: string | null;
  colorIndex: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const chartData = useMemo(
    () => buildRechartsData(config, analysis),
    [config, analysis]
  );

  const primaryColor = CHART_COLORS[colorIndex % CHART_COLORS.length];

  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all ${
        isExpanded ? "lg:col-span-2" : ""
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">
            {config.title}
          </h3>
          <p className="text-xs text-zinc-500">
            {config.xAxis} vs {Array.isArray(config.yAxis) ? config.yAxis.join(", ") : config.yAxis}
          </p>
        </div>
        <button
          onClick={onToggleExpand}
          className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-300"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          <BarChart3 className="h-4 w-4" />
        </button>
      </div>

      <div className={isExpanded ? "h-[400px]" : "h-[280px]"}>
        <ResponsiveContainer width="100%" height="100%">
          {renderRechartsChart(config, chartData, primaryColor, colorIndex)}
        </ResponsiveContainer>
      </div>

      {narrativeText && (
        <p className="mt-3 text-xs leading-relaxed text-zinc-400">
          {narrativeText}
        </p>
      )}
    </div>
  );
}

function RankingCard({ ranking }: { ranking: RankingResult }) {
  const [showBottom, setShowBottom] = useState(false);
  const items = showBottom ? ranking.bottomN : ranking.topN;
  const maxValue = items.length > 0 ? Math.max(...items.map((i) => i.value)) : 1;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-zinc-200">
            {ranking.column} by {ranking.groupColumn}
          </h3>
        </div>
        <button
          onClick={() => setShowBottom(!showBottom)}
          className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-300"
        >
          <ArrowUpDown className="h-3 w-3" />
          {showBottom ? "Top" : "Bottom"}
        </button>
      </div>
      <div className="space-y-2">
        {items.slice(0, 5).map((item, i) => (
          <div key={`${item.label}-${i}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-zinc-300" title={item.label}>
                <span className="mr-2 text-zinc-600">{i + 1}.</span>
                {item.label}
              </span>
              <span className="ml-2 font-medium text-zinc-200 tabular-nums">
                {item.formattedValue}
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-indigo-500/60"
                style={{
                  width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnomalyRow({ anomaly }: { anomaly: Anomaly }) {
  const severity =
    anomaly.deviationScore > 3
      ? "text-rose-400"
      : anomaly.deviationScore > 2
        ? "text-amber-400"
        : "text-yellow-400";

  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${severity}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-300">{anomaly.description}</p>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
          <span>Column: {anomaly.column}</span>
          <span>Value: {formatCompact(anomaly.value)}</span>
          <span>Expected: ~{formatCompact(anomaly.expected)}</span>
          <span className="uppercase">{anomaly.method}</span>
        </div>
      </div>
    </div>
  );
}

function CorrelationCard({ correlation }: { correlation: Correlation }) {
  const strengthColor: Record<string, string> = {
    strong: "text-emerald-400 bg-emerald-400/10",
    moderate: "text-amber-400 bg-amber-400/10",
    weak: "text-zinc-400 bg-zinc-400/10",
    none: "text-zinc-600 bg-zinc-600/10",
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-zinc-500" />
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${strengthColor[correlation.strength]}`}
        >
          {correlation.strength}
        </span>
      </div>
      <p className="text-sm text-zinc-300">
        {correlation.columnA} &harr; {correlation.columnB}
      </p>
      <p className="mt-1 text-xs tabular-nums text-zinc-500">
        r = {correlation.coefficient.toFixed(3)}
      </p>
    </div>
  );
}

interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: unknown;
}

function buildRechartsData(
  config: ChartConfig,
  analysis: AnalysisResult
): ChartDataPoint[] {
  if (config.type === "pie" || config.type === "donut") {
    const ranking = analysis.rankings.find(
      (r) =>
        r.column === (Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis) ||
        r.groupColumn === config.xAxis
    );
    if (ranking) {
      return ranking.topN.map((item) => ({
        name: item.label,
        value: item.value,
      }));
    }
  }

  const yAxisCol = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;
  const ranking = analysis.rankings.find(
    (r) => r.column === yAxisCol || r.groupColumn === config.xAxis
  );

  if (ranking) {
    return ranking.topN.map((item) => ({
      name: item.label,
      value: item.value,
    }));
  }

  return analysis.metrics.slice(0, 6).map((m) => ({
    name: m.name,
    value: m.value,
  }));
}

function renderRechartsChart(
  config: ChartConfig,
  data: ChartDataPoint[],
  primaryColor: string,
  _colorIndex: number
): React.ReactElement {
  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "#1a1a2e",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "8px",
      fontSize: "12px",
      color: "#e4e4e7",
    },
    itemStyle: { color: "#e4e4e7" },
  };

  switch (config.type) {
    case "line":
    case "multi_line":
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompact}
          />
          <Tooltip {...tooltipStyle} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={primaryColor}
            strokeWidth={2}
            dot={{ fill: primaryColor, r: 3 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      );

    case "area":
    case "stacked_area":
      return (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompact}
          />
          <Tooltip {...tooltipStyle} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={primaryColor}
            fill={primaryColor}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </AreaChart>
      );

    case "bar":
    case "horizontal_bar":
    case "stacked_bar":
    case "grouped_bar":
      if (config.type === "horizontal_bar") {
        return (
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              type="number"
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickFormatter={formatCompact}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="value" fill={primaryColor} radius={[0, 4, 4, 0]} />
          </BarChart>
        );
      }
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            angle={-25}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompact}
          />
          <Tooltip {...tooltipStyle} />
          <Bar dataKey="value" fill={primaryColor} radius={[4, 4, 0, 0]} />
        </BarChart>
      );

    case "pie":
    case "donut":
      return (
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={config.type === "donut" ? "55%" : 0}
            outerRadius="80%"
            dataKey="value"
            nameKey="name"
            label={(props) => {
              const name = String(props.name ?? "");
              const pct = typeof props.percent === "number" ? props.percent : 0;
              return `${name} (${(pct * 100).toFixed(0)}%)`;
            }}
            labelLine={{ stroke: "rgba(255,255,255,0.2)" }}
          >
            {data.map((_, i) => (
              <Cell
                key={`cell-${i}`}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
          <Legend
            wrapperStyle={{ fontSize: "11px", color: "#a1a1aa" }}
          />
        </PieChart>
      );

    case "scatter":
      return (
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          />
          <YAxis
            dataKey="value"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompact}
          />
          <Tooltip {...tooltipStyle} />
          <Scatter data={data} fill={primaryColor} />
        </ScatterChart>
      );

    default:
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompact}
          />
          <Tooltip {...tooltipStyle} />
          <Bar dataKey="value" fill={primaryColor} radius={[4, 4, 0, 0]} />
        </BarChart>
      );
  }
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toFixed(2);
}
