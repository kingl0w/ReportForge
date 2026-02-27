export interface KeyMetric {
  name: string;
  value: number;
  formattedValue: string;
  previousValue: number | null;
  changePercent: number | null;
  trend: "up" | "down" | "flat";
}

export interface TrendResult {
  column: string;
  direction: "up" | "down" | "flat";
  slope: number;
  /*R-squared value (0-1) indicating how well the trend fits*/
  rSquared: number;
  periods: number;
  movingAverage: number[];
}

export interface Anomaly {
  column: string;
  rowIndex: number;
  value: number;
  expected: number;
  deviationScore: number;
  method: "iqr" | "zscore" | "sudden_change";
  description: string;
}

export interface RankingResult {
  column: string;
  groupColumn: string;
  topN: RankedItem[];
  bottomN: RankedItem[];
}

export interface RankedItem {
  label: string;
  value: number;
  formattedValue: string;
  percentOfTotal: number;
}

export interface Correlation {
  columnA: string;
  columnB: string;
  coefficient: number;
  strength: "strong" | "moderate" | "weak" | "none";
}

export type ChartType =
  | "line"
  | "multi_line"
  | "area"
  | "stacked_area"
  | "bar"
  | "horizontal_bar"
  | "stacked_bar"
  | "grouped_bar"
  | "pie"
  | "donut"
  | "scatter"
  | "dual_axis";

export interface ChartConfig {
  type: ChartType;
  title: string;
  xAxis: string;
  yAxis: string | string[];
  groupBy?: string;
  color?: string;
  priority: number;
}

export interface DataProfile {
  rowCount: number;
  dateRange: { min: string; max: string } | null;
  numericColumns: string[];
  categoricalColumns: string[];
  dateColumns: string[];
  currencyColumns: string[];
  percentageColumns: string[];
}

export interface AnalysisResult {
  metrics: KeyMetric[];
  trends: TrendResult[];
  anomalies: Anomaly[];
  rankings: RankingResult[];
  correlations: Correlation[];
  chartConfigs: ChartConfig[];
  templateId: string;
  dataProfile: DataProfile;
}

export interface NarrativeResult {
  executiveSummary: string;
  sectionNarratives: Record<string, string>;
  source: "gemini" | "fallback";
}
