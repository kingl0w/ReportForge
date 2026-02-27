"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BuilderSection } from "@/types/builder";
import type { ChartType } from "@/types/report";

const AUTO_VALUE = "__auto__";

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "multi_line", label: "Multi-Line" },
  { value: "stacked_area", label: "Stacked Area" },
  { value: "bar", label: "Bar" },
  { value: "horizontal_bar", label: "Horizontal Bar" },
  { value: "stacked_bar", label: "Stacked Bar" },
  { value: "grouped_bar", label: "Grouped Bar" },
  { value: "pie", label: "Pie" },
  { value: "donut", label: "Donut" },
  { value: "scatter", label: "Scatter" },
  { value: "dual_axis", label: "Dual Axis" },
];

interface SectionConfiguratorProps {
  section: BuilderSection;
  onUpdate: (updates: Partial<BuilderSection>) => void;
  availableColumns?: string[];
}

export default function SectionConfigurator({
  section,
  onUpdate,
  availableColumns = [],
}: SectionConfiguratorProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Section Settings
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
          {section.title}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="section-title" className="text-xs">
          Title
        </Label>
        <Input
          id="section-title"
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="h-8 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="page-break"
          checked={section.pageBreakBefore}
          onCheckedChange={(checked) =>
            onUpdate({ pageBreakBefore: checked === true })
          }
        />
        <Label htmlFor="page-break" className="text-xs">
          Start on new page
        </Label>
      </div>

      {section.type === "chart" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Chart Type</Label>
            <Select
              value={section.chartType ?? "bar"}
              onValueChange={(v) => onUpdate({ chartType: v as ChartType })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableColumns.length > 0 && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">X-Axis Column</Label>
                <Select
                  value={section.xAxisColumn ?? AUTO_VALUE}
                  onValueChange={(v) =>
                    onUpdate({ xAxisColumn: v === AUTO_VALUE ? undefined : v })
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Auto-detect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AUTO_VALUE}>Auto-detect</SelectItem>
                    {availableColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Y-Axis Column</Label>
                <Select
                  value={section.yAxisColumns?.[0] ?? AUTO_VALUE}
                  onValueChange={(v) =>
                    onUpdate({
                      yAxisColumns: v === AUTO_VALUE ? undefined : [v],
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Auto-detect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AUTO_VALUE}>Auto-detect</SelectItem>
                    {availableColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      )}

      {section.type === "rankings" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Number of Items</Label>
            <Select
              value={String(section.rankingCount ?? 5)}
              onValueChange={(v) => onUpdate({ rankingCount: Number(v) })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Top 3</SelectItem>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="15">Top 15</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {section.type === "data_table" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Max Rows</Label>
            <Select
              value={String(section.maxRows ?? 20)}
              onValueChange={(v) => onUpdate({ maxRows: Number(v) })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 rows</SelectItem>
                <SelectItem value="20">20 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {section.type === "text_block" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Content</Label>
          <textarea
            value={section.content ?? ""}
            onChange={(e) => onUpdate({ content: e.target.value })}
            rows={5}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Enter custom text for this section..."
          />
        </div>
      )}

      {section.type === "key_metrics" && availableColumns.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">Metric Columns</Label>
          <p className="text-[10px] text-muted-foreground">
            Leave empty for auto-detection
          </p>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {availableColumns.map((col) => {
              const selected = section.metricColumns?.includes(col) ?? false;
              return (
                <div key={col} className="flex items-center gap-2">
                  <Checkbox
                    id={`metric-${col}`}
                    checked={selected}
                    onCheckedChange={(checked) => {
                      const current = section.metricColumns ?? [];
                      const next = checked
                        ? [...current, col]
                        : current.filter((c) => c !== col);
                      onUpdate({
                        metricColumns: next.length > 0 ? next : undefined,
                      });
                    }}
                  />
                  <Label htmlFor={`metric-${col}`} className="text-xs">
                    {col}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
