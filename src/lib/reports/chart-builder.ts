import type { ChartConfig, AnalysisResult } from "@/types/report";
import type { ColorScheme, RenderedChart } from "@/types/template";
import { groupBy } from "@/lib/analytics/statistics";
import { parseNumericValue } from "@/lib/utils/data-transforms";

/**
 *hand-crafted SVG -- no React rendering needed on the server.
 */
export function buildCharts(
  rows: Record<string, unknown>[],
  analysis: AnalysisResult,
  narratives: Record<string, string>,
  colors: ColorScheme
): RenderedChart[] {
  return analysis.chartConfigs.map((config) => {
    const svgString = renderChartSvg(rows, config, colors);
    const narrative = narratives[config.title] ?? "";
    return { title: config.title, svgString, narrative };
  });
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 400;
const PADDING = { top: 40, right: 30, bottom: 60, left: 70 };
const HBAR_PADDING = { top: 40, right: 30, bottom: 60, left: 200 };
const PLOT_W = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_H = CHART_HEIGHT - PADDING.top - PADDING.bottom;

function renderChartSvg(
  rows: Record<string, unknown>[],
  config: ChartConfig,
  colors: ColorScheme
): string {
  switch (config.type) {
    case "line":
    case "area":
      return renderLineArea(rows, config, colors, config.type === "area");
    case "multi_line":
      return renderMultiLine(rows, config, colors);
    case "bar":
    case "horizontal_bar":
      return renderBar(rows, config, colors, config.type === "horizontal_bar");
    case "stacked_bar":
    case "grouped_bar":
      return renderGroupedBar(rows, config, colors);
    case "pie":
    case "donut":
      return renderPieDonut(rows, config, colors, config.type === "donut");
    case "scatter":
      return renderScatter(rows, config, colors);
    case "dual_axis":
      return renderDualAxis(rows, config, colors);
    case "stacked_area":
      return renderStackedArea(rows, config, colors);
    default:
      return renderBar(rows, config, colors, false);
  }
}

function svgWrapper(content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" preserveAspectRatio="xMidYMid meet" font-family="'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif">${content}</svg>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatAxisValue(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1);
}

function extractColumnValues(
  rows: Record<string, unknown>[],
  col: string
): number[] {
  const result: number[] = [];
  for (const row of rows) {
    const v = parseNumericValue(row[col]);
    if (v !== null) result.push(v);
  }
  return result;
}

function yAxisMarkup(
  minVal: number,
  maxVal: number,
  color: string
): string {
  const ticks = 5;
  const range = maxVal - minVal || 1;
  let lines = "";
  for (let i = 0; i <= ticks; i++) {
    const val = minVal + (range * i) / ticks;
    const y = PADDING.top + PLOT_H - (PLOT_H * i) / ticks;
    lines += `<line x1="${PADDING.left}" y1="${y}" x2="${PADDING.left + PLOT_W}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5"/>`;
    lines += `<text x="${PADDING.left - 8}" y="${y + 4}" text-anchor="end" fill="${color}" font-size="11">${formatAxisValue(val)}</text>`;
  }
  return lines;
}

function renderLineArea(
  rows: Record<string, unknown>[],
  config: ChartConfig,
  colors: ColorScheme,
  isArea: boolean
): string {
  const yCol = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;
  const values = extractColumnValues(rows, yCol);
  if (values.length === 0) return svgWrapper(`<text x="360" y="200" text-anchor="middle" fill="${colors.textMuted}">No data available</text>`);

  const labels = rows.map((r) => String(r[config.xAxis] ?? "")).slice(0, values.length);
  const minVal = Math.min(...values) * 0.95;
  const maxVal = Math.max(...values) * 1.05;
  const range = maxVal - minVal || 1;

  const points = values.map((v, i) => {
    const x = PADDING.left + (PLOT_W * i) / Math.max(values.length - 1, 1);
    const y = PADDING.top + PLOT_H - ((v - minVal) / range) * PLOT_H;
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  let areaPath = "";
  if (isArea) {
    const areaD = pathD + ` L ${points[points.length - 1].x.toFixed(1)} ${PADDING.top + PLOT_H} L ${points[0].x.toFixed(1)} ${PADDING.top + PLOT_H} Z`;
    areaPath = `<path d="${areaD}" fill="${colors.chartColors[0]}" fill-opacity="0.15"/>`;
  }

  const step = Math.max(1, Math.floor(labels.length / 10));
  let xLabels = "";
  for (let i = 0; i < labels.length; i += step) {
    const x = PADDING.left + (PLOT_W * i) / Math.max(values.length - 1, 1);
    const label = labels[i].length > 10 ? labels[i].slice(0, 10) : labels[i];
    xLabels += `<text x="${x}" y="${PADDING.top + PLOT_H + 20}" text-anchor="middle" fill="${colors.textMuted}" font-size="10" transform="rotate(-30 ${x} ${PADDING.top + PLOT_H + 20})">${esc(label)}</text>`;
  }

  return svgWrapper(`
    ${yAxisMarkup(minVal, maxVal, colors.textMuted)}
    ${areaPath}
    <path d="${pathD}" fill="none" stroke="${colors.chartColors[0]}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${points.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${colors.chartColors[0]}" stroke="#fff" stroke-width="1.5"/>`).join("")}
    ${xLabels}
  `);
}

function renderMultiLine(
  rows: Record<string, unknown>[],
  config: ChartConfig,
  colors: ColorScheme
): string {
  const yCols = Array.isArray(config.yAxis) ? config.yAxis : [config.yAxis];
  const allValues: number[][] = yCols.map((col) => extractColumnValues(rows, col));
  const flat = allValues.flat();
  if (flat.length === 0) return svgWrapper(`<text x="360" y="200" text-anchor="middle" fill="${colors.textMuted}">No data</text>`);

  const minVal = Math.min(...flat) * 0.95;
  const maxVal = Math.max(...flat) * 1.05;
  const range = maxVal - minVal || 1;

  let paths = "";
  yCols.forEach((col, ci) => {
    const vals = allValues[ci];
    const d = vals.map((v, i) => {
      const x = PADDING.left + (PLOT_W * i) / Math.max(vals.length - 1, 1);
      const y = PADDING.top + PLOT_H - ((v - minVal) / range) * PLOT_H;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
    paths += `<path d="${d}" fill="none" stroke="${colors.chartColors[ci % colors.chartColors.length]}" stroke-width="2" stroke-linecap="round"/>`;
  });

  const legend = yCols.map((col, i) => {
    const x = PADDING.left + i * 140;
    return `<rect x="${x}" y="8" width="12" height="12" rx="2" fill="${colors.chartColors[i % colors.chartColors.length]}"/>
      <text x="${x + 16}" y="18" fill="${colors.text}" font-size="11">${esc(col)}</text>`;
  }).join("");

  return svgWrapper(`
    ${yAxisMarkup(minVal, maxVal, colors.textMuted)}
    ${paths}
    ${legend}
  `);
}

function renderBar(
  rows: Record<string, unknown>[],
  config: ChartConfig,
  colors: ColorScheme,
  horizontal: boolean
): string {
  const yCol = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;
  const grouped = groupBy(rows, config.xAxis, yCol, "sum");
  const items = grouped.slice(0, 12);
  if (items.length === 0) return svgWrapper(`<text x="360" y="200" text-anchor="middle" fill="${colors.textMuted}">No data</text>`);

  const maxVal = Math.max(...items.map((g) => g.value));

  if (horizontal) {
    const hPlotW = CHART_WIDTH - HBAR_PADDING.left - HBAR_PADDING.right;
    const hPlotH = CHART_HEIGHT - HBAR_PADDING.top - HBAR_PADDING.bottom;
    const barH = Math.min(30, hPlotH / items.length - 4);
    const bars = items.map((item, i) => {
      const y = HBAR_PADDING.top + (hPlotH * i) / items.length + 2;
      const w = maxVal > 0 ? (item.value / maxVal) * hPlotW : 0;
      const label = item.group.length > 26 ? item.group.slice(0, 24) + "…" : item.group;
      const fullName = esc(item.group);
      return `<rect x="${HBAR_PADDING.left}" y="${y}" width="${w}" height="${barH}" rx="3" fill="${colors.chartColors[i % colors.chartColors.length]}"/>
        <text x="${HBAR_PADDING.left - 8}" y="${y + barH / 2 + 4}" text-anchor="end" fill="${colors.text}" font-size="11"><title>${fullName}</title>${esc(label)}</text>
        <text x="${HBAR_PADDING.left + w + 6}" y="${y + barH / 2 + 4}" fill="${colors.textMuted}" font-size="10">${formatAxisValue(item.value)}</text>`;
    }).join("");
    return svgWrapper(bars);
  }

  const barW = Math.min(50, PLOT_W / items.length - 8);
  const bars = items.map((item, i) => {
    const x = PADDING.left + (PLOT_W * i) / items.length + (PLOT_W / items.length - barW) / 2;
    const h = maxVal > 0 ? (item.value / maxVal) * PLOT_H : 0;
    const y = PADDING.top + PLOT_H - h;
    const label = item.group.length > 14 ? item.group.slice(0, 12) + "…" : item.group;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3" fill="${colors.chartColors[i % colors.chartColors.length]}"/>
      <text x="${x + barW / 2}" y="${PADDING.top + PLOT_H + 18}" text-anchor="middle" fill="${colors.textMuted}" font-size="10" transform="rotate(-25 ${x + barW / 2} ${PADDING.top + PLOT_H + 18})">${esc(label)}</text>`;
  }).join("");

  return svgWrapper(`
    ${yAxisMarkup(0, maxVal, colors.textMuted)}
    ${bars}
  `);
}

function renderGroupedBar(
  rows: Record<string, unknown>[],
  config: ChartConfig,
  colors: ColorScheme
): string {
  if (!config.groupBy) return renderBar(rows, config, colors, false);

  const yCol = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;
  const groups = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const xKey = String(row[config.xAxis] ?? "");
    const gKey = String(row[config.groupBy] ?? "");
    const v = parseNumericValue(row[yCol]) ?? 0;

    if (!groups.has(xKey)) groups.set(xKey, new Map());
    const g = groups.get(xKey)!;
    g.set(gKey, (g.get(gKey) ?? 0) + v);
  }

  const xKeys = Array.from(groups.keys()).slice(0, 10);
  const gKeys = Array.from(new Set(rows.map((r) => String(r[config.groupBy!] ?? "")))).slice(0, 6);

  let maxStack = 0;
  for (const xKey of xKeys) {
    let stackTotal = 0;
    const g = groups.get(xKey)!;
    for (const gKey of gKeys) stackTotal += g.get(gKey) ?? 0;
    maxStack = Math.max(maxStack, stackTotal);
  }

  const barW = Math.min(50, PLOT_W / xKeys.length - 8);
  let bars = "";
  for (let xi = 0; xi < xKeys.length; xi++) {
    const x = PADDING.left + (PLOT_W * xi) / xKeys.length + (PLOT_W / xKeys.length - barW) / 2;
    let yOffset = 0;
    const g = groups.get(xKeys[xi])!;
    for (let gi = 0; gi < gKeys.length; gi++) {
      const val = g.get(gKeys[gi]) ?? 0;
      const h = maxStack > 0 ? (val / maxStack) * PLOT_H : 0;
      const y = PADDING.top + PLOT_H - yOffset - h;
      bars += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${colors.chartColors[gi % colors.chartColors.length]}"/>`;
      yOffset += h;
    }
    const label = xKeys[xi].length > 8 ? xKeys[xi].slice(0, 8) + "…" : xKeys[xi];
    bars += `<text x="${x + barW / 2}" y="${PADDING.top + PLOT_H + 18}" text-anchor="middle" fill="${colors.textMuted}" font-size="10">${esc(label)}</text>`;
  }

  const legend = gKeys.map((key, i) => {
    const lx = PADDING.left + i * 120;
    return `<rect x="${lx}" y="8" width="12" height="12" rx="2" fill="${colors.chartColors[i % colors.chartColors.length]}"/>
      <text x="${lx + 16}" y="18" fill="${colors.text}" font-size="11">${esc(key.slice(0, 12))}</text>`;
  }).join("");

  return svgWrapper(`
    ${yAxisMarkup(0, maxStack, colors.textMuted)}
    ${bars}
    ${legend}
  `);
}

function renderPieDonut(
  rows: Record<string, unknown>[],
  config: ChartConfig,
  colors: ColorScheme,
  isDonut: boolean
): string {
  const yCol = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;
  const grouped = groupBy(rows, config.xAxis, yCol, "sum");
  const items = grouped.slice(0, 8);
  const total = items.reduce((s, g) => s + g.value, 0);
  if (total === 0) return svgWrapper(`<text x="360" y="200" text-anchor="middle" fill="${colors.textMuted}">No data</text>`);

  const cx = CHART_WIDTH / 2;
  const cy = CHART_HEIGHT / 2;
  const r = 140;
  const innerR = isDonut ? r * 0.6 : 0;

  let startAngle = -Math.PI / 2;
  let slices = "";
  let legends = "";

  items.forEach((item, i) => {
    const pct = item.value / total;
    const angle = pct * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(startAngle);
    const iy1 = cy + innerR * Math.sin(startAngle);
    const ix2 = cx + innerR * Math.cos(endAngle);
    const iy2 = cy + innerR * Math.sin(endAngle);

    if (isDonut) {
      slices += `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${ix2.toFixed(1)} ${iy2.toFixed(1)} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1.toFixed(1)} ${iy1.toFixed(1)} Z" fill="${colors.chartColors[i % colors.chartColors.length]}" stroke="#fff" stroke-width="2"/>`;
    } else {
      slices += `<path d="M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${colors.chartColors[i % colors.chartColors.length]}" stroke="#fff" stroke-width="2"/>`;
    }

    const ly = 40 + i * 24;
    const lx = CHART_WIDTH - 180;
    const label = item.group.length > 14 ? item.group.slice(0, 14) + "…" : item.group;
    legends += `<rect x="${lx}" y="${ly - 8}" width="10" height="10" rx="2" fill="${colors.chartColors[i % colors.chartColors.length]}"/>
      <text x="${lx + 16}" y="${ly}" fill="${colors.text}" font-size="11">${esc(label)} (${(pct * 100).toFixed(0)}%)</text>`;

    startAngle = endAngle;
  });

  let centerLabel = "";
  if (isDonut) {
    centerLabel = `<text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="${colors.text}" font-size="14" font-weight="600">${formatAxisValue(total)}</text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="${colors.textMuted}" font-size="11">Total</text>`;
  }

  return svgWrapper(`${slices}${centerLabel}${legends}`);
}

function renderScatter(
  rows: Record<string, unknown>[],
  config: ChartConfig,
  colors: ColorScheme
): string {
  const yCol = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;
  const xVals = extractColumnValues(rows, config.xAxis);
  const yVals = extractColumnValues(rows, yCol);
  const n = Math.min(xVals.length, yVals.length, 200);
  if (n === 0) return svgWrapper(`<text x="360" y="200" text-anchor="middle" fill="${colors.textMuted}">No data</text>`);

  const xMin = Math.min(...xVals.slice(0, n));
  const xMax = Math.max(...xVals.slice(0, n));
  const yMin = Math.min(...yVals.slice(0, n));
  const yMax = Math.max(...yVals.slice(0, n));
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const dots = Array.from({ length: n }, (_, i) => {
    const x = PADDING.left + ((xVals[i] - xMin) / xRange) * PLOT_W;
    const y = PADDING.top + PLOT_H - ((yVals[i] - yMin) / yRange) * PLOT_H;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${colors.chartColors[0]}" fill-opacity="0.6" stroke="${colors.chartColors[0]}" stroke-width="1"/>`;
  }).join("");

  const xLabel = `<text x="${PADDING.left + PLOT_W / 2}" y="${CHART_HEIGHT - 8}" text-anchor="middle" fill="${colors.textMuted}" font-size="12">${esc(config.xAxis)}</text>`;
  const yLabel = `<text x="14" y="${PADDING.top + PLOT_H / 2}" text-anchor="middle" fill="${colors.textMuted}" font-size="12" transform="rotate(-90 14 ${PADDING.top + PLOT_H / 2})">${esc(yCol)}</text>`;

  return svgWrapper(`
    ${yAxisMarkup(yMin, yMax, colors.textMuted)}
    ${dots}
    ${xLabel}
    ${yLabel}
  `);
}

function renderDualAxis(
  rows: Record<string, unknown>[],
  config: ChartConfig,
  colors: ColorScheme
): string {
  const yCols = Array.isArray(config.yAxis) ? config.yAxis.slice(0, 2) : [config.yAxis];
  if (yCols.length < 2) return renderLineArea(rows, config, colors, false);

  const vals1 = extractColumnValues(rows, yCols[0]);
  const vals2 = extractColumnValues(rows, yCols[1]);
  const n = Math.min(vals1.length, vals2.length);
  if (n === 0) return svgWrapper(`<text x="360" y="200" text-anchor="middle" fill="${colors.textMuted}">No data</text>`);

  const min1 = Math.min(...vals1) * 0.95;
  const max1 = Math.max(...vals1) * 1.05;
  const min2 = Math.min(...vals2) * 0.95;
  const max2 = Math.max(...vals2) * 1.05;
  const range1 = max1 - min1 || 1;
  const range2 = max2 - min2 || 1;

  const path1 = vals1.slice(0, n).map((v, i) => {
    const x = PADDING.left + (PLOT_W * i) / Math.max(n - 1, 1);
    const y = PADDING.top + PLOT_H - ((v - min1) / range1) * PLOT_H;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  const path2 = vals2.slice(0, n).map((v, i) => {
    const x = PADDING.left + (PLOT_W * i) / Math.max(n - 1, 1);
    const y = PADDING.top + PLOT_H - ((v - min2) / range2) * PLOT_H;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  let rightAxis = "";
  for (let i = 0; i <= 5; i++) {
    const val = min2 + (range2 * i) / 5;
    const y = PADDING.top + PLOT_H - (PLOT_H * i) / 5;
    rightAxis += `<text x="${PADDING.left + PLOT_W + 8}" y="${y + 4}" fill="${colors.chartColors[1]}" font-size="11">${formatAxisValue(val)}</text>`;
  }

  const legend = `
    <rect x="${PADDING.left}" y="8" width="12" height="12" rx="2" fill="${colors.chartColors[0]}"/>
    <text x="${PADDING.left + 16}" y="18" fill="${colors.text}" font-size="11">${esc(yCols[0])}</text>
    <rect x="${PADDING.left + 160}" y="8" width="12" height="12" rx="2" fill="${colors.chartColors[1]}"/>
    <text x="${PADDING.left + 176}" y="18" fill="${colors.text}" font-size="11">${esc(yCols[1])}</text>
  `;

  return svgWrapper(`
    ${yAxisMarkup(min1, max1, colors.chartColors[0])}
    ${rightAxis}
    <path d="${path1}" fill="none" stroke="${colors.chartColors[0]}" stroke-width="2.5"/>
    <path d="${path2}" fill="none" stroke="${colors.chartColors[1]}" stroke-width="2.5" stroke-dasharray="6 3"/>
    ${legend}
  `);
}

function renderStackedArea(
  rows: Record<string, unknown>[],
  config: ChartConfig,
  colors: ColorScheme
): string {
  const yCols = Array.isArray(config.yAxis) ? config.yAxis.slice(0, 5) : [config.yAxis];
  const allValues = yCols.map((col) => extractColumnValues(rows, col));
  const n = Math.min(...allValues.map((v) => v.length));
  if (n === 0) return svgWrapper(`<text x="360" y="200" text-anchor="middle" fill="${colors.textMuted}">No data</text>`);

  let maxStack = 0;
  for (let i = 0; i < n; i++) {
    let stack = 0;
    for (const vals of allValues) stack += vals[i];
    maxStack = Math.max(maxStack, stack);
  }
  maxStack = maxStack * 1.05 || 1;

  const prevY = new Array(n).fill(PADDING.top + PLOT_H);
  let areas = "";

  for (let ci = 0; ci < yCols.length; ci++) {
    const vals = allValues[ci];
    const currentY = vals.map((v, i) => {
      const h = (v / maxStack) * PLOT_H;
      return prevY[i] - h;
    });

    const topPath = currentY.map((y, i) => {
      const x = PADDING.left + (PLOT_W * i) / Math.max(n - 1, 1);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");

    const bottomPath = Array.from({ length: n }, (_, i) => {
      const x = PADDING.left + (PLOT_W * (n - 1 - i)) / Math.max(n - 1, 1);
      return `L ${x.toFixed(1)} ${prevY[n - 1 - i].toFixed(1)}`;
    }).join(" ");

    areas += `<path d="${topPath} ${bottomPath} Z" fill="${colors.chartColors[ci % colors.chartColors.length]}" fill-opacity="0.7"/>`;

    for (let i = 0; i < n; i++) prevY[i] = currentY[i];
  }

  const legend = yCols.map((col, i) => {
    const lx = PADDING.left + i * 120;
    return `<rect x="${lx}" y="8" width="12" height="12" rx="2" fill="${colors.chartColors[i % colors.chartColors.length]}"/>
      <text x="${lx + 16}" y="18" fill="${colors.text}" font-size="11">${esc(col)}</text>`;
  }).join("");

  return svgWrapper(`
    ${yAxisMarkup(0, maxStack, colors.textMuted)}
    ${areas}
    ${legend}
  `);
}
