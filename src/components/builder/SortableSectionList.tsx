"use client";

import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  X,
  Eye,
  EyeOff,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuilderSection } from "@/types/builder";

const ICONS: Record<string, React.ElementType> = {
  cover: FileText,
  table_of_contents: List,
  executive_summary: Sparkles,
  key_metrics: TrendingUp,
  chart: BarChart3,
  rankings: Trophy,
  anomalies: AlertTriangle,
  correlations: GitBranch,
  data_table: Table,
  text_block: Type,
};

interface SortableSectionListProps {
  sections: BuilderSection[];
  selectedId: string | null;
  onReorder: (sections: BuilderSection[]) => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleVisibility: (id: string) => void;
}

export default function SortableSectionList({
  sections,
  selectedId,
  onReorder,
  onSelect,
  onRemove,
  onToggleVisibility,
}: SortableSectionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => sections.map((s) => s.id), [sections]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(sections, oldIndex, newIndex));
  }

  if (sections.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        No sections yet. Add one below.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {sections.map((section) => (
            <SortableItem
              key={section.id}
              section={section}
              isSelected={section.id === selectedId}
              onSelect={() => onSelect(section.id)}
              onRemove={() => onRemove(section.id)}
              onToggleVisibility={() => onToggleVisibility(section.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  section,
  isSelected,
  onSelect,
  onRemove,
  onToggleVisibility,
}: {
  section: BuilderSection;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onToggleVisibility: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = ICONS[section.type] ?? FileText;
  const hidden = section.visible === false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-1 rounded-md border px-1.5 py-1.5 text-sm transition-colors",
        isSelected
          ? "border-primary/60 bg-primary/10"
          : "border-transparent hover:border-border hover:bg-accent",
        isDragging && "z-50 opacity-80 shadow-lg",
        hidden && "opacity-40"
      )}
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <button
        className="flex flex-1 items-center gap-1.5 text-left min-w-0"
        onClick={onSelect}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className={cn("truncate text-xs", hidden && "line-through")}>
          {section.title}
        </span>
      </button>

      <button
        className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility();
        }}
        aria-label={hidden ? "Show section" : "Hide section"}
      >
        {hidden ? (
          <EyeOff className="h-3 w-3" />
        ) : (
          <Eye className="h-3 w-3" />
        )}
      </button>

      <button
        className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-all hover:text-red-400 hover:bg-accent group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${section.title}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
