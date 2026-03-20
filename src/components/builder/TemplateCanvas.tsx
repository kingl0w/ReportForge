"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  Eye,
  Undo2,
  Redo2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  CheckCircle2,
  Circle,
  Layers,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import SectionPalette from "./SectionPalette";
import SortableSectionList from "./SortableSectionList";
import SectionConfigurator from "./SectionConfigurator";
import ColorSchemeEditor from "./ColorSchemeEditor";
import BuilderPreview from "./BuilderPreview";

import { useTemplateBuilder } from "@/hooks/useTemplateBuilder";
import { SAMPLE_DATASET, SAMPLE_ANALYSIS } from "@/lib/templates/sample-data";
import type { CustomTemplateConfig } from "@/types/builder";
import { cn } from "@/lib/utils";

interface TemplateCanvasProps {
  templateId?: string;
  initialData?: {
    name: string;
    description: string;
    config: CustomTemplateConfig;
  };
}

export default function TemplateCanvas({
  templateId,
  initialData,
}: TemplateCanvasProps) {
  const router = useRouter();
  const builder = useTemplateBuilder(
    initialData
      ? { id: templateId, ...initialData }
      : undefined
  );

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<"sections" | "preview" | "settings">("preview");

  const existingTypes = useMemo(
    () => builder.sections.map((s) => s.type),
    [builder.sections]
  );

  const availableColumns = useMemo(
    () =>
      SAMPLE_ANALYSIS.dataProfile.numericColumns.concat(
        SAMPLE_ANALYSIS.dataProfile.categoricalColumns,
        SAMPLE_ANALYSIS.dataProfile.dateColumns
      ),
    []
  );

  const selectedIdRef = useRef(builder.selectedSectionId);
  selectedIdRef.current = builder.selectedSectionId;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        builder.undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        ((e.shiftKey && e.key === "z") || e.key === "y")
      ) {
        e.preventDefault();
        builder.redo();
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIdRef.current
      ) {
        e.preventDefault();
        builder.removeSection(selectedIdRef.current);
      }
      if (e.key === "Escape") {
        builder.selectSection(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [builder.undo, builder.redo, builder.removeSection, builder.selectSection]);

  async function handleSave() {
    if (!builder.name.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    try {
      const savedId = await builder.save(templateId);
      toast.success(templateId ? "Template updated" : "Template saved");
      if (!templateId) {
        router.push(`/dashboard/templates/builder/${savedId}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    }
  }

  const saveStatus = builder.saving
    ? "Saving..."
    : builder.dirty
      ? "Unsaved changes"
      : "Saved";

  const leftPanel = (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="space-y-3 p-3">
        <div className="space-y-1">
          <Label htmlFor="tmpl-name" className="text-[11px] text-muted-foreground">
            Template Name
          </Label>
          <Input
            id="tmpl-name"
            value={builder.name}
            onChange={(e) => builder.setName(e.target.value)}
            placeholder="My Custom Template"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="tmpl-desc" className="text-[11px] text-muted-foreground">
            Description
          </Label>
          <Input
            id="tmpl-desc"
            value={builder.description}
            onChange={(e) => builder.setDescription(e.target.value)}
            placeholder="What this template is for..."
            className="h-8 text-sm"
          />
        </div>
      </div>

      <Separator />

      <div className="flex-1 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sections ({builder.sections.length})
          </p>
        </div>
        <SortableSectionList
          sections={builder.sections}
          selectedId={builder.selectedSectionId}
          onReorder={builder.reorderSections}
          onSelect={builder.selectSection}
          onRemove={builder.removeSection}
          onToggleVisibility={builder.toggleVisibility}
        />
      </div>

      <Separator />

      <div className="p-3">
        <SectionPalette
          existingTypes={existingTypes}
          onAdd={builder.addSection}
        />
      </div>

      <Separator />

      <div className="space-y-3 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Page Settings
        </p>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Page Size</Label>
          <Select value={builder.pageSize} onValueChange={builder.setPageSize}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a4">A4</SelectItem>
              <SelectItem value="letter">Letter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const rightPanel = (
    <div className="h-full overflow-y-auto p-3">
      {builder.selectedSection ? (
        <SectionConfigurator
          section={builder.selectedSection}
          onUpdate={(updates) =>
            builder.updateSection(builder.selectedSectionId!, updates)
          }
          availableColumns={availableColumns}
        />
      ) : (
        <ColorSchemeEditor
          colorScheme={builder.colorScheme}
          onUpdate={builder.updateColorScheme}
        />
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        <div className="flex items-center gap-3 border-b border-border bg-card px-3 py-2">
          <Link
            href="/dashboard/templates"
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Templates</span>
          </Link>

          <Separator orientation="vertical" className="h-5" />

          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
                  disabled={!builder.canUndo}
                  onClick={builder.undo}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
                  disabled={!builder.canRedo}
                  onClick={builder.redo}
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {builder.saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : builder.dirty ? (
              <Circle className="h-3 w-3 text-amber-400" />
            ) : (
              <CheckCircle2 className="h-3 w-3 text-green-400" />
            )}
            <span className="hidden sm:inline">{saveStatus}</span>
          </div>

          <div className="flex-1" />

          <div className="hidden items-center gap-0.5 lg:flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
                  onClick={() => setLeftCollapsed(!leftCollapsed)}
                >
                  {leftCollapsed ? (
                    <PanelLeftOpen className="h-3.5 w-3.5" />
                  ) : (
                    <PanelLeftClose className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {leftCollapsed ? "Show sections" : "Hide sections"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
                  onClick={() => setRightCollapsed(!rightCollapsed)}
                >
                  {rightCollapsed ? (
                    <PanelRightOpen className="h-3.5 w-3.5" />
                  ) : (
                    <PanelRightClose className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {rightCollapsed ? "Show settings" : "Hide settings"}
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-5 hidden sm:block" />

          <Button
            onClick={handleSave}
            disabled={builder.saving || !builder.name.trim()}
            className="h-8 gap-1.5 bg-primary text-primary-foreground font-medium hover:bg-primary/90 text-xs"
          >
            {builder.saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {templateId ? "Update" : "Save"}
            </span>
          </Button>
        </div>

        <div className="flex border-b border-border lg:hidden">
          {(
            [
              { key: "sections" as const, label: "Sections", icon: Layers },
              { key: "preview" as const, label: "Preview", icon: Eye },
              { key: "settings" as const, label: "Settings", icon: Settings2 },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
                mobileTab === tab.key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setMobileTab(tab.key)}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hidden flex-1 overflow-hidden lg:flex">
          {!leftCollapsed && (
            <div className="w-60 shrink-0 border-r border-border bg-card">
              {leftPanel}
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            <BuilderPreview
              sections={builder.sections}
              colorScheme={builder.colorScheme}
              analysis={SAMPLE_ANALYSIS}
              dataSet={SAMPLE_DATASET}
              pageSize={builder.pageSize}
              templateName={builder.name}
              templateDescription={builder.description}
              selectedSectionId={builder.selectedSectionId}
              onSelectSection={builder.selectSection}
            />
          </div>

          {!rightCollapsed && (
            <div className="w-72 shrink-0 border-l border-border bg-card">
              {rightPanel}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden lg:hidden">
          {mobileTab === "sections" && (
            <div className="h-full overflow-y-auto bg-card">
              {leftPanel}
            </div>
          )}
          {mobileTab === "preview" && (
            <div className="flex h-full flex-col">
              <BuilderPreview
                sections={builder.sections}
                colorScheme={builder.colorScheme}
                analysis={SAMPLE_ANALYSIS}
                dataSet={SAMPLE_DATASET}
                pageSize={builder.pageSize}
                templateName={builder.name}
                templateDescription={builder.description}
                selectedSectionId={builder.selectedSectionId}
                onSelectSection={builder.selectSection}
              />
            </div>
          )}
          {mobileTab === "settings" && (
            <div className="h-full overflow-y-auto bg-card">
              {rightPanel}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
