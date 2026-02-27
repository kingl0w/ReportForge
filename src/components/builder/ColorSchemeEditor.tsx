"use client";

import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ColorScheme } from "@/types/template";

interface Preset {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  chartColors: string[];
}

const PRESETS: Preset[] = [
  {
    name: "Ocean Blue",
    primary: "#1e3a5f",
    secondary: "#2d6a9f",
    accent: "#4a90d9",
    chartColors: ["#2d6a9f", "#4a90d9", "#7ab8e0", "#1e3a5f", "#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8"],
  },
  {
    name: "Royal Purple",
    primary: "#7c3aed",
    secondary: "#8b5cf6",
    accent: "#a78bfa",
    chartColors: ["#7c3aed", "#8b5cf6", "#a78bfa", "#6d28d9", "#c4b5fd", "#5b21b6", "#ddd6fe", "#4c1d95"],
  },
  {
    name: "Emerald",
    primary: "#059669",
    secondary: "#10b981",
    accent: "#34d399",
    chartColors: ["#059669", "#10b981", "#34d399", "#047857", "#6ee7b7", "#065f46", "#a7f3d0", "#064e3b"],
  },
  {
    name: "Sunset",
    primary: "#ea580c",
    secondary: "#f97316",
    accent: "#fb923c",
    chartColors: ["#ea580c", "#f97316", "#fb923c", "#c2410c", "#fdba74", "#9a3412", "#fed7aa", "#7c2d12"],
  },
  {
    name: "Rose",
    primary: "#e11d48",
    secondary: "#f43f5e",
    accent: "#fb7185",
    chartColors: ["#e11d48", "#f43f5e", "#fb7185", "#be123c", "#fda4af", "#9f1239", "#fecdd3", "#881337"],
  },
  {
    name: "Monochrome",
    primary: "#374151",
    secondary: "#4b5563",
    accent: "#6b7280",
    chartColors: ["#374151", "#4b5563", "#6b7280", "#1f2937", "#9ca3af", "#111827", "#d1d5db", "#030712"],
  },
  {
    name: "Coral Reef",
    primary: "#dc2626",
    secondary: "#f97316",
    accent: "#fbbf24",
    chartColors: ["#dc2626", "#f97316", "#fbbf24", "#ef4444", "#fb923c", "#f59e0b", "#fca5a5", "#fed7aa"],
  },
  {
    name: "Forest",
    primary: "#166534",
    secondary: "#15803d",
    accent: "#86efac",
    chartColors: ["#166534", "#15803d", "#22c55e", "#14532d", "#4ade80", "#052e16", "#bbf7d0", "#86efac"],
  },
  {
    name: "Midnight",
    primary: "#1e1b4b",
    secondary: "#312e81",
    accent: "#818cf8",
    chartColors: ["#1e1b4b", "#312e81", "#4338ca", "#3730a3", "#818cf8", "#6366f1", "#a5b4fc", "#c7d2fe"],
  },
  {
    name: "Warm Earth",
    primary: "#78350f",
    secondary: "#92400e",
    accent: "#d97706",
    chartColors: ["#78350f", "#92400e", "#b45309", "#d97706", "#f59e0b", "#fbbf24", "#a16207", "#ca8a04"],
  },
];

function isActivePreset(preset: Preset, colorScheme: ColorScheme): boolean {
  return colorScheme.primary === preset.primary && colorScheme.accent === preset.accent;
}

interface ColorSchemeEditorProps {
  colorScheme: ColorScheme;
  onUpdate: (updates: Partial<ColorScheme>) => void;
}

export default function ColorSchemeEditor({
  colorScheme,
  onUpdate,
}: ColorSchemeEditorProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Color Scheme
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
          Choose a palette for your report
        </p>
      </div>

      <div className="space-y-1.5">
        {PRESETS.map((preset) => {
          const active = isActivePreset(preset, colorScheme);
          return (
            <button
              key={preset.name}
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                active
                  ? "bg-blue-500/15 ring-1 ring-blue-500/50"
                  : "hover:bg-white/5"
              )}
              onClick={() =>
                onUpdate({
                  primary: preset.primary,
                  secondary: preset.secondary,
                  accent: preset.accent,
                  chartColors: preset.chartColors,
                })
              }
            >
              <div className="flex gap-0.5">
                {preset.chartColors.slice(0, 5).map((color, i) => (
                  <div
                    key={i}
                    className="h-5 w-3.5 first:rounded-l last:rounded-r"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="flex-1 truncate text-xs text-foreground/80">
                {preset.name}
              </span>
              {active && (
                <Check className="h-3.5 w-3.5 shrink-0 text-blue-400" />
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-[11px] font-medium text-muted-foreground">
          Custom Colors
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Primary</Label>
            <div className="flex gap-1.5">
              <input
                type="color"
                value={colorScheme.primary}
                onChange={(e) => onUpdate({ primary: e.target.value })}
                className="h-8 w-8 shrink-0 cursor-pointer rounded border border-border"
              />
              <Input
                value={colorScheme.primary}
                onChange={(e) => onUpdate({ primary: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Accent</Label>
            <div className="flex gap-1.5">
              <input
                type="color"
                value={colorScheme.accent}
                onChange={(e) => onUpdate({ accent: e.target.value })}
                className="h-8 w-8 shrink-0 cursor-pointer rounded border border-border"
              />
              <Input
                value={colorScheme.accent}
                onChange={(e) => onUpdate({ accent: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px]">Chart Palette Preview</Label>
        <div className="flex gap-0.5 rounded-md overflow-hidden">
          {colorScheme.chartColors.slice(0, 8).map((color, i) => (
            <div
              key={i}
              className="h-5 flex-1"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
