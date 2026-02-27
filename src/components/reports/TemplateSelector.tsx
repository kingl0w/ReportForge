"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles, LayoutTemplate } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ReportTemplate } from "@/types/template";
import type { CustomTemplateConfig } from "@/types/builder";
import { getAllTemplates, buildTemplateFromConfig } from "@/lib/reports/templates";

interface TemplateSelectorProps {
  recommendedId: string;
  selectedId: string;
  onSelect: (id: string, template: ReportTemplate) => void;
}

interface UserTemplateItem {
  id: string;
  name: string;
  description: string | null;
  config: CustomTemplateConfig;
}

export default function TemplateSelector({
  recommendedId,
  selectedId,
  onSelect,
}: TemplateSelectorProps) {
  const builtInTemplates = getAllTemplates();
  const [customTemplates, setCustomTemplates] = useState<ReportTemplate[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchCustomTemplates() {
      try {
        const res = await fetch("/api/templates");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const items: UserTemplateItem[] = data.templates ?? [];
        const built = items.map((t) =>
          buildTemplateFromConfig(
            t.id,
            t.name,
            t.description ?? "Custom template",
            t.config
          )
        );
        if (!cancelled) setCustomTemplates(built);
      } catch {
        //silently fail -- user just won't see custom templates
      }
    }
    fetchCustomTemplates();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {builtInTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={template.id === selectedId}
            isRecommended={template.id === recommendedId}
            onSelect={() => onSelect(template.id, template)}
          />
        ))}
      </div>

      {customTemplates.length > 0 && (
        <>
          <Separator />
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              My Templates
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {customTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={template.id === selectedId}
                isRecommended={false}
                isCustom
                onSelect={() => onSelect(template.id, template)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  isSelected,
  isRecommended,
  isCustom,
  onSelect,
}: {
  template: ReportTemplate;
  isSelected: boolean;
  isRecommended: boolean;
  isCustom?: boolean;
  onSelect: () => void;
}) {
  const sectionCount = template.sections.length;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "relative cursor-pointer overflow-hidden transition-all hover:shadow-md",
        isSelected
          ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-background"
          : "hover:border-muted-foreground/50"
      )}
    >
      <div
        className="h-1.5"
        style={{ backgroundColor: template.colorScheme.primary }}
      />

      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-foreground">
                {template.name}
              </h3>
              {isRecommended && (
                <Badge
                  variant="secondary"
                  className="shrink-0 gap-1 bg-amber-500/15 text-amber-500"
                >
                  <Sparkles className="h-3 w-3" />
                  Recommended
                </Badge>
              )}
              {isCustom && (
                <Badge
                  variant="secondary"
                  className="shrink-0 gap-1 text-[10px]"
                >
                  <LayoutTemplate className="h-2.5 w-2.5" />
                  Custom
                </Badge>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {template.description}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {sectionCount} sections
            </p>
          </div>

          <div
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              isSelected
                ? "border-blue-500 bg-blue-500"
                : "border-muted-foreground/30"
            )}
          >
            {isSelected && <Check className="h-3 w-3 text-white" />}
          </div>
        </div>

        <div className="mt-3 flex gap-1">
          {template.colorScheme.chartColors.slice(0, 6).map((color, i) => (
            <div
              key={i}
              className="h-2 flex-1 rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
