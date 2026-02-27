import type { AnalysisContext } from "@/lib/ai/schemas";

/**input: pre-computed statistics (NOT raw data) -- keeps token usage minimal.
 * target: ~500 tokens in, ~300 tokens out.*/
export function buildExecutiveSummaryPrompt(ctx: AnalysisContext): string {
  const metricLines = ctx.metrics
    .map((m) => {
      let line = `- ${m.name}: ${m.formattedValue}`;
      if (m.changePercent !== null) {
        const dir = m.changePercent > 0 ? "+" : "";
        line += ` (${dir}${m.changePercent.toFixed(1)}% change, trend: ${m.trend})`;
      }
      return line;
    })
    .join("\n");

  const trendLines = ctx.trends
    .filter((t) => t.direction !== "flat")
    .map((t) => `- ${t.column}: trending ${t.direction} (R²=${t.rSquared.toFixed(2)})`)
    .join("\n");

  const anomalyLines = ctx.anomalies
    .slice(0, 5)
    .map((a) => `- ${a.description}`)
    .join("\n");

  const correlationLines = ctx.correlations
    .filter((c) => c.strength === "strong" || c.strength === "moderate")
    .slice(0, 3)
    .map(
      (c) =>
        `- ${c.columnA} and ${c.columnB}: ${c.strength} correlation (r=${c.coefficient.toFixed(2)})`
    )
    .join("\n");

  const dateInfo = ctx.dateRange
    ? `Data spans from ${ctx.dateRange.min} to ${ctx.dateRange.max}.`
    : "No date range detected.";

  return `You are a professional data analyst writing a report for a business client.
Given these pre-computed statistics from a dataset of ${ctx.rowCount} rows, write a concise 2-paragraph executive summary.

${dateInfo}

KEY METRICS:
${metricLines || "No key metrics available."}

TRENDS:
${trendLines || "No significant trends detected."}

ANOMALIES:
${anomalyLines || "No anomalies detected."}

CORRELATIONS:
${correlationLines || "No notable correlations found."}

Instructions:
- Write exactly 2 paragraphs
- First paragraph: high-level performance overview with the most important numbers
- Second paragraph: notable trends, anomalies, or actionable insights
- Use professional business language
- Be specific with numbers — cite the actual values
- Do NOT invent data points that aren't listed above
- Keep it under 200 words total

Respond with ONLY a JSON object in this exact format:
{"executiveSummary": "Your two paragraph summary here..."}`;
}

/**called once with all chart titles to minimize API calls.*/
export function buildSectionNarrativePrompt(ctx: AnalysisContext): string {
  const metricLines = ctx.metrics
    .map((m) => {
      let line = `- ${m.name}: ${m.formattedValue}`;
      if (m.changePercent !== null) {
        const dir = m.changePercent > 0 ? "+" : "";
        line += ` (${dir}${m.changePercent.toFixed(1)}%)`;
      }
      return line;
    })
    .join("\n");

  const rankingLines = ctx.rankings
    .slice(0, 3)
    .map((r) => {
      const top = r.topN
        .slice(0, 3)
        .map((t) => `${t.label} (${t.formattedValue}, ${t.percentOfTotal}%)`)
        .join(", ");
      return `- ${r.column} by ${r.groupColumn}: Top items — ${top}`;
    })
    .join("\n");

  const chartList = ctx.chartTitles.map((t) => `- "${t}"`).join("\n");

  return `You are a professional data analyst writing section descriptions for a data report.

KEY METRICS:
${metricLines || "No key metrics."}

RANKINGS:
${rankingLines || "No rankings."}

CHART SECTIONS:
${chartList}

For each chart section listed above, write a brief 1-2 sentence description that explains what the chart shows and highlights the most important insight. The description should help the reader understand what to focus on.

Instructions:
- Write a short narrative for EACH chart section
- Reference specific numbers from the metrics when relevant
- Keep each narrative to 1-2 sentences (max 50 words each)
- Use professional but accessible language
- Do NOT invent data points

Respond with ONLY a JSON object where keys are the exact chart titles and values are the narratives:
{"sectionNarratives": {"Chart Title 1": "Description...", "Chart Title 2": "Description..."}}`;
}
