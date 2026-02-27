import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AnalysisResult, NarrativeResult } from "@/types/report";
import type { AnalysisContext } from "@/lib/ai/schemas";
import { narrativeResponseSchema } from "@/lib/ai/schemas";
import {
  buildExecutiveSummaryPrompt,
  buildSectionNarrativePrompt,
} from "@/lib/ai/prompts";
import { generateFallbackNarrative } from "@/lib/ai/fallback";

const MODEL = "gemini-2.0-flash";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const REQUEST_TIMEOUT_MS = 15_000;

/**singleton Gemini client -- initialized lazily*/
let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  if (genAI) return genAI;

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) return null;

  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

/**convert AnalysisResult to the lightweight context we send to Gemini.
 * NEVER sends raw user data -- only pre-computed aggregates.*/
export function buildAnalysisContext(
  analysis: AnalysisResult
): AnalysisContext {
  return {
    metrics: analysis.metrics.map((m) => ({
      name: m.name,
      formattedValue: m.formattedValue,
      changePercent: m.changePercent,
      trend: m.trend,
    })),
    trends: analysis.trends.map((t) => ({
      column: t.column,
      direction: t.direction,
      rSquared: t.rSquared,
    })),
    anomalies: analysis.anomalies.slice(0, 5).map((a) => ({
      column: a.column,
      description: a.description,
    })),
    correlations: analysis.correlations.slice(0, 5).map((c) => ({
      columnA: c.columnA,
      columnB: c.columnB,
      coefficient: c.coefficient,
      strength: c.strength,
    })),
    rankings: analysis.rankings.slice(0, 3).map((r) => ({
      column: r.column,
      groupColumn: r.groupColumn,
      topN: r.topN.slice(0, 3).map((t) => ({
        label: t.label,
        formattedValue: t.formattedValue,
        percentOfTotal: t.percentOfTotal,
      })),
    })),
    chartTitles: analysis.chartConfigs.map((c) => c.title),
    templateId: analysis.templateId,
    rowCount: analysis.dataProfile.rowCount,
    dateRange: analysis.dataProfile.dateRange,
  };
}

/**generate narratives using Gemini Flash (free tier).
 * falls back to template-based narratives on any failure.*/
export async function generateNarrative(
  analysis: AnalysisResult
): Promise<NarrativeResult> {
  const client = getClient();
  if (!client) {
    return generateFallbackNarrative(analysis);
  }

  const ctx = buildAnalysisContext(analysis);

  try {
    const [summary, sections] = await Promise.all([
      callGemini(client, buildExecutiveSummaryPrompt(ctx)),
      callGemini(client, buildSectionNarrativePrompt(ctx)),
    ]);

    const summaryJson = parseJsonResponse(summary);
    const sectionsJson = parseJsonResponse(sections);

    const executiveSummary =
      summaryJson?.executiveSummary ?? sectionsJson?.executiveSummary;
    const sectionNarratives =
      sectionsJson?.sectionNarratives ?? summaryJson?.sectionNarratives ?? {};

    if (!executiveSummary) {
      return generateFallbackNarrative(analysis);
    }

    const parsed = narrativeResponseSchema.safeParse({
      executiveSummary,
      sectionNarratives,
    });

    if (!parsed.success) {
      return generateFallbackNarrative(analysis);
    }

    return {
      executiveSummary: parsed.data.executiveSummary,
      sectionNarratives: parsed.data.sectionNarratives,
      source: "gemini",
    };
  } catch {
    return generateFallbackNarrative(analysis);
  }
}

/**call Gemini with retry + exponential backoff + timeout.*/
async function callGemini(
  client: GoogleGenerativeAI,
  prompt: string,
  retries = MAX_RETRIES
): Promise<string> {
  const model = client.getGenerativeModel({ model: MODEL });

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await withTimeout(
        model.generateContent(prompt),
        REQUEST_TIMEOUT_MS
      );
      const text = result.response.text();
      if (text) return text;
    } catch (error: unknown) {
      const isLast = attempt === retries - 1;
      if (isLast) throw error;

      const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  throw new Error("Gemini: max retries exceeded");
}

/**parse a JSON response from Gemini, handling markdown code fences.*/
function parseJsonResponse(text: string): Record<string, unknown> | null {
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Request timed out after ${ms}ms`)),
      ms
    );
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
