"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChartConfig, ChartType } from "@/types/report";

interface ChartConfiguratorProps {
  configs: ChartConfig[];
  overrides: Record<string, ChartType>;
  onOverridesChange: (overrides: Record<string, ChartType>) => void;
}

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  line: "Line",
  multi_line: "Multi-Line",
  area: "Area",
  stacked_area: "Stacked Area",
  bar: "Bar",
  horizontal_bar: "Horizontal Bar",
  stacked_bar: "Stacked Bar",
  grouped_bar: "Grouped Bar",
  pie: "Pie",
  donut: "Donut",
  scatter: "Scatter",
  dual_axis: "Dual Axis",
};

const ALL_CHART_TYPES = Object.keys(CHART_TYPE_LABELS) as ChartType[];

export default function ChartConfigurator({
  configs,
  overrides,
  onOverridesChange,
}: ChartConfiguratorProps) {
  if (configs.length === 0) return null;

  return (
    <div className="space-y-3">
      {configs.map((config, index) => {
        const currentType = overrides[config.title] ?? config.type;

        return (
          <div
            key={`${config.title}-${index}`}
            className="flex items-center justify-between gap-4"
          >
            <span className="min-w-0 truncate text-sm text-foreground">
              {config.title}
            </span>
            <Select
              value={currentType}
              onValueChange={(value: ChartType) => {
                const next = { ...overrides };
                if (value === config.type) {
                  delete next[config.title];
                } else {
                  next[config.title] = value;
                }
                onOverridesChange(next);
              }}
            >
              <SelectTrigger className="w-40 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_CHART_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {CHART_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
