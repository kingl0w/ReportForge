import type { DataSet } from "@/types/data";
import type {
  ReportConfig,
  GeneratedReport,
  ReportStatus,
  ReportProgressEvent,
  TemplateId,
  ReportTemplate,
} from "@/types/template";
import type { BrandingConfig } from "@/types/settings";
import { parseCSV, parseExcel, parseJSON } from "@/lib/reports/data-parser";
import { analyzeDataset } from "@/lib/analytics/engine";
import { getTemplate } from "@/lib/reports/templates";
import { buildCharts } from "@/lib/reports/chart-builder";
import { renderReportHtml, renderPdf } from "@/lib/reports/pdf-renderer";
import { generateNarrative } from "@/lib/ai/client";
import { generatePreviewImage } from "@/lib/reports/preview-generator";
import { createAdminClient } from "@/lib/supabase/admin";

const STEPS: { status: ReportStatus; message: string }[] = [
  { status: "PARSING", message: "Parsing source data..." },
  { status: "ANALYZING", message: "Running statistical analysis..." },
  { status: "GENERATING_CHARTS", message: "Generating visualizations..." },
  { status: "WRITING_NARRATIVE", message: "Writing narrative insights..." },
  { status: "RENDERING", message: "Rendering PDF report..." },
  { status: "UPLOADING", message: "Uploading final report..." },
];

export type ProgressCallback = (event: ReportProgressEvent) => void;

/**
 *mutates the template's colorScheme in place.
 */
function applyBranding(
  template: ReportTemplate,
  branding?: BrandingConfig
): void {
  if (!branding) return;
  if (branding.primaryColor) template.colorScheme.primary = branding.primaryColor;
  if (branding.secondaryColor) template.colorScheme.secondary = branding.secondaryColor;
  if (branding.accentColor) template.colorScheme.accent = branding.accentColor;
}

/**
 *runs the full pipeline: parse -> analyze -> charts -> narrative -> render -> upload.
 */
export async function generateReport(
  config: ReportConfig,
  onProgress?: ProgressCallback
): Promise<GeneratedReport> {
  const emit = (stepIndex: number) => {
    if (!onProgress) return;
    const step = STEPS[stepIndex];
    onProgress({
      status: step.status,
      step: stepIndex + 1,
      totalSteps: STEPS.length,
      message: step.message,
    });
  };

  try {
    emit(0);
    const data = await fetchAndParseData(
      config.rawDataUrl,
      config.fileName,
      config.planRowLimit
    );

    emit(1);
    const analysis = analyzeDataset(data);

    const templateId = (config.templateId ?? analysis.templateId) as TemplateId;
    const template = getTemplate(templateId);

    if (config.branding) {
      applyBranding(template, config.branding);
    } else if (config.brandColor) {
      template.colorScheme.primary = config.brandColor;
    }

    emit(3);
    const narrative = await generateNarrative(analysis);

    emit(2);
    const charts = buildCharts(
      data.rows,
      analysis,
      narrative.sectionNarratives,
      template.colorScheme
    );

    emit(4);
    const html = renderReportHtml({
      title: config.title,
      template,
      analysis,
      narrative,
      charts,
      generatedAt: new Date(),
      branding: config.branding,
      watermark: config.watermark,
    });
    const pdfBuffer = await renderPdf(html, template.pageSize, config.branding);

    emit(5);
    const { fileUrl, fileSize } = await uploadReport(
      config.userId,
      config.reportId,
      pdfBuffer
    );

    //non-blocking -- failures don't affect report
    const previewUrl = await generatePreviewImage(
      html,
      config.userId,
      config.reportId
    );

    //~3KB per page is a rough heuristic
    const pageCount = Math.max(1, Math.ceil(pdfBuffer.length / 3000));

    return {
      reportId: config.reportId,
      fileUrl,
      fileSize,
      pageCount,
      templateId,
      format: "pdf",
      generatedAt: new Date(),
      previewUrl: previewUrl ?? undefined,
      analysis,
      narrative,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Report generation failed";
    throw new Error(message);
  }
}

/**
 *generate a report from a pre-built DataSet (e.g. Shopify API data).
 *reuses the full pipeline from analysis onward -- skips file parsing.
 */
export async function generateReportFromDataSet(
  dataSet: DataSet,
  config: Omit<ReportConfig, "rawDataUrl" | "fileName">,
  onProgress?: ProgressCallback
): Promise<GeneratedReport> {
  const emit = (stepIndex: number) => {
    if (!onProgress) return;
    const step = STEPS[stepIndex];
    onProgress({
      status: step.status,
      step: stepIndex + 1,
      totalSteps: STEPS.length,
      message: step.message,
    });
  };

  try {
    emit(0);

    emit(1);
    const analysis = analyzeDataset(dataSet);

    const templateId = (config.templateId ?? analysis.templateId) as TemplateId;
    const template = getTemplate(templateId);

    if (config.branding) {
      applyBranding(template, config.branding);
    } else if (config.brandColor) {
      template.colorScheme.primary = config.brandColor;
    }

    emit(3);
    const narrative = await generateNarrative(analysis);

    emit(2);
    const charts = buildCharts(
      dataSet.rows,
      analysis,
      narrative.sectionNarratives,
      template.colorScheme
    );

    emit(4);
    const html = renderReportHtml({
      title: config.title,
      template,
      analysis,
      narrative,
      charts,
      generatedAt: new Date(),
      branding: config.branding,
    });
    const pdfBuffer = await renderPdf(html, template.pageSize, config.branding);

    emit(5);
    const { fileUrl, fileSize } = await uploadReport(
      config.userId,
      config.reportId,
      pdfBuffer
    );

    const previewUrl = await generatePreviewImage(
      html,
      config.userId,
      config.reportId
    );

    const pageCount = Math.max(1, Math.ceil(pdfBuffer.length / 3000));

    return {
      reportId: config.reportId,
      fileUrl,
      fileSize,
      pageCount,
      templateId,
      format: "pdf",
      generatedAt: new Date(),
      previewUrl: previewUrl ?? undefined,
      analysis,
      narrative,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Report generation failed";
    throw new Error(message);
  }
}

async function fetchAndParseData(
  url: string,
  fileName: string,
  planRowLimit?: number
): Promise<DataSet> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch data file: ${response.statusText}`);
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const opts = planRowLimit ? { planRowLimit } : undefined;

  switch (ext) {
    case "csv": {
      const text = await response.text();
      return parseCSV(text, fileName, text.length, opts);
    }
    case "xlsx":
    case "xls": {
      const buffer = await response.arrayBuffer();
      return parseExcel(buffer, fileName, buffer.byteLength, opts);
    }
    case "json": {
      const text = await response.text();
      return parseJSON(text, fileName, text.length, opts);
    }
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}

async function uploadReport(
  userId: string,
  reportId: string,
  pdfBuffer: Buffer
): Promise<{ fileUrl: string; fileSize: number }> {
  const supabase = createAdminClient();
  const path = `${userId}/${reportId}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("reports")
    .upload(path, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  //signed URL valid for 7 days
  const { data: signedData, error: signError } = await supabase.storage
    .from("reports")
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  if (signError || !signedData?.signedUrl) {
    throw new Error("Failed to generate download URL");
  }

  return {
    fileUrl: signedData.signedUrl,
    fileSize: pdfBuffer.length,
  };
}
