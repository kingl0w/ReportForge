"use client";

import { useMemo } from "react";
import { Expand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { DataSet } from "@/types/data";
import type { AnalysisResult, ChartType } from "@/types/report";
import type { ReportTemplate, SectionType } from "@/types/template";
import { generateFallbackNarrative } from "@/lib/ai/fallback";
import { buildCharts } from "@/lib/reports/chart-builder";
import { renderReportHtml } from "@/lib/reports/html-renderer";

interface ReportPreviewProps {
  dataSet: DataSet;
  analysis: AnalysisResult;
  template: ReportTemplate;
  title: string;
  brandColor?: string;
  enabledSections: SectionType[];
  chartOverrides: Record<string, ChartType>;
}

/**CSS injected into the inline preview -- makes pages fill the iframe width*/
const INLINE_PREVIEW_CSS = `<style>
  .page { width: 100% !important; min-height: auto !important; }
  body { background: #ffffff; }
</style>`;

/**CSS injected into the fullscreen preview -- dark bg, centered pages, shadows*/
const FULLSCREEN_PREVIEW_CSS = `<style>
  body {
    background: #1a1a1e !important;
    padding: 32px 0 !important;
  }
  .page {
    width: 100% !important;
    max-width: 900px !important;
    min-height: auto !important;
    margin: 0 auto 24px auto !important;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4) !important;
    border-radius: 4px !important;
  }
  .page:not(.cover) {
    background: #ffffff !important;
    overflow: hidden !important;
    padding: 40px !important;
    box-sizing: border-box !important;
  }
  .page:not(.cover) * {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  .page img {
    max-height: 400px !important;
    object-fit: contain !important;
  }
  .page:last-child { margin-bottom: 0 !important; }
  .cover { border-radius: 4px !important; }
</style>`;

function injectCss(html: string, css: string): string {
  return html.replace("</head>", css + "</head>");
}

export default function ReportPreview({
  dataSet,
  analysis,
  template,
  title,
  brandColor,
  enabledSections,
  chartOverrides,
}: ReportPreviewProps) {
  const effectiveTemplate = useMemo((): ReportTemplate => {
    const filteredSections = template.sections.filter((s) =>
      enabledSections.includes(s.type)
    );

    const colorScheme = brandColor
      ? { ...template.colorScheme, primary: brandColor }
      : template.colorScheme;

    return { ...template, sections: filteredSections, colorScheme };
  }, [template, enabledSections, brandColor]);

  const effectiveAnalysis = useMemo((): AnalysisResult => {
    if (Object.keys(chartOverrides).length === 0) return analysis;

    const chartConfigs = analysis.chartConfigs.map((config) => {
      const override = chartOverrides[config.title];
      return override ? { ...config, type: override } : config;
    });

    return { ...analysis, chartConfigs };
  }, [analysis, chartOverrides]);

  const baseHtml = useMemo((): string => {
    try {
      const narrative = generateFallbackNarrative(effectiveAnalysis);
      const charts = buildCharts(
        dataSet.rows,
        effectiveAnalysis,
        narrative.sectionNarratives,
        effectiveTemplate.colorScheme
      );

      return renderReportHtml({
        title,
        template: effectiveTemplate,
        analysis: effectiveAnalysis,
        narrative,
        charts,
        generatedAt: new Date(),
      });
    } catch {
      return "<html><body><p>Preview generation failed.</p></body></html>";
    }
  }, [dataSet.rows, effectiveAnalysis, effectiveTemplate, title]);

  const inlineHtml = useMemo(
    () => injectCss(baseHtml, INLINE_PREVIEW_CSS),
    [baseHtml]
  );

  const fullscreenHtml = useMemo(
    () => injectCss(baseHtml, FULLSCREEN_PREVIEW_CSS),
    [baseHtml]
  );

  return (
    <div className="space-y-3">
      <div className="w-full overflow-hidden rounded-lg border border-border bg-white shadow-xl h-[600px]">
        <iframe
          srcDoc={inlineHtml}
          title="Report preview"
          className="w-full border-0 h-full"
          sandbox="allow-same-origin"
        />
      </div>

      <Dialog>
        <DialogTrigger className="w-full gap-2 inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 bg-secondary border border-border text-foreground hover:bg-accent transition-all">
          <Expand className="h-4 w-4" />
          Full Screen Preview
        </DialogTrigger>
        <DialogContent className="flex flex-col w-[95vw] h-[95vh] max-w-none sm:max-w-none p-0 gap-0 border-border bg-muted">
          <DialogHeader className="shrink-0 border-b border-border bg-card px-6 py-3">
            <DialogTitle className="text-foreground">Report Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden bg-muted">
            <iframe
              srcDoc={fullscreenHtml}
              title="Report full preview"
              className="w-full border-0 h-full"
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
