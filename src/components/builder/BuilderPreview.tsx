"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Expand, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BuilderSection } from "@/types/builder";
import type { ColorScheme, ReportTemplate, RenderedChart } from "@/types/template";
import type { AnalysisResult, NarrativeResult, ChartType } from "@/types/report";
import type { DataSet } from "@/types/data";
import type { SectionType } from "@/types/template";
import { generateFallbackNarrative } from "@/lib/ai/fallback";
import { buildCharts } from "@/lib/reports/chart-builder";
import { renderReportHtml } from "@/lib/reports/html-renderer";

const PAGE_DIMS = {
  a4: { w: 793.7 },
  letter: { w: 816 },
};

const ZOOM_PRESETS = [
  { label: "Fit", value: 0 },
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "100%", value: 1.0 },
] as const;

interface BuilderPreviewProps {
  sections: BuilderSection[];
  colorScheme: ColorScheme;
  analysis: AnalysisResult;
  dataSet: DataSet;
  pageSize: "a4" | "letter";
  templateName: string;
  templateDescription: string;
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
}

export default function BuilderPreview({
  sections,
  colorScheme,
  analysis,
  dataSet,
  pageSize,
  templateName,
  templateDescription,
  selectedSectionId,
  onSelectSection,
}: BuilderPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(500);
  const [zoomMode, setZoomMode] = useState<number>(0); //0 = fit

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setContainerWidth(w);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pageW = PAGE_DIMS[pageSize].w;
  const fitScale = Math.min((containerWidth - 48) / pageW, 1);
  const scale = zoomMode === 0 ? fitScale : zoomMode;

  //defer heavy computations so typing stays responsive
  const deferredSections = useDeferredValue(sections);
  const deferredScheme = useDeferredValue(colorScheme);

  const effectiveAnalysis = useMemo((): AnalysisResult => {
    const preferredCharts = deferredSections
      .filter((s) => s.type === "chart" && s.chartType && s.visible !== false)
      .map((s) => s.chartType!);
    const chartConfigs = analysis.chartConfigs.map((config, i) => {
      const preferred = preferredCharts[i];
      return preferred ? { ...config, type: preferred } : config;
    });
    return { ...analysis, chartConfigs };
  }, [analysis, deferredSections]);

  const narrative = useMemo(
    () => generateFallbackNarrative(effectiveAnalysis),
    [effectiveAnalysis]
  );

  const charts = useMemo(
    () =>
      buildCharts(
        dataSet.rows,
        effectiveAnalysis,
        narrative.sectionNarratives,
        deferredScheme
      ),
    [dataSet.rows, effectiveAnalysis, narrative.sectionNarratives, deferredScheme]
  );

  //iframe for pixel-perfect output in full-preview dialog
  const reportTemplate = useMemo((): ReportTemplate => {
    const templateSections = deferredSections
      .filter((s) => s.type !== "text_block" && s.visible !== false)
      .map((s) => ({
        type: s.type as SectionType,
        title: s.title,
        pageBreakBefore: s.pageBreakBefore,
      }));
    const preferred: ChartType[] = deferredSections
      .filter((s) => s.type === "chart" && s.chartType && s.visible !== false)
      .map((s) => s.chartType!);
    return {
      id: "custom",
      name: templateName || "Custom Template",
      description: templateDescription || "User-created template",
      sections: templateSections,
      colorScheme: deferredScheme,
      preferredCharts: preferred.length > 0 ? preferred : ["bar", "area", "donut"],
      pageSize,
    };
  }, [deferredSections, deferredScheme, templateName, templateDescription, pageSize]);

  const fullHtml = useMemo(() => {
    try {
      return renderReportHtml({
        title: templateName || "Custom Template Preview",
        template: reportTemplate,
        analysis: effectiveAnalysis,
        narrative,
        charts,
        generatedAt: new Date(),
      });
    } catch {
      return "<html><body><p>Preview generation failed.</p></body></html>";
    }
  }, [reportTemplate, effectiveAnalysis, narrative, charts, templateName]);

  const visibleSections = deferredSections.filter((s) => s.visible !== false);
  const c = deferredScheme;

  let chartIdx = 0;
  let sectionNum = 0;

  return (
    <div className="flex h-full flex-col">
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-800/50 p-6"
      >
        <div
          className="mx-auto origin-top-left"
          style={{
            width: pageW * scale,
          }}
        >
          <div
            style={{
              width: pageW,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <div
              className="bg-white shadow-xl"
              style={{
                fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                color: c.text,
                fontSize: "11pt",
                lineHeight: 1.6,
              }}
            >
              {visibleSections.map((section) => {
                const isCoverOrToc =
                  section.type === "cover" ||
                  section.type === "table_of_contents";
                if (!isCoverOrToc) sectionNum++;
                const currentChartIdx =
                  section.type === "chart" ? chartIdx++ : -1;
                const isSelected = section.id === selectedSectionId;

                return (
                  <div
                    key={section.id}
                    className={cn(
                      "relative cursor-pointer transition-shadow",
                      isSelected && "ring-2 ring-blue-500 ring-inset"
                    )}
                    onClick={() => onSelectSection(section.id)}
                  >
                    {section.pageBreakBefore && section.type !== "cover" && (
                      <PageBreakIndicator borderColor={c.border} />
                    )}
                    <SectionRenderer
                      section={section}
                      sectionNumber={sectionNum}
                      colorScheme={c}
                      analysis={effectiveAnalysis}
                      narrative={narrative}
                      charts={charts}
                      chartIndex={currentChartIdx}
                      allSections={visibleSections}
                      templateName={templateName}
                      templateDescription={templateDescription}
                    />
                  </div>
                );
              })}

              {visibleSections.length === 0 && (
                <div className="flex items-center justify-center py-32">
                  <p className="text-sm" style={{ color: c.textMuted }}>
                    Add sections to see a preview
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border bg-card px-3 py-1.5">
        <div className="flex items-center gap-1">
          <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
          {ZOOM_PRESETS.map((z) => (
            <button
              key={z.label}
              type="button"
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                zoomMode === z.value
                  ? "bg-blue-500/15 text-blue-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
              onClick={() => setZoomMode(z.value)}
            >
              {z.label}
            </button>
          ))}
          <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="h-7 gap-1.5 bg-white/10 border border-white/20 text-white text-xs hover:bg-white/20"
            >
              <Maximize className="h-3 w-3" />
              Full Preview
            </Button>
          </DialogTrigger>
          <DialogContent className="flex h-[90vh] max-w-4xl flex-col p-0 border-zinc-700 bg-zinc-900 text-white">
            <DialogHeader className="border-b border-zinc-700 px-6 py-4">
              <DialogTitle className="text-white">Report Preview</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto bg-zinc-800">
              <iframe
                srcDoc={fullHtml}
                title="Template full preview"
                className="w-full border-0"
                style={{ minHeight: "200vh" }}
                sandbox="allow-same-origin"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function PageBreakIndicator({ borderColor }: { borderColor: string }) {
  return (
    <div className="flex items-center gap-2 px-8 py-1" style={{ background: "#f5f5f5" }}>
      <div className="flex-1 border-t border-dashed" style={{ borderColor }} />
      <span
        className="text-[8px] uppercase tracking-widest"
        style={{ color: "#9ca3af" }}
      >
        Page Break
      </span>
      <div className="flex-1 border-t border-dashed" style={{ borderColor }} />
    </div>
  );
}

interface SectionRendererProps {
  section: BuilderSection;
  sectionNumber: number;
  colorScheme: ColorScheme;
  analysis: AnalysisResult;
  narrative: NarrativeResult;
  charts: RenderedChart[];
  chartIndex: number;
  allSections: BuilderSection[];
  templateName: string;
  templateDescription: string;
}

function SectionRenderer(props: SectionRendererProps) {
  switch (props.section.type) {
    case "cover":
      return <CoverSection {...props} />;
    case "table_of_contents":
      return <TOCSection {...props} />;
    case "executive_summary":
      return <SummarySection {...props} />;
    case "key_metrics":
      return <MetricsSection {...props} />;
    case "chart":
      return <ChartSection {...props} />;
    case "rankings":
      return <RankingsSection {...props} />;
    case "anomalies":
      return <AnomaliesSection {...props} />;
    case "correlations":
      return <CorrelationsSection {...props} />;
    case "data_table":
      return <DataTableSection {...props} />;
    case "text_block":
      return <TextBlockSection {...props} />;
    default:
      return null;
  }
}

function SectionHeader({
  num,
  title,
  c,
}: {
  num: number;
  title: string;
  c: ColorScheme;
}) {
  return (
    <div
      className="flex items-center gap-3 px-12 pt-10 pb-3 mb-4"
      style={{ borderBottom: `2px solid ${c.primary}` }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
        style={{ background: c.primary }}
      >
        {num}
      </span>
      <h2
        className="text-[15pt] font-semibold"
        style={{ color: c.primary, letterSpacing: "-0.3px" }}
      >
        {title}
      </h2>
    </div>
  );
}

function CoverSection({ colorScheme: c, templateName, templateDescription }: SectionRendererProps) {
  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <div
      className="relative flex min-h-[420px] flex-col justify-center px-16 py-20"
      style={{
        background: `linear-gradient(135deg, ${c.primary} 0%, ${c.secondary} 100%)`,
        color: "#ffffff",
      }}
    >
      <div
        className="mb-8 h-1 w-14 rounded"
        style={{ background: c.accent }}
      />
      <h1 className="mb-3 text-[28pt] font-bold leading-tight" style={{ letterSpacing: "-0.5px" }}>
        {templateName || "Custom Template"}
      </h1>
      <p className="text-[12pt] font-light opacity-85">
        {templateDescription || "Your report description"}
      </p>
      <p className="mt-10 text-[10pt] opacity-60">
        Generated on {now}
      </p>
      <p className="mt-1 text-[9pt] opacity-50">Data Period: Jan 2025 to Dec 2025</p>
      <div
        className="absolute bottom-12 left-16 right-16 flex justify-between border-t pt-4 text-[8pt] opacity-50"
        style={{ borderColor: "rgba(255,255,255,0.2)" }}
      >
        <span>Confidential</span>
        <span>Generated by ReportForge</span>
      </div>
    </div>
  );
}

function TOCSection({ allSections, colorScheme: c }: SectionRendererProps) {
  const tocItems = allSections.filter(
    (s) => s.type !== "cover" && s.type !== "table_of_contents" && s.visible !== false
  );
  return (
    <div className="px-12 py-10">
      <div
        className="mb-6 pb-3"
        style={{ borderBottom: `2px solid ${c.primary}` }}
      >
        <h2
          className="text-[15pt] font-semibold"
          style={{ color: c.primary }}
        >
          Contents
        </h2>
      </div>
      <div className="space-y-0">
        {tocItems.map((section, i) => (
          <div
            key={section.id}
            className="flex items-baseline py-2"
            style={{ borderBottom: `1px dotted ${c.border}` }}
          >
            <span
              className="text-[10pt] font-medium"
              style={{ color: c.text }}
            >
              {section.title}
            </span>
            <span
              className="mx-2 flex-1"
              style={{ borderBottom: `1px dotted ${c.border}` }}
            />
            <span className="text-[10pt]" style={{ color: c.textMuted }}>
              {i + 3}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummarySection({
  sectionNumber,
  section,
  narrative,
  colorScheme: c,
}: SectionRendererProps) {
  return (
    <div>
      <SectionHeader num={sectionNumber} title={section.title} c={c} />
      <div className="px-12 pb-10">
        <div className="text-[10pt] leading-relaxed" style={{ color: c.text }}>
          {narrative.executiveSummary.split("\n\n").map((p, i) => (
            <p key={i} className="mb-3">
              {p}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricsSection({
  sectionNumber,
  section,
  analysis,
  colorScheme: c,
}: SectionRendererProps) {
  return (
    <div>
      <SectionHeader num={sectionNumber} title={section.title} c={c} />
      <div className="grid grid-cols-3 gap-4 px-12 pb-10">
        {analysis.metrics.slice(0, 6).map((m) => (
          <div
            key={m.name}
            className="rounded-lg p-5"
            style={{
              background: c.surface,
              border: `1px solid ${c.border}`,
              borderLeft: `4px solid ${c.primary}`,
            }}
          >
            <p
              className="text-[8pt] font-medium uppercase tracking-wide"
              style={{ color: c.textMuted }}
            >
              {m.name}
            </p>
            <p
              className="mt-2 text-[20pt] font-bold leading-none"
              style={{ color: c.text }}
            >
              {m.formattedValue}
            </p>
            {m.changePercent !== null && (
              <span
                className="mt-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9pt] font-medium"
                style={{
                  color:
                    m.trend === "up"
                      ? c.positive
                      : m.trend === "down"
                        ? c.negative
                        : c.textMuted,
                  background:
                    m.trend === "up"
                      ? "#ecfdf5"
                      : m.trend === "down"
                        ? "#fef2f2"
                        : "#f9fafb",
                }}
              >
                {m.trend === "up" ? "\u25B2" : m.trend === "down" ? "\u25BC" : "\u2014"}{" "}
                {Math.abs(m.changePercent).toFixed(1)}% vs prior
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartSection({
  sectionNumber,
  section,
  charts,
  chartIndex,
  colorScheme: c,
}: SectionRendererProps) {
  const chart = chartIndex >= 0 && chartIndex < charts.length ? charts[chartIndex] : null;
  const title = chart?.title ?? section.title;
  return (
    <div>
      <SectionHeader num={sectionNumber} title={title} c={c} />
      <div className="px-12 pb-10">
        {chart?.narrative && (
          <p
            className="mb-4 text-[9pt] leading-relaxed"
            style={{ color: c.textMuted }}
          >
            {chart.narrative}
          </p>
        )}
        {chart ? (
          <div
            className="rounded-lg p-4"
            style={{
              background: c.surface,
              border: `1px solid ${c.border}`,
            }}
          >
            <div
              className="[&>svg]:w-full [&>svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: chart.svgString }}
            />
          </div>
        ) : (
          <div
            className="flex h-64 items-center justify-center rounded-lg"
            style={{
              background: c.surface,
              border: `1px solid ${c.border}`,
            }}
          >
            <p className="text-[10pt]" style={{ color: c.textMuted }}>
              Chart preview
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RankingsSection({
  sectionNumber,
  section,
  analysis,
  colorScheme: c,
}: SectionRendererProps) {
  if (analysis.rankings.length === 0) return null;
  return (
    <div>
      <SectionHeader num={sectionNumber} title={section.title} c={c} />
      <div className="px-12 pb-10">
        {analysis.rankings.map((r) => {
          const maxVal = r.topN.length > 0 ? r.topN[0].value : 1;
          const count = section.rankingCount ?? 5;
          return (
            <div key={r.column} className="mb-6">
              <h3
                className="mb-3 text-[11pt] font-semibold"
                style={{ color: c.secondary }}
              >
                {r.column} by {r.groupColumn}
              </h3>
              {r.topN.slice(0, count).map((item, i) => (
                <div key={item.label} className="mb-2 flex items-center gap-3">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8pt] font-semibold text-white"
                    style={{ background: c.primary }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="w-28 shrink-0 text-[9pt] font-medium"
                    style={{ color: c.text }}
                  >
                    {item.label}
                  </span>
                  <div
                    className="h-5 flex-1 overflow-hidden rounded"
                    style={{ background: c.surface }}
                  >
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${maxVal > 0 ? (item.value / maxVal) * 100 : 0}%`,
                        background:
                          c.chartColors[i % c.chartColors.length],
                      }}
                    />
                  </div>
                  <span
                    className="w-20 text-right text-[9pt] font-semibold"
                    style={{ color: c.text }}
                  >
                    {item.formattedValue}
                  </span>
                  <span
                    className="w-12 text-right text-[8pt]"
                    style={{ color: c.textMuted }}
                  >
                    {item.percentOfTotal.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnomaliesSection({
  sectionNumber,
  section,
  analysis,
  colorScheme: c,
}: SectionRendererProps) {
  if (analysis.anomalies.length === 0) return null;
  return (
    <div>
      <SectionHeader num={sectionNumber} title={section.title} c={c} />
      <div className="space-y-2 px-12 pb-10">
        {analysis.anomalies.slice(0, 10).map((a, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-md p-3"
            style={{
              background: c.surface,
              border: `1px solid ${c.border}`,
              borderLeft: `3px solid ${c.accent}`,
            }}
          >
            <span className="mt-0.5 text-amber-500 text-sm">{"\u26A0"}</span>
            <div>
              <p className="text-[9pt]" style={{ color: c.text }}>
                {a.description}
              </p>
              <p className="mt-1 text-[8pt]" style={{ color: c.textMuted }}>
                Method: {a.method.replace("_", " ")} | Severity:{" "}
                {a.deviationScore.toFixed(1)}&sigma;
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CorrelationsSection({
  sectionNumber,
  section,
  analysis,
  colorScheme: c,
}: SectionRendererProps) {
  if (analysis.correlations.length === 0) return null;
  return (
    <div>
      <SectionHeader num={sectionNumber} title={section.title} c={c} />
      <div className="grid grid-cols-2 gap-3 px-12 pb-10">
        {analysis.correlations.slice(0, 8).map((corr) => {
          const bgColor =
            corr.strength === "strong"
              ? "#dbeafe"
              : corr.strength === "moderate"
                ? "#fef3c7"
                : "#f3f4f6";
          const fgColor =
            corr.strength === "strong"
              ? "#1d4ed8"
              : corr.strength === "moderate"
                ? "#92400e"
                : "#6b7280";
          const direction = corr.coefficient > 0 ? "Positive" : "Negative";
          return (
            <div
              key={`${corr.columnA}-${corr.columnB}`}
              className="rounded-md p-3"
              style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
              }}
            >
              <p
                className="text-[9pt] font-semibold"
                style={{ color: c.text }}
              >
                {corr.columnA} &harr; {corr.columnB}
              </p>
              <span
                className="mt-1 inline-block rounded px-2 py-0.5 text-[8pt] font-medium"
                style={{ background: bgColor, color: fgColor }}
              >
                {direction} {corr.strength} (r={corr.coefficient.toFixed(2)})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DataTableSection({
  sectionNumber,
  section,
  analysis,
  colorScheme: c,
}: SectionRendererProps) {
  const cols = analysis.dataProfile.numericColumns.slice(0, 6);
  const metricByName = new Map(
    analysis.metrics.map((m) => [m.name, m])
  );

  const rows = [
    {
      label: "Value",
      cells: cols.map((col) => {
        const m = metricByName.get(col);
        return m ? m.formattedValue : "\u2014";
      }),
    },
    {
      label: "Trend",
      cells: cols.map((col) => {
        const t = analysis.trends.find((tr) => tr.column === col);
        if (!t) return "\u2014";
        const arrow =
          t.direction === "up"
            ? "\u2191"
            : t.direction === "down"
              ? "\u2193"
              : "\u2192";
        return `${arrow} ${t.direction}`;
      }),
    },
    {
      label: "Change %",
      cells: cols.map((col) => {
        const m = metricByName.get(col);
        if (!m || m.changePercent === null) return "\u2014";
        const sign = m.changePercent > 0 ? "+" : "";
        return `${sign}${m.changePercent.toFixed(1)}%`;
      }),
    },
  ];

  return (
    <div>
      <SectionHeader num={sectionNumber} title={section.title} c={c} />
      <div className="px-12 pb-10 overflow-x-auto">
        {cols.length > 0 ? (
          <table className="w-full text-[9pt]" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  className="px-3 py-2 text-left text-[8pt] font-semibold uppercase tracking-wide text-white"
                  style={{ background: c.primary, borderRadius: "6px 0 0 0" }}
                >
                  Metric
                </th>
                {cols.map((col, i) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left text-[8pt] font-semibold uppercase tracking-wide text-white"
                    style={{
                      background: c.primary,
                      borderRadius:
                        i === cols.length - 1 ? "0 6px 0 0" : undefined,
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={row.label}
                  style={{
                    background: ri % 2 === 1 ? c.surface : "transparent",
                  }}
                >
                  <td
                    className="px-3 py-2 font-semibold"
                    style={{
                      color: c.text,
                      borderBottom: `1px solid ${c.border}`,
                    }}
                  >
                    {row.label}
                  </td>
                  {row.cells.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-3 py-2"
                      style={{
                        color: c.text,
                        borderBottom: `1px solid ${c.border}`,
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[10pt]" style={{ color: c.textMuted }}>
            No numeric data to summarize.
          </p>
        )}
      </div>
    </div>
  );
}

function TextBlockSection({
  sectionNumber,
  section,
  colorScheme: c,
}: SectionRendererProps) {
  return (
    <div>
      <SectionHeader num={sectionNumber} title={section.title} c={c} />
      <div className="px-12 pb-10">
        <p className="text-[10pt] leading-relaxed" style={{ color: c.textMuted }}>
          {section.content || "Custom text content will appear here..."}
        </p>
      </div>
    </div>
  );
}
