import { z } from "zod/v4";

/**validates Gemini narrative responses.
 * ensures the AI returns structured data we can safely use in reports.*/
export const narrativeResponseSchema = z.object({
  executiveSummary: z
    .string()
    .min(50, "Executive summary must be at least 50 characters"),
  sectionNarratives: z.record(z.string(), z.string()),
});

export type NarrativeResponse = z.infer<typeof narrativeResponseSchema>;

/**pre-computed stats sent to Gemini -- NOT raw user data, just aggregated metrics.*/
export const analysisContextSchema = z.object({
  metrics: z.array(
    z.object({
      name: z.string(),
      formattedValue: z.string(),
      changePercent: z.number().nullable(),
      trend: z.enum(["up", "down", "flat"]),
    })
  ),
  trends: z.array(
    z.object({
      column: z.string(),
      direction: z.enum(["up", "down", "flat"]),
      rSquared: z.number(),
    })
  ),
  anomalies: z.array(
    z.object({
      column: z.string(),
      description: z.string(),
    })
  ),
  correlations: z.array(
    z.object({
      columnA: z.string(),
      columnB: z.string(),
      coefficient: z.number(),
      strength: z.enum(["strong", "moderate", "weak", "none"]),
    })
  ),
  rankings: z.array(
    z.object({
      column: z.string(),
      groupColumn: z.string(),
      topN: z.array(
        z.object({
          label: z.string(),
          formattedValue: z.string(),
          percentOfTotal: z.number(),
        })
      ),
    })
  ),
  chartTitles: z.array(z.string()),
  templateId: z.string(),
  rowCount: z.number(),
  dateRange: z
    .object({
      min: z.string(),
      max: z.string(),
    })
    .nullable(),
});

export type AnalysisContext = z.infer<typeof analysisContextSchema>;
