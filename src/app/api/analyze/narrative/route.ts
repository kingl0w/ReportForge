import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { generateNarrative } from "@/lib/ai/client";
import { generateFallbackNarrative } from "@/lib/ai/fallback";
import { createRateLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { AnalysisResult } from "@/types/report";

const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 15,
  message: "Too many narrative requests. Please wait a minute.",
});

/*POST /api/analyze/narrative
 *
 * generates natural language narratives from pre-computed analysis results.
 * uses Gemini Flash free tier with automatic fallback to template-based text.
 *
 * input: AnalysisResult (NOT raw data)
 * output: NarrativeResult { executiveSummary, sectionNarratives, source }*/

const narrativeRequestSchema = z.object({
  metrics: z.array(z.object({
    name: z.string(),
    value: z.number(),
    formattedValue: z.string(),
    previousValue: z.number().nullable(),
    changePercent: z.number().nullable(),
    trend: z.enum(["up", "down", "flat"]),
  })),
  trends: z.array(z.object({
    column: z.string(),
    direction: z.enum(["up", "down", "flat"]),
    slope: z.number(),
    rSquared: z.number(),
    periods: z.number(),
    movingAverage: z.array(z.number()),
  })),
  anomalies: z.array(z.object({
    column: z.string(),
    rowIndex: z.number(),
    value: z.number(),
    expected: z.number(),
    deviationScore: z.number(),
    method: z.enum(["iqr", "zscore", "sudden_change"]),
    description: z.string(),
  })),
  rankings: z.array(z.object({
    column: z.string(),
    groupColumn: z.string(),
    topN: z.array(z.object({
      label: z.string(),
      value: z.number(),
      formattedValue: z.string(),
      percentOfTotal: z.number(),
    })),
    bottomN: z.array(z.object({
      label: z.string(),
      value: z.number(),
      formattedValue: z.string(),
      percentOfTotal: z.number(),
    })),
  })),
  correlations: z.array(z.object({
    columnA: z.string(),
    columnB: z.string(),
    coefficient: z.number(),
    strength: z.enum(["strong", "moderate", "weak", "none"]),
  })),
  chartConfigs: z.array(z.object({
    type: z.string(),
    title: z.string(),
    xAxis: z.string(),
    yAxis: z.union([z.string(), z.array(z.string())]),
    groupBy: z.string().optional(),
    color: z.string().optional(),
    priority: z.number(),
  })),
  templateId: z.string(),
  dataProfile: z.object({
    rowCount: z.number(),
    dateRange: z.object({ min: z.string(), max: z.string() }).nullable(),
    numericColumns: z.array(z.string()),
    categoricalColumns: z.array(z.string()),
    dateColumns: z.array(z.string()),
    currencyColumns: z.array(z.string()),
    percentageColumns: z.array(z.string()),
  }),
});

//simple in-memory cache keyed by a hash of the analysis metrics
const narrativeCache = new Map<string, { result: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; //5 minutes

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const rl = await limiter.checkAsync(user.id);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: rl.message, code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const body = await request.json();

    const parsed = narrativeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid analysis result",
          code: "INVALID_INPUT",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const analysis = parsed.data as AnalysisResult;

    const cacheKey = computeCacheKey(analysis);
    const cached = narrativeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.result);
    }

    const narrative = await generateNarrative(analysis);

    narrativeCache.set(cacheKey, {
      result: narrative,
      timestamp: Date.now(),
    });

    //evict stale cache entries periodically
    if (narrativeCache.size > 100) {
      const now = Date.now();
      for (const [key, entry] of narrativeCache) {
        if (now - entry.timestamp > CACHE_TTL_MS) {
          narrativeCache.delete(key);
        }
      }
    }

    return NextResponse.json(narrative);
  } catch (error: unknown) {
    //on any unexpected error, still return a fallback narrative
    try {
      const body = await request.clone().json();
      const fallback = generateFallbackNarrative(body as AnalysisResult);
      return NextResponse.json(fallback);
    } catch {
      const message =
        error instanceof Error ? error.message : "Narrative generation failed";
      return NextResponse.json(
        { error: message, code: "NARRATIVE_ERROR" },
        { status: 500 }
      );
    }
  }
}

function computeCacheKey(analysis: AnalysisResult): string {
  //hash based on metric names + values + template — lightweight fingerprint
  const parts = [
    analysis.templateId,
    analysis.dataProfile.rowCount.toString(),
    ...analysis.metrics.map((m) => `${m.name}:${m.value}`),
  ];
  return parts.join("|");
}
