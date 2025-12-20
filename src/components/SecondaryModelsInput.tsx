"use client";

import * as React from "react";
import { OpenRouterModelSelect } from "./OpenRouterModelSelect";
import { X, GripVertical } from "lucide-react";
import { ProviderAvatar } from "./ProviderAvatar";
import { deriveProviderSlug } from "@/lib/model-display";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  placeholder?: string;
  includeHiddenInput?: boolean;
  primaryModelId?: string;
  providerSelections?: Record<string, string | null>;
  onProviderChange?: (modelId: string, provider: string | null) => void;
}

interface ModelMeta {
  label: string;
  providerSlug: string | null;
}

const metaCache = new Map<string, ModelMeta>();

// Sortable badge component for each secondary model
function SortableModelBadge({
  modelId,
  label,
  providerSlug,
  onRemove,
}: {
  modelId: string;
  label: string;
  providerSlug: string | null;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: modelId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group transition-all duration-200 ${isDragging ? "z-50 scale-[1.02]" : ""}`}
    >
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border bg-card text-sm transition-all ${isDragging
          ? "shadow-xl ring-2 ring-primary/30 border-primary/40"
          : "border-border hover:border-primary/30 hover:bg-muted/30 hover:shadow-md"
          }`}
      >
        {/* Drag handle */}
        <button
          type="button"
          className="inline-flex items-center justify-center p-1 -ml-1 rounded-md cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-all"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${label}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Provider logo */}
        <div className="flex-shrink-0">
          <ProviderAvatar providerSlug={providerSlug} size={20} />
        </div>

        {/* Model name */}
        <span className="font-medium text-foreground max-w-[180px] truncate" title={label}>
          {label}
        </span>

        {/* Remove button */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-1 -mr-1 hover:bg-destructive/10 hover:text-destructive cursor-pointer transition-all opacity-50 group-hover:opacity-100"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function SecondaryModelsInput({
  value,
  onChange,
  label = "Secondary models",
  placeholder = "Search models to add...",
  includeHiddenInput = true,
  primaryModelId,
  providerSelections,
  onProviderChange,
}: Props) {
  const [pending, setPending] = React.useState<string>("");
  const [modelMeta, setModelMeta] = React.useState<Record<string, ModelMeta>>({});
  const inflight = React.useRef<Set<string>>(new Set());

  // Filter out primary model from secondary list
  const secondaryIds = primaryModelId
    ? value.filter((id) => id !== primaryModelId)
    : value;
  const hasSecondary = secondaryIds.length > 0;

  // For the OpenRouterModelSelect, prioritize selected models
  const prioritizedIds = React.useMemo(
    () => (primaryModelId ? [primaryModelId, ...secondaryIds] : secondaryIds),
    [primaryModelId, secondaryIds]
  );

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = secondaryIds.indexOf(active.id as string);
        const newIndex = secondaryIds.indexOf(over.id as string);
        const newOrder = arrayMove(secondaryIds, oldIndex, newIndex);
        // If we had a primary model, it should remain at position 0 in the full value array
        // but since we filter it out for secondaryIds, just pass the new secondary order
        onChange(primaryModelId ? [primaryModelId, ...newOrder] : newOrder);
      }
    },
    [secondaryIds, onChange, primaryModelId]
  );

  const addPending = React.useCallback(
    (modelId?: string) => {
      const trimmed = typeof modelId === "string" ? modelId.trim() : "";
      if (!trimmed) return;
      if (value.includes(trimmed)) {
        setPending("");
        return;
      }
      const next = [...value, trimmed];
      onChange(next.slice(0, 16));
      setPending("");
    },
    [onChange, value]
  );

  const removeModel = React.useCallback(
    (modelId: string) => {
      const next = value.filter((m) => m !== modelId);
      onChange(next);
      if (onProviderChange) onProviderChange(modelId, null);
    },
    [onChange, value, onProviderChange]
  );

  // Fetch human-friendly names and provider slugs for selected ids
  React.useEffect(() => {
    const hydratedFromCache: Record<string, ModelMeta> = {};
    const missing: string[] = [];
    const idsToCheck = [...(primaryModelId ? [primaryModelId] : []), ...value].filter(Boolean);

    idsToCheck.forEach((id) => {
      if (modelMeta[id] || inflight.current.has(id)) return;
      const cached = metaCache.get(id);
      if (cached) {
        hydratedFromCache[id] = cached;
        return;
      }
      missing.push(id);
    });

    if (Object.keys(hydratedFromCache).length > 0) {
      setModelMeta((prev) => ({ ...prev, ...hydratedFromCache }));
    }

    if (missing.length === 0) return;

    missing.slice(0, 6).forEach(async (id) => {
      try {
        inflight.current.add(id);
        const url = new URL("/api/gateway/models", window.location.origin);
        url.searchParams.set("q", id);
        url.searchParams.set("ttlMs", "60000");
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("failed");
        const json = await res.json();
        const items: Array<{ id: string; name: string }> = json?.data ?? [];
        const hit = items.find((m) => m.id === id) || items[0];
        const display = hit?.name || hit?.id || id;
        const meta: ModelMeta = {
          label: display,
          providerSlug: deriveProviderSlug(display, id),
        };
        metaCache.set(id, meta);
        setModelMeta((prev) => ({ ...prev, [id]: meta }));
      } catch {
        const fallbackMeta: ModelMeta = {
          label: id,
          providerSlug: deriveProviderSlug(null, id),
        };
        metaCache.set(id, fallbackMeta);
        setModelMeta((prev) => ({ ...prev, [id]: fallbackMeta }));
      } finally {
        inflight.current.delete(id);
      }
    });
  }, [value, modelMeta, primaryModelId]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {hasSecondary && (
            <span className="text-xs text-muted-foreground">
              {secondaryIds.length} of 16
            </span>
          )}
          <span className="text-xs text-muted-foreground">Optional</span>
        </div>
      </div>

      {/* Model selector */}
      <OpenRouterModelSelect
        value={pending}
        onChange={(val) => {
          setPending(val);
          if (!val) return;
          // If user clicks a model that's already in the list, toggle it off.
          if (value.includes(val)) {
            removeModel(val);
            return;
          }
          addPending(val);
        }}
        placeholder={placeholder}
        width="100%"
        label=""
        prioritizedIds={prioritizedIds}
        selectedIds={prioritizedIds}
        prioritizedLabel="Selected models"
        keepOpenOnSelect
        primaryId={primaryModelId}
        primaryLabel="Primary model"
        providerSelections={providerSelections}
        onProviderChange={onProviderChange}
      />

      {/* Secondary models list with drag-to-reorder */}
      {!hasSecondary ? (
        <div className="flex items-center gap-2 py-2">
          <span className="text-xs text-muted-foreground italic">
            No secondary models added. Users will only see the primary model.
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Alternate Models
            </span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground">
              Drag to reorder
            </span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={secondaryIds}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex flex-wrap gap-2">
                {secondaryIds.map((modelId) => {
                  const meta = modelMeta[modelId];
                  return (
                    <SortableModelBadge
                      key={modelId}
                      modelId={modelId}
                      label={meta?.label || modelId}
                      providerSlug={meta?.providerSlug || deriveProviderSlug(null, modelId)}
                      onRemove={() => removeModel(modelId)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {includeHiddenInput && (
        <input type="hidden" name="secondaryModels" value={JSON.stringify(value)} />
      )}
    </div>
  );
}
