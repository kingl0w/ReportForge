import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { analyzeDataset } from "@/lib/analytics/engine";
import { columnSchema, dataSetMetadataSchema } from "@/lib/utils/validation";
import { createRateLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 20,
  message: "Too many analysis requests. Please wait a minute.",
});

/*POST /api/analyze
 *
 * runs the local statistical analysis engine on the provided dataset.
 * all computation is local TypeScript — zero API calls.
 * returns the full AnalysisResult in milliseconds.*/

const analyzeRequestSchema = z.object({
  columns: z.array(columnSchema),
  rows: z.array(z.record(z.string(), z.unknown())),
  rowCount: z.number().int().min(1),
  metadata: dataSetMetadataSchema,
});

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

    const parsed = analyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid dataset",
          code: "INVALID_INPUT",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    //guard against excessively large datasets
    if (data.rows.length > 50_000) {
      return NextResponse.json(
        {
          error: "Dataset too large. Maximum 50,000 rows supported.",
          code: "DATASET_TOO_LARGE",
        },
        { status: 413 }
      );
    }

    const result = analyzeDataset({
      columns: data.columns,
      rows: data.rows,
      rowCount: data.rowCount,
      metadata: data.metadata,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json(
      { error: message, code: "ANALYSIS_ERROR" },
      { status: 500 }
    );
  }
}
