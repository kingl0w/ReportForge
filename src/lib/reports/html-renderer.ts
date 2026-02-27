import type {
  AnalysisResult,
  KeyMetric,
  NarrativeResult,
} from "@/types/report";
import type {
  ReportTemplate,
  RenderedChart,
  ColorScheme,
} from "@/types/template";
import type { BrandingConfig } from "@/types/settings";

export interface HtmlRenderInput {
  title: string;
  template: ReportTemplate;
  analysis: AnalysisResult;
  narrative: NarrativeResult;
  charts: RenderedChart[];
  generatedAt: Date;
  branding?: BrandingConfig;
  watermark?: boolean;
}

/**
 *client-safe -- no server-only dependencies.
 *produces HTML suitable for Puppeteer PDF conversion.
 */
export function renderReportHtml(input: HtmlRenderInput): string {
  const { title, template, analysis, narrative, charts, generatedAt, branding, watermark } = input;
  const c = template.colorScheme;
  const dateStr = generatedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const dateRange = analysis.dataProfile.dateRange;
  const periodStr = dateRange
    ? `${dateRange.min} to ${dateRange.max}`
    : "";

  const sections: string[] = [];
  let chartIndex = 0;

  for (const section of template.sections) {
    switch (section.type) {
      case "cover":
        sections.push(renderCover(title, template.name, dateStr, periodStr, c, branding));
        break;
      case "table_of_contents":
        sections.push(renderTableOfContents(template, charts, c));
        break;
      case "executive_summary":
        sections.push(
          renderSection(
            section.title,
            narrative.executiveSummary,
            c,
            section.pageBreakBefore
          )
        );
        break;
      case "key_metrics":
        sections.push(
          renderKeyMetrics(section.title, analysis.metrics, c, section.pageBreakBefore)
        );
        break;
      case "chart":
        if (chartIndex < charts.length) {
          sections.push(renderChartSection(charts[chartIndex], c));
          chartIndex++;
        }
        break;
      case "rankings":
        sections.push(
          renderRankings(section.title, analysis.rankings, c, section.pageBreakBefore)
        );
        break;
      case "anomalies":
        if (analysis.anomalies.length > 0) {
          sections.push(
            renderAnomalies(section.title, analysis.anomalies, c, section.pageBreakBefore)
          );
        }
        break;
      case "correlations":
        if (analysis.correlations.length > 0) {
          sections.push(
            renderCorrelations(section.title, analysis.correlations, c, section.pageBreakBefore)
          );
        }
        break;
      case "data_table":
        sections.push(
          renderDataTable(section.title, analysis, c, section.pageBreakBefore)
        );
        break;
    }
  }

  let html = sections.join("");

  if (watermark) {
    const watermarkHtml =
      `<div class="page-watermark">Generated with ReportForge</div>` +
      `<div class="page-watermark-footer">reportforge.com/upgrade &mdash; Remove watermark</div>`;
    html = html.replace(/<div class="page([^"]*)">/g, (match) => {
      return match + watermarkHtml;
    });
  }

  return wrapHtml(html, c, template.pageSize);
}

function wrapHtml(
  body: string,
  c: ColorScheme,
  pageSize: "a4" | "letter"
): string {
  const pageW = pageSize === "a4" ? "210mm" : "8.5in";
  const pageH = pageSize === "a4" ? "297mm" : "11in";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --primary: ${c.primary};
  --secondary: ${c.secondary};
  --accent: ${c.accent};
  --bg: ${c.background};
  --surface: ${c.surface};
  --text: ${c.text};
  --text-muted: ${c.textMuted};
  --border: ${c.border};
  --positive: ${c.positive};
  --negative: ${c.negative};
}

@page {
  size: ${pageW} ${pageH};
  margin: 0;
}

body {
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: var(--text);
  background: var(--bg);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.page {
  width: ${pageW};
  min-height: ${pageH};
  padding: 48px;
  page-break-after: always;
  position: relative;
}

.page:last-child { page-break-after: auto; }

.page-break { page-break-before: always; }

/*Cover Page*/
.cover {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 80px 64px;
  background: linear-gradient(135deg, var(--primary) 0%, ${c.secondary} 100%);
  color: #ffffff;
}

.cover-accent {
  width: 60px;
  height: 4px;
  background: ${c.accent};
  border-radius: 2px;
  margin-bottom: 32px;
}

.cover h1 {
  font-size: 36pt;
  font-weight: 700;
  line-height: 1.15;
  margin-bottom: 16px;
  letter-spacing: -0.5px;
}

.cover .subtitle {
  font-size: 14pt;
  font-weight: 300;
  opacity: 0.85;
  margin-bottom: 8px;
}

.cover .date {
  font-size: 11pt;
  font-weight: 400;
  opacity: 0.7;
  margin-top: 40px;
}

.cover .period {
  font-size: 10pt;
  font-weight: 400;
  opacity: 0.6;
  margin-top: 4px;
}

.cover-footer {
  position: absolute;
  bottom: 48px;
  left: 64px;
  right: 64px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255,255,255,0.2);
  padding-top: 16px;
  font-size: 9pt;
  opacity: 0.6;
}

/*Section Headers*/
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--primary);
}

.section-header h2 {
  font-size: 18pt;
  font-weight: 600;
  color: var(--primary);
  letter-spacing: -0.3px;
}

.section-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--primary);
  color: #fff;
  border-radius: 50%;
  font-size: 12pt;
  font-weight: 600;
  flex-shrink: 0;
}

/*Key Metrics Grid*/
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid var(--primary);
}

.metric-card .label {
  font-size: 9pt;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.metric-card .value {
  font-size: 24pt;
  font-weight: 700;
  color: var(--text);
  line-height: 1.1;
}

.metric-card .change {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 10pt;
  font-weight: 500;
  border-radius: 4px;
  padding: 2px 8px;
}

.metric-card .change.up { color: var(--positive); background: #ecfdf5; }
.metric-card .change.down { color: var(--negative); background: #fef2f2; }
.metric-card .change.flat { color: var(--text-muted); background: #f9fafb; }

/*Charts*/
.chart-section {
  margin-bottom: 32px;
}

.chart-title {
  font-size: 13pt;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}

.chart-narrative {
  font-size: 10pt;
  color: var(--text-muted);
  margin-bottom: 16px;
  line-height: 1.5;
}

.chart-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 8px;
}

.chart-container svg {
  width: 100%;
  height: auto;
}

/*Tables*/
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
  margin-bottom: 16px;
}

.data-table thead th {
  background: var(--primary);
  color: #ffffff;
  font-weight: 600;
  text-align: left;
  padding: 10px 12px;
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.data-table thead th:first-child { border-radius: 6px 0 0 0; }
.data-table thead th:last-child { border-radius: 0 6px 0 0; }

.data-table tbody td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}

.data-table tbody tr:nth-child(even) { background: var(--surface); }
.data-table tbody tr:hover { background: #f1f5f9; }

/*Rankings*/
.ranking-group {
  margin-bottom: 24px;
}

.ranking-group h3 {
  font-size: 12pt;
  font-weight: 600;
  color: var(--secondary);
  margin-bottom: 12px;
}

.rank-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.rank-num {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  color: #fff;
  border-radius: 50%;
  font-size: 9pt;
  font-weight: 600;
  flex-shrink: 0;
}

.rank-label {
  width: 120px;
  font-size: 10pt;
  font-weight: 500;
  color: var(--text);
  flex-shrink: 0;
}

.rank-bar-track {
  flex: 1;
  height: 20px;
  background: var(--surface);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.rank-bar-fill {
  height: 100%;
  border-radius: 4px;
  background: var(--primary);
  transition: width 0.3s;
}

.rank-value {
  width: 80px;
  text-align: right;
  font-size: 10pt;
  font-weight: 600;
  color: var(--text);
  flex-shrink: 0;
}

.rank-pct {
  width: 50px;
  text-align: right;
  font-size: 9pt;
  color: var(--text-muted);
  flex-shrink: 0;
}

/*Anomalies*/
.anomaly-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: 8px;
  border-left: 3px solid var(--accent);
}

.anomaly-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--accent);
  margin-top: 2px;
}

.anomaly-text {
  font-size: 10pt;
  line-height: 1.5;
  color: var(--text);
}

.anomaly-meta {
  font-size: 8.5pt;
  color: var(--text-muted);
  margin-top: 4px;
}

/*Correlations*/
.correlation-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.corr-card {
  padding: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.corr-pair {
  font-size: 10pt;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
}

.corr-badge {
  display: inline-block;
  font-size: 8.5pt;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
}

.corr-strong { background: #dbeafe; color: #1d4ed8; }
.corr-moderate { background: #fef3c7; color: #92400e; }
.corr-weak { background: #f3f4f6; color: #6b7280; }

/*TOC*/
.toc-item {
  display: flex;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px dotted var(--border);
}

.toc-title {
  font-size: 11pt;
  font-weight: 500;
  color: var(--text);
  flex-shrink: 0;
}

.toc-dots {
  flex: 1;
  border-bottom: 1px dotted var(--border);
  margin: 0 8px;
  min-height: 1px;
}

.toc-page {
  font-size: 11pt;
  color: var(--text-muted);
  flex-shrink: 0;
}

/*Narrative Text*/
.narrative-text {
  font-size: 11pt;
  line-height: 1.7;
  color: var(--text);
  white-space: pre-wrap;
}

.narrative-text p {
  margin-bottom: 12px;
}

/*Watermark (free tier)*/
.page-watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-35deg);
  font-size: 60pt;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.06);
  white-space: nowrap;
  pointer-events: none;
  z-index: 1000;
  letter-spacing: 6px;
  user-select: none;
}

.page-watermark-footer {
  position: absolute;
  bottom: 16px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 8pt;
  color: rgba(0, 0, 0, 0.25);
  pointer-events: none;
  z-index: 1000;
}
</style>
</head>
<body>${body}</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

let sectionCounter = 0;

function renderCover(
  title: string,
  templateName: string,
  dateStr: string,
  periodStr: string,
  c: ColorScheme,
  branding?: BrandingConfig
): string {
  sectionCounter = 0;

  const logoHtml = branding?.logoUrl
    ? `<img src="${esc(branding.logoUrl)}" alt="Logo" style="max-height:60px;max-width:200px;margin-bottom:24px;object-fit:contain;" />`
    : "";

  const footerLeft = branding?.footerText
    ? esc(branding.footerText)
    : "Confidential";

  const showRfBranding = branding?.showReportForgeBranding !== false;
  const footerRight = showRfBranding ? "Generated by ReportForge" : "";

  return `<div class="page cover">
    ${logoHtml}
    <div class="cover-accent"></div>
    <h1>${esc(title)}</h1>
    <div class="subtitle">${esc(templateName)}</div>
    <div class="date">${esc(dateStr)}</div>
    ${periodStr ? `<div class="period">Data Period: ${esc(periodStr)}</div>` : ""}
    <div class="cover-footer">
      <span>${footerLeft}</span>
      <span>${footerRight}</span>
    </div>
  </div>`;
}

function renderTableOfContents(
  template: ReportTemplate,
  charts: RenderedChart[],
  _colors: ColorScheme
): string {
  let pageNum = 2;
  let tocChartIndex = 0;
  const items: { title: string; page: number }[] = [];

  for (const section of template.sections) {
    if (section.type === "cover" || section.type === "table_of_contents") continue;
    if (section.pageBreakBefore) pageNum++;

    if (section.type === "chart") {
      if (tocChartIndex < charts.length) {
        items.push({ title: charts[tocChartIndex].title, page: pageNum });
        tocChartIndex++;
      }
    } else {
      items.push({ title: section.title, page: pageNum });
    }
  }

  const tocItems = items
    .map(
      (item) => `<div class="toc-item">
        <span class="toc-title">${esc(item.title)}</span>
        <span class="toc-dots"></span>
        <span class="toc-page">${item.page}</span>
      </div>`
    )
    .join("");

  return `<div class="page">
    <div class="section-header">
      <h2>Contents</h2>
    </div>
    ${tocItems}
  </div>`;
}

function renderSection(
  title: string,
  content: string,
  c: ColorScheme,
  pageBreak?: boolean
): string {
  sectionCounter++;
  const paragraphs = content
    .split("\n\n")
    .filter(Boolean)
    .map((p) => `<p>${esc(p.trim())}</p>`)
    .join("");

  return `<div class="page${pageBreak ? " page-break" : ""}">
    <div class="section-header">
      <span class="section-number">${sectionCounter}</span>
      <h2>${esc(title)}</h2>
    </div>
    <div class="narrative-text">${paragraphs}</div>
  </div>`;
}

function renderKeyMetrics(
  title: string,
  metrics: KeyMetric[],
  c: ColorScheme,
  pageBreak?: boolean
): string {
  sectionCounter++;
  const cards = metrics
    .map((m) => {
      let changeHtml = "";
      if (m.changePercent !== null) {
        const arrow =
          m.trend === "up" ? "&#9650;" : m.trend === "down" ? "&#9660;" : "&#8212;";
        changeHtml = `<div class="change ${m.trend}">${arrow} ${Math.abs(m.changePercent).toFixed(1)}% vs prior period</div>`;
      }
      return `<div class="metric-card">
        <div class="label">${esc(m.name)}</div>
        <div class="value">${esc(m.formattedValue)}</div>
        ${changeHtml}
      </div>`;
    })
    .join("");

  return `<div class="page${pageBreak ? " page-break" : ""}">
    <div class="section-header">
      <span class="section-number">${sectionCounter}</span>
      <h2>${esc(title)}</h2>
    </div>
    <div class="metrics-grid">${cards}</div>
  </div>`;
}

function renderChartSection(chart: RenderedChart, _colors: ColorScheme): string {
  sectionCounter++;
  return `<div class="page">
    <div class="section-header">
      <span class="section-number">${sectionCounter}</span>
      <h2>${esc(chart.title)}</h2>
    </div>
    ${chart.narrative ? `<div class="chart-narrative">${esc(chart.narrative)}</div>` : ""}
    <div class="chart-container">${chart.svgString}</div>
  </div>`;
}

function renderRankings(
  title: string,
  rankings: import("@/types/report").RankingResult[],
  c: ColorScheme,
  pageBreak?: boolean
): string {
  if (rankings.length === 0) return "";
  sectionCounter++;

  const groups = rankings
    .map((r) => {
      const maxValue = r.topN.length > 0 ? r.topN[0].value : 1;
      const bars = r.topN
        .map(
          (item, i) =>
            `<div class="rank-bar">
              <span class="rank-num">${i + 1}</span>
              <span class="rank-label">${esc(item.label)}</span>
              <div class="rank-bar-track">
                <div class="rank-bar-fill" style="width:${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%;background:${c.chartColors[i % c.chartColors.length]}"></div>
              </div>
              <span class="rank-value">${esc(item.formattedValue)}</span>
              <span class="rank-pct">${item.percentOfTotal.toFixed(1)}%</span>
            </div>`
        )
        .join("");

      return `<div class="ranking-group">
        <h3>${esc(r.column)} by ${esc(r.groupColumn)}</h3>
        ${bars}
      </div>`;
    })
    .join("");

  return `<div class="page${pageBreak ? " page-break" : ""}">
    <div class="section-header">
      <span class="section-number">${sectionCounter}</span>
      <h2>${esc(title)}</h2>
    </div>
    ${groups}
  </div>`;
}

function renderAnomalies(
  title: string,
  anomalies: import("@/types/report").Anomaly[],
  c: ColorScheme,
  pageBreak?: boolean
): string {
  sectionCounter++;
  const items = anomalies
    .slice(0, 10)
    .map(
      (a) =>
        `<div class="anomaly-item">
          <svg class="anomaly-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          </svg>
          <div>
            <div class="anomaly-text">${esc(a.description)}</div>
            <div class="anomaly-meta">Method: ${a.method.replace("_", " ")} | Severity: ${a.deviationScore.toFixed(1)}σ</div>
          </div>
        </div>`
    )
    .join("");

  return `<div class="page${pageBreak ? " page-break" : ""}">
    <div class="section-header">
      <span class="section-number">${sectionCounter}</span>
      <h2>${esc(title)}</h2>
    </div>
    ${items}
  </div>`;
}

function renderCorrelations(
  title: string,
  correlations: import("@/types/report").Correlation[],
  c: ColorScheme,
  pageBreak?: boolean
): string {
  sectionCounter++;
  const cards = correlations
    .slice(0, 8)
    .map((corr) => {
      const badgeClass =
        corr.strength === "strong"
          ? "corr-strong"
          : corr.strength === "moderate"
            ? "corr-moderate"
            : "corr-weak";
      const direction = corr.coefficient > 0 ? "Positive" : "Negative";

      return `<div class="corr-card">
        <div class="corr-pair">${esc(corr.columnA)} &harr; ${esc(corr.columnB)}</div>
        <span class="corr-badge ${badgeClass}">${direction} ${corr.strength} (r=${corr.coefficient.toFixed(2)})</span>
      </div>`;
    })
    .join("");

  return `<div class="page${pageBreak ? " page-break" : ""}">
    <div class="section-header">
      <span class="section-number">${sectionCounter}</span>
      <h2>${esc(title)}</h2>
    </div>
    <div class="correlation-grid">${cards}</div>
  </div>`;
}

function renderDataTable(
  title: string,
  analysis: AnalysisResult,
  c: ColorScheme,
  pageBreak?: boolean
): string {
  sectionCounter++;
  const cols = analysis.dataProfile.numericColumns.slice(0, 6);
  if (cols.length === 0) {
    return `<div class="page${pageBreak ? " page-break" : ""}">
      <div class="section-header">
        <span class="section-number">${sectionCounter}</span>
        <h2>${esc(title)}</h2>
      </div>
      <p style="color:var(--text-muted);font-size:10pt;">No numeric data to summarize.</p>
    </div>`;
  }

  const metricByName = new Map(analysis.metrics.map((m) => [m.name, m]));

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
        const t = analysis.trends.find((t) => t.column === col);
        if (!t) return "\u2014";
        const arrow = t.direction === "up" ? "\u2191" : t.direction === "down" ? "\u2193" : "\u2192";
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

  const bodyRows = rows
    .map(
      (row) =>
        `<tr><td style="font-weight:600">${esc(row.label)}</td>${row.cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`
    )
    .join("");

  return `<div class="page${pageBreak ? " page-break" : ""}">
    <div class="section-header">
      <span class="section-number">${sectionCounter}</span>
      <h2>${esc(title)}</h2>
    </div>
    <table class="data-table">
      <thead><tr><th>Metric</th>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>`;
}
