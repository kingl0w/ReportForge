"use client";

import { useCallback, useRef, useState } from "react";
import type { ChartType } from "@/types/report";
import type { ColorScheme, ReportTemplate } from "@/types/template";
import type {
  BuilderSection,
  BuilderSectionType,
  CustomTemplateConfig,
} from "@/types/builder";
import {
  DEFAULT_BUILDER_SECTIONS,
  DEFAULT_COLOR_SCHEME,
} from "@/types/builder";

/*content fields that are tracked in undo/redo history*/
interface BuilderContent {
  name: string;
  description: string;
  sections: BuilderSection[];
  colorScheme: ColorScheme;
  pageSize: "a4" | "letter";
}

interface BuilderState extends BuilderContent {
  selectedSectionId: string | null;
  saving: boolean;
  dirty: boolean;
  history: BuilderContent[];
  future: BuilderContent[];
}

const MAX_HISTORY = 30;

function contentSnapshot(s: BuilderContent): BuilderContent {
  return {
    name: s.name,
    description: s.description,
    sections: s.sections,
    colorScheme: s.colorScheme,
    pageSize: s.pageSize,
  };
}

const INITIAL_STATE: BuilderState = {
  name: "",
  description: "",
  sections: DEFAULT_BUILDER_SECTIONS,
  colorScheme: DEFAULT_COLOR_SCHEME,
  pageSize: "a4",
  selectedSectionId: null,
  saving: false,
  dirty: false,
  history: [],
  future: [],
};

export function useTemplateBuilder(existingConfig?: {
  id?: string;
  name?: string;
  description?: string;
  config?: CustomTemplateConfig;
}) {
  const [state, setState] = useState<BuilderState>(() => {
    if (existingConfig?.config) {
      return {
        name: existingConfig.name ?? "",
        description: existingConfig.description ?? "",
        sections: existingConfig.config.sections,
        colorScheme: existingConfig.config.colorScheme,
        pageSize: existingConfig.config.pageSize,
        selectedSectionId: null,
        saving: false,
        dirty: false,
        history: [],
        future: [],
      };
    }
    return INITIAL_STATE;
  });

  const pushHistory = useCallback((current: BuilderState): { history: BuilderContent[]; future: BuilderContent[] } => {
    const snapshot = contentSnapshot(current);
    const history = [...current.history, snapshot].slice(-MAX_HISTORY);
    return { history, future: [] };
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      if (s.history.length === 0) return s;
      const prev = s.history[s.history.length - 1];
      const history = s.history.slice(0, -1);
      const future = [contentSnapshot(s), ...s.future];
      return { ...s, ...prev, history, future, dirty: true };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      const future = s.future.slice(1);
      const history = [...s.history, contentSnapshot(s)];
      return { ...s, ...next, history, future, dirty: true };
    });
  }, []);

  const setName = useCallback((name: string) => {
    setState((s) => ({ ...s, ...pushHistory(s), name, dirty: true }));
  }, [pushHistory]);

  const setDescription = useCallback((description: string) => {
    setState((s) => ({ ...s, ...pushHistory(s), description, dirty: true }));
  }, [pushHistory]);

  const setPageSize = useCallback((pageSize: "a4" | "letter") => {
    setState((s) => ({ ...s, ...pushHistory(s), pageSize, dirty: true }));
  }, [pushHistory]);

  const selectSection = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedSectionId: id }));
  }, []);

  const addSection = useCallback((type: BuilderSectionType, title?: string) => {
    const id = `s-${type}-${Date.now()}`;
    const defaultTitles: Record<string, string> = {
      cover: "Report Cover",
      table_of_contents: "Contents",
      executive_summary: "Executive Summary",
      key_metrics: "Key Metrics",
      chart: "Chart",
      rankings: "Rankings",
      anomalies: "Anomalies",
      correlations: "Correlations",
      data_table: "Data Summary",
      text_block: "Notes",
    };

    const section: BuilderSection = {
      id,
      type,
      title: title ?? defaultTitles[type] ?? type,
      pageBreakBefore: type === "executive_summary" || type === "key_metrics" || type === "data_table",
      ...(type === "chart" ? { chartType: "bar" as ChartType } : {}),
      ...(type === "text_block" ? { content: "" } : {}),
    };

    setState((s) => ({
      ...s,
      ...pushHistory(s),
      sections: [...s.sections, section],
      selectedSectionId: id,
      dirty: true,
    }));

    return id;
  }, [pushHistory]);

  const removeSection = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      ...pushHistory(s),
      sections: s.sections.filter((sec) => sec.id !== id),
      selectedSectionId: s.selectedSectionId === id ? null : s.selectedSectionId,
      dirty: true,
    }));
  }, [pushHistory]);

  const updateSection = useCallback((id: string, updates: Partial<BuilderSection>) => {
    setState((s) => ({
      ...s,
      ...pushHistory(s),
      sections: s.sections.map((sec) =>
        sec.id === id ? { ...sec, ...updates } : sec
      ),
      dirty: true,
    }));
  }, [pushHistory]);

  const reorderSections = useCallback((reordered: BuilderSection[]) => {
    setState((s) => ({ ...s, ...pushHistory(s), sections: reordered, dirty: true }));
  }, [pushHistory]);

  const toggleVisibility = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      ...pushHistory(s),
      sections: s.sections.map((sec) =>
        sec.id === id ? { ...sec, visible: sec.visible === false ? undefined : false } : sec
      ),
      dirty: true,
    }));
  }, [pushHistory]);

  const updateColorScheme = useCallback((updates: Partial<ColorScheme>) => {
    setState((s) => ({
      ...s,
      ...pushHistory(s),
      colorScheme: { ...s.colorScheme, ...updates },
      dirty: true,
    }));
  }, [pushHistory]);

  const toReportTemplate = useCallback((): ReportTemplate => {
    const templateSections = state.sections
      .filter((s) => s.type !== "text_block" && s.visible !== false)
      .map((s) => ({
        type: s.type as Exclude<BuilderSectionType, "text_block">,
        title: s.title,
        pageBreakBefore: s.pageBreakBefore,
      }));

    const preferredCharts: ChartType[] = state.sections
      .filter((s) => s.type === "chart" && s.chartType && s.visible !== false)
      .map((s) => s.chartType!);

    return {
      id: "custom",
      name: state.name || "Custom Template",
      description: state.description || "User-created template",
      sections: templateSections,
      colorScheme: state.colorScheme,
      preferredCharts: preferredCharts.length > 0 ? preferredCharts : ["bar", "area", "donut"],
      pageSize: state.pageSize,
    };
  }, [state.sections, state.colorScheme, state.name, state.description, state.pageSize]);

  const toConfig = useCallback((): CustomTemplateConfig => {
    const preferredCharts: ChartType[] = state.sections
      .filter((s) => s.type === "chart" && s.chartType)
      .map((s) => s.chartType!);

    return {
      sections: state.sections,
      colorScheme: state.colorScheme,
      pageSize: state.pageSize,
      preferredCharts: preferredCharts.length > 0 ? preferredCharts : ["bar", "area", "donut"],
    };
  }, [state.sections, state.colorScheme, state.pageSize]);

  const nameRef = useRef(state.name);
  const descRef = useRef(state.description);
  nameRef.current = state.name;
  descRef.current = state.description;

  const save = useCallback(async (templateId?: string): Promise<string> => {
    setState((s) => ({ ...s, saving: true }));
    try {
      const config = toConfig();
      const body = {
        name: nameRef.current || "Untitled Template",
        description: descRef.current || undefined,
        config,
      };

      let res: Response;
      if (templateId) {
        res = await fetch(`/api/templates/${templateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save template");
      }

      const data = await res.json();
      setState((s) => ({ ...s, dirty: false, saving: false }));
      return templateId ?? data.id;
    } catch (error) {
      setState((s) => ({ ...s, saving: false }));
      throw error;
    }
  }, [toConfig]);

  const selectedSection = state.sections.find((s) => s.id === state.selectedSectionId) ?? null;

  return {
    name: state.name,
    description: state.description,
    sections: state.sections,
    colorScheme: state.colorScheme,
    pageSize: state.pageSize,
    selectedSectionId: state.selectedSectionId,
    selectedSection,
    saving: state.saving,
    dirty: state.dirty,
    canUndo: state.history.length > 0,
    canRedo: state.future.length > 0,

    setName,
    setDescription,
    setPageSize,
    selectSection,
    addSection,
    removeSection,
    updateSection,
    reorderSections,
    toggleVisibility,
    updateColorScheme,
    toReportTemplate,
    toConfig,
    save,
    undo,
    redo,
  };
}
