"use client";

import React, { useCallback, useDeferredValue, useEffect, useMemo, useState, startTransition } from "react";
import {
  ModelSelector as ModelSelectorDialog,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorItem,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorEmpty,
  type ModelSelectorLogoProps,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { deriveProviderSlug, getDisplayName } from "@/lib/model-display";
import { Check, ChevronDown, Loader2 } from "lucide-react";

type SlimModel = {
  id: string;
  name: string;
  description: string;
  context_length: number | null;
  created: number;
  pricing: { prompt: number; completion: number };
  input_modalities: string[];
  output_modalities: string[];
  supported_parameters: string[];
};

type EnhancedModel = SlimModel & {
  providerSlug: string | null;
  displayName: string;
  searchText: string;
};

const CACHE_MS = 60_000;
let cachedModels: EnhancedModel[] | null = null;
let cachedAt = 0;

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function formatPricePerMillion(price: number) {
  if (!Number.isFinite(price) || price <= 0) return "—";
  const perMillion = price * 1_000_000;
  return perMillion >= 1 ? `$${perMillion.toFixed(perMillion < 10 ? 2 : 0)}/M` : `$${perMillion.toFixed(2)}/M`;
}

function formatProviderLabel(slug: string | null) {
  if (!slug) return "Other";
  return slug
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ModelSelector({
  value,
  onChange,
  label = "Model",
  placeholder = "Select a model...",
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [models, setModels] = useState<EnhancedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const deferredQuery = useDeferredValue(query);
  const MAX_RESULTS = 400;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const now = Date.now();
      if (!cancelled && cachedModels && now - cachedAt < CACHE_MS) {
        setModels(cachedModels);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const url = new URL("/api/models", window.location.origin);
        url.searchParams.set("ttlMs", "60000");
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("failed");
        const json = await res.json();
        if (!cancelled) {
          const raw: SlimModel[] = Array.isArray(json?.data) ? json.data : [];
          const dedupedById = Array.from(
            raw.reduce((acc, item) => {
              if (!acc.has(item.id)) acc.set(item.id, item);
              return acc;
            }, new Map<string, SlimModel>()).values()
          );
          const enhanced: EnhancedModel[] = dedupedById.map((m) => {
            const providerSlug = deriveProviderSlug(m.name, m.id);
            const displayName = getDisplayName(m.name, m.id);
            const searchText = `${m.id} ${m.name} ${m.description} ${providerSlug || ""}`.toLowerCase();
            return { ...m, providerSlug, displayName, searchText };
          });
          const dedupedByProvider = Array.from(
            enhanced.reduce((acc, model) => {
              const key = `${model.providerSlug || "other"}|${model.displayName.toLowerCase()}`;
              const existing = acc.get(key);
              if (!existing || model.created > existing.created) {
                acc.set(key, model);
              }
              return acc;
            }, new Map<string, EnhancedModel>()).values()
          ).sort((a, b) => b.created - a.created);
          cachedModels = dedupedByProvider;
          cachedAt = Date.now();
          setModels(dedupedByProvider);
        }
      } catch {
        if (!cancelled) setModels([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(() => models.find((m) => m.id === value), [models, value]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.searchText.includes(q));
  }, [models, deferredQuery]);

  const limited = filtered.length > MAX_RESULTS ? filtered.slice(0, MAX_RESULTS) : filtered;

  const selectedProvider = selected?.providerSlug;
  const selectedDisplayName = selected?.displayName || "";
  const handleSelect = useCallback(
    (id: string) => {
      onChange(id);
      setOpen(false);
    },
    [onChange]
  );
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
  }, []);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {selectedProvider && (
            <Badge variant="secondary" className="text-xs capitalize">
              {formatProviderLabel(selectedProvider)}
            </Badge>
          )}
        </div>
      )}
      <ModelSelectorDialog open={open} onOpenChange={handleOpenChange}>
        <ModelSelectorTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            disabled={disabled || loading}
          >
            <span className="flex items-center gap-2 truncate">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {!loading && selectedProvider && (
                <ModelSelectorLogo
                  provider={selectedProvider as ModelSelectorLogoProps["provider"]}
                  className="size-4 shrink-0"
                />
              )}
              {!loading && selected && (
                <span className="truncate">{selectedDisplayName}</span>
              )}
              {!loading && !selected && (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
            <ChevronDown className="size-4" />
          </Button>
        </ModelSelectorTrigger>
        {open && (
          <ModelSelectorContent title="Select a model" className="duration-50">
            <ModelSelectorInput
              placeholder="Search models..."
              value={query}
              onValueChange={(val) => {
                startTransition(() => setQuery(val));
              }}
            />
            <ModelList
              items={limited}
              onSelect={handleSelect}
              selectedId={value}
              loading={loading && limited.length === 0}
            />
          </ModelSelectorContent>
        )}
      </ModelSelectorDialog>
    </div>
  );
}

const ModelList = React.memo(function ModelList({
  items,
  onSelect,
  selectedId,
  loading,
}: {
  items: EnhancedModel[];
  onSelect: (id: string) => void;
  selectedId?: string;
  loading?: boolean;
}) {
  return (
    <ModelSelectorList>
      {loading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Loading models…</span>
        </div>
      ) : items.length === 0 ? (
        <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
      ) : (
        items.map((model) => (
          <ModelListItem
            key={model.id}
            model={model}
            onSelect={onSelect}
            isSelected={selectedId === model.id}
          />
        ))
      )}
    </ModelSelectorList>
  );
});

const ModelListItem = React.memo(function ModelListItem({
  model,
  onSelect,
  isSelected,
}: {
  model: EnhancedModel;
  onSelect: (id: string) => void;
  isSelected: boolean;
}) {
  const provider = model.providerSlug;
  const priceIn = formatPricePerMillion(model.pricing.prompt);

  return (
    <ModelSelectorItem value={model.id} onSelect={() => onSelect(model.id)}>
      {provider && (
        <ModelSelectorLogo provider={provider as ModelSelectorLogoProps["provider"]} />
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <ModelSelectorName className="text-sm font-medium">
          {model.displayName}
        </ModelSelectorName>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {model.description || model.id}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        {provider && <span className="hidden sm:inline">{formatProviderLabel(provider)}</span>}
        <span>{priceIn}</span>
        {isSelected && <Check className="size-4 text-primary" />}
      </div>
    </ModelSelectorItem>
  );
}, (prev, next) => prev.model === next.model && prev.isSelected === next.isSelected);
