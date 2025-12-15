"use client";

import * as React from "react";
import { OpenRouterModelSelect } from "./OpenRouterModelSelect";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { X } from "lucide-react";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  placeholder?: string;
  includeHiddenInput?: boolean;
  primaryModelId?: string;
}

const labelCache = new Map<string, string>();

export function SecondaryModelsInput({ value, onChange, label = "Secondary models", placeholder = "Search models to add...", includeHiddenInput = true, primaryModelId }: Props) {
  const [pending, setPending] = React.useState<string>("");
  const [labels, setLabels] = React.useState<Record<string, string>>({});
  const inflight = React.useRef<Set<string>>(new Set());
  const secondaryIds = primaryModelId ? value.filter((id) => id !== primaryModelId) : value;
  const hasSecondary = secondaryIds.length > 0;
  const prioritizedIds = React.useMemo(
    () => (primaryModelId ? [primaryModelId, ...secondaryIds] : secondaryIds),
    [primaryModelId, secondaryIds]
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
    },
    [onChange, value]
  );

  // Fetch human-friendly names for selected ids so badges mirror primary select display
  React.useEffect(() => {
    const hydratedFromCache: Record<string, string> = {};
    const missing: string[] = [];
    const idsToCheck = [
      ...(primaryModelId ? [primaryModelId] : []),
      ...value,
    ].filter(Boolean);

    idsToCheck.forEach((id) => {
      if (labels[id] || inflight.current.has(id)) return;
      const cached = labelCache.get(id);
      if (cached) {
        hydratedFromCache[id] = cached;
        return;
      }
      missing.push(id);
    });

    if (Object.keys(hydratedFromCache).length > 0) {
      setLabels((prev) => ({ ...prev, ...hydratedFromCache }));
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
        labelCache.set(id, display);
        setLabels((prev) => ({ ...prev, [id]: display }));
      } catch {
        labelCache.set(id, id);
        setLabels((prev) => ({ ...prev, [id]: id }));
      } finally {
        inflight.current.delete(id);
      }
    });
  }, [value, labels, primaryModelId]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">{label}</span>
        <span className="text-xs text-gray-500">Optional</span>
      </div>
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
      />
      <div className="flex flex-wrap gap-2">
        {primaryModelId && (
          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
            <span className="max-w-[260px] truncate">
              {labels[primaryModelId] || primaryModelId}
            </span>
            <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary">
              Primary
            </span>
          </Badge>
        )}
        {!primaryModelId && !hasSecondary ? (
          <span className="text-xs text-gray-500">No secondary models added.</span>
        ) : (
          secondaryIds.map((modelId) => (
            <Badge key={modelId} variant="outline" className="flex items-center gap-1 text-xs">
              <span className="max-w-[260px] truncate">{labels[modelId] || modelId}</span>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded p-0.5 hover:bg-gray-100 cursor-pointer"
                onClick={() => removeModel(modelId)}
                aria-label={`Remove ${modelId}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
      {pending && (
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="secondary" className="cursor-pointer" onClick={() => addPending(pending)}>
            Add model
          </Button>
          <Button type="button" size="sm" variant="ghost" className="cursor-pointer" onClick={() => setPending("")}>
            Clear
          </Button>
        </div>
      )}
      {includeHiddenInput && <input type="hidden" name="secondaryModels" value={JSON.stringify(value)} />}
    </div>
  );
}
