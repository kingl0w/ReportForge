"use client";

import {
  FileText,
  List,
  Sparkles,
  TrendingUp,
  BarChart3,
  Trophy,
  AlertTriangle,
  GitBranch,
  Table,
  Type,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuilderSectionType } from "@/types/builder";
import { SECTION_TYPE_INFO } from "@/types/builder";

const ICONS: Record<string, React.ElementType> = {
  "file-text": FileText,
  list: List,
  sparkles: Sparkles,
  "trending-up": TrendingUp,
  "bar-chart-3": BarChart3,
  trophy: Trophy,
  "alert-triangle": AlertTriangle,
  "git-branch": GitBranch,
  table: Table,
  type: Type,
};

interface SectionPaletteProps {
  existingTypes: BuilderSectionType[];
  onAdd: (type: BuilderSectionType) => void;
}

export default function SectionPalette({
  existingTypes,
  onAdd,
}: SectionPaletteProps) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Plus className="h-3 w-3" />
        Add Section
      </p>
      <div className="space-y-0.5">
        {SECTION_TYPE_INFO.map((info) => {
          const Icon = ICONS[info.icon] ?? FileText;
          const alreadyAdded =
            !info.allowMultiple && existingTypes.includes(info.type);

          return (
            <button
              key={info.type}
              type="button"
              disabled={alreadyAdded}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                alreadyAdded
                  ? "cursor-not-allowed opacity-35"
                  : "text-foreground/70 hover:bg-white/5 hover:text-foreground"
              )}
              onClick={() => onAdd(info.type)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{info.label}</span>
              {alreadyAdded && (
                <span className="text-[9px] text-muted-foreground">Added</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
