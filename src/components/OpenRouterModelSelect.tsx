"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useDeferredValue,
} from "react";
import {
  ModelSelector as SelectorRoot,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorEmpty,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorSeparator,
  type ModelSelectorLogoProps,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { deriveProviderSlug, getDisplayName } from "@/lib/model-display";
import { Check, ChevronDown, Loader2, Sparkles } from "lucide-react";

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
  default_parameters?: Record<string, string | number | boolean | null>;
};

type EnhancedModel = SlimModel & {
  providerSlug: string | null;
  displayName: string;
  searchText: string;
  isFeatured: boolean;
};

const FEATURED_MODEL_IDS = [
  "google/gemini-3-pro-preview",
  "openai/gpt-5.1-chat",
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-sonnet-4.5",
  "moonshotai/kimi-k2-thinking",
];

const FEATURED_MODEL_SET = new Set(FEATURED_MODEL_IDS);
const CACHE_TTL_MS = 60_000;
const MAX_RESULTS = 400;

type CacheEntry = { fetchedAt: number; data: EnhancedModel[] };
const cache = new Map<string, CacheEntry>();

function formatPricePerMillion(price: number) {
  if (!Number.isFinite(price) || price < 0) return "—";
  if (price === 0) return "Free";
  const perMillion = price * 1_000_000;
  return perMillion >= 1
    ? `$${perMillion.toFixed(perMillion < 10 ? 2 : 0)}/M`
    : `$${perMillion.toFixed(2)}/M`;
}

function formatContextLength(ctx: number | null) {
  if (!ctx) return null;
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(1)}M ctx`;
  return `${Math.round(ctx / 1000)}k ctx`;
}

function enhanceModels(raw: SlimModel[]): EnhancedModel[] {
  const deduped = new Map<string, EnhancedModel>();

  raw.forEach((model) => {
    const providerSlug = deriveProviderSlug(model.name, model.id);
    const displayName = getDisplayName(model.name, model.id);
    const searchText = `${model.id} ${model.name} ${model.description} ${
      providerSlug || ""
    }`.toLowerCase();

    const enhanced: EnhancedModel = {
      ...model,
      providerSlug,
      displayName,
      searchText,
      isFeatured: FEATURED_MODEL_SET.has(model.id),
    };

    const existing = deduped.get(enhanced.id);
    if (!existing || enhanced.created > existing.created) {
      deduped.set(enhanced.id, enhanced);
    }
  });

  return Array.from(deduped.values()).sort((a, b) => b.created - a.created);
}

async function loadModels(category?: string) {
  const cacheKey = category ?? "__all__";
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const url = new URL("/api/openrouter/models", window.location.origin);
  if (category) url.searchParams.set("category", category);
  url.searchParams.set("ttlMs", String(CACHE_TTL_MS));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to load models");

  const json = await res.json();
  const raw: SlimModel[] = Array.isArray(json?.data) ? json.data : [];
  const enhanced = enhanceModels(raw);
  cache.set(cacheKey, { fetchedAt: now, data: enhanced });
  return enhanced;
}

export interface OpenRouterModelSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: string | number;
  disabled?: boolean;
  label?: string;
  category?: string;
  /** Optional list of ids to pin to the top (e.g., already selected secondary models) */
  prioritizedIds?: string[];
  /** Optional list of ids that should be badged as already selected */
  selectedIds?: string[];
  prioritizedLabel?: string;
  /** Keep the list open after selecting (useful for multi-add flows) */
  keepOpenOnSelect?: boolean;
}

export function OpenRouterModelSelect({
  value,
  onChange,
  placeholder = "Select a model...",
  width = 360,
  disabled,
  label = "Models",
  category,
  prioritizedIds,
  selectedIds,
  prioritizedLabel = "Selected",
  keepOpenOnSelect = false,
}: OpenRouterModelSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [models, setModels] = useState<EnhancedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const hasQuery = deferredQuery.trim().length > 0;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    loadModels(category)
      .then((data) => {
        if (!active) return;
        setModels(data);
      })
      .catch(() => {
        if (!active) return;
        setError("Failed to load models. Please try again.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    loadModels(category)
      .then((data) => setModels(data))
      .catch(() => setError("Failed to load models. Please try again."))
      .finally(() => setLoading(false));
  }, [category]);

  const featuredModels = useMemo(() => {
    if (models.length === 0) return [];
    const map = new Map(models.map((m) => [m.id, m]));
    return FEATURED_MODEL_IDS.map((id) => map.get(id)).filter(
      (m): m is EnhancedModel => Boolean(m)
    );
  }, [models]);

  const selectedModel = useMemo(
    () => models.find((m) => m.id === value),
    [models, value]
  );

  const filteredFeatured = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return featuredModels;
    return featuredModels.filter((m) => m.searchText.includes(q));
  }, [featuredModels, deferredQuery]);

  const prioritizedSet = useMemo(
    () => new Set((prioritizedIds || []).filter(Boolean)),
    [prioritizedIds]
  );

  const selectionSet = useMemo(() => {
    const combined = [...(selectedIds || []), ...(prioritizedIds || [])].filter(
      Boolean
    );
    return new Set(combined);
  }, [selectedIds, prioritizedIds]);

  const prioritizedModels = useMemo(() => {
    if (!prioritizedSet.size) return [];
    const map = new Map(models.map((m) => [m.id, m]));
    const ordered = (prioritizedIds || [])
      .map((id) => map.get(id))
      .filter((m): m is EnhancedModel => Boolean(m));
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((m) => m.searchText.includes(q));
  }, [models, prioritizedIds, prioritizedSet, deferredQuery]);

  const filteredAll = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.searchText.includes(q));
  }, [models, deferredQuery]);

  const remaining = useMemo(() => {
    const featuredIds = new Set(filteredFeatured.map((m) => m.id));
    return filteredAll.filter((m) => !featuredIds.has(m.id));
  }, [filteredAll, filteredFeatured]);

  const featuredFilteredForDisplay = useMemo(() => {
    if (!prioritizedSet.size) return filteredFeatured;
    return filteredFeatured.filter((m) => !prioritizedSet.has(m.id));
  }, [filteredFeatured, prioritizedSet]);

  const remainingAfterPrioritized = useMemo(() => {
    if (!prioritizedSet.size) return remaining;
    const set = new Set(prioritizedModels.map((m) => m.id));
    return remaining.filter((m) => !set.has(m.id));
  }, [remaining, prioritizedModels, prioritizedSet]);

  const featuredToShow = featuredFilteredForDisplay.slice(0, 12);
  const remainingToShow = remainingAfterPrioritized.slice(
    0,
    Math.max(MAX_RESULTS - featuredToShow.length, 0)
  );
  const hasResults =
    prioritizedModels.length > 0 ||
    featuredToShow.length > 0 ||
    remainingToShow.length > 0;

  const widthStyle = useMemo(() => {
    if (typeof width === "number") return `${width}px`;
    return width;
  }, [width]);

  const handleSelect = useCallback(
    (id: string) => {
      if (keepOpenOnSelect && selectionSet.has(id)) {
        // Toggle off when already selected in multi-add mode
        onChange(id === value ? "" : id);
        return;
      }
      onChange(id);
      if (!keepOpenOnSelect) {
        setOpen(false);
        setQuery("");
      }
    },
    [onChange, keepOpenOnSelect, selectionSet, value]
  );

  const handleClear = useCallback(() => {
    onChange("");
    setOpen(false);
    setQuery("");
  }, [onChange]);

  return (
    <div className="space-y-2" style={{ width: widthStyle }}>
      {label ? (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {selectedModel?.providerSlug ? (
            <Badge variant="secondary" className="text-xs capitalize">
              {selectedModel.providerSlug}
            </Badge>
          ) : null}
        </div>
      ) : null}
      <SelectorRoot
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <ModelSelectorTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("w-full justify-between", {
              "text-muted-foreground": !selectedModel && !loading,
            })}
            disabled={disabled || loading}
          >
            <span className="flex items-center gap-2 truncate">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {!loading && selectedModel?.providerSlug ? (
                <ProviderLogo providerSlug={selectedModel.providerSlug} />
              ) : null}
              {!loading && selectedModel ? (
                <span className="truncate">{selectedModel.displayName}</span>
              ) : (
                !loading && (
                  <span className="text-muted-foreground">{placeholder}</span>
                )
              )}
            </span>
            <div className="flex items-center gap-2">
              {selectedModel?.isFeatured && (
                <Badge
                  variant="secondary"
                  className="hidden sm:inline-flex items-center gap-1 text-xs"
                >
                  <Sparkles className="size-3" />
                  Featured
                </Badge>
              )}
              <ChevronDown className="size-4" />
            </div>
          </Button>
        </ModelSelectorTrigger>
        {open && (
          <ModelSelectorContent title="Select a model">
            <ModelSelectorInput
              placeholder="Search models..."
              value={query}
              onValueChange={setQuery}
            />
            <ModelSelectorList>
              {loading ? (
                <div className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Loading models…</span>
                </div>
              ) : error ? (
                  <ModelSelectorEmpty>
                    <div className="flex flex-col items-center gap-2">
                      <span>{error}</span>
                      <Button size="sm" variant="outline" onClick={retry}>
                        Retry
                      </Button>
                    </div>
                  </ModelSelectorEmpty>
              ) : (
                <>
                  {prioritizedModels.length > 0 && (
                    <ModelSelectorGroup heading={prioritizedLabel}>
                      {prioritizedModels.map((model) => (
                        <ModelListItem
                          key={model.id}
                          model={model}
                          onSelect={handleSelect}
                          isSelected={model.id === value}
                          isInSelection={selectionSet.has(model.id)}
                        />
                      ))}
                    </ModelSelectorGroup>
                  )}
                  {featuredToShow.length > 0 && (
                    <ModelSelectorGroup heading="Featured">
                      {featuredToShow.map((model) => (
                        <ModelListItem
                          key={model.id}
                          model={model}
                          onSelect={handleSelect}
                          isSelected={model.id === value}
                          isInSelection={selectionSet.has(model.id)}
                        />
                      ))}
                    </ModelSelectorGroup>
                  )}

                  {remainingToShow.length > 0 ? (
                    <ModelSelectorGroup
                      heading={hasQuery ? "Results" : "All models"}
                    >
                      {remainingToShow.map((model) => (
                        <ModelListItem
                          key={model.id}
                          model={model}
                          onSelect={handleSelect}
                          isSelected={model.id === value}
                          isInSelection={selectionSet.has(model.id)}
                        />
                      ))}
                    </ModelSelectorGroup>
                  ) : !hasResults ? (
                    <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                  ) : null}

                  {value && (
                    <>
                      <ModelSelectorSeparator />
                      <ModelSelectorGroup heading="Actions">
                        <ModelSelectorItem
                          value="__clear__"
                          onSelect={handleClear}
                        >
                          Clear selection
                        </ModelSelectorItem>
                      </ModelSelectorGroup>
                    </>
                  )}
                </>
              )}
            </ModelSelectorList>
          </ModelSelectorContent>
        )}
      </SelectorRoot>
    </div>
  );
}

const ModelListItem = React.memo(function ModelListItem({
  model,
  onSelect,
  isSelected,
  isInSelection,
}: {
  model: EnhancedModel;
  onSelect: (id: string) => void;
  isSelected: boolean;
  isInSelection?: boolean;
}) {
  const provider = model.providerSlug;
  const priceIn = formatPricePerMillion(model.pricing.prompt);
  const contextLabel = formatContextLength(model.context_length);

  return (
    <ModelSelectorItem value={model.id} onSelect={() => onSelect(model.id)}>
      {provider ? (
        <ProviderLogo providerSlug={provider} />
      ) : (
        <Sparkles className="size-4 text-yellow-500" />
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
        {isInSelection && (
          <Badge variant="secondary" className="hidden sm:inline-flex gap-1">
            <Check className="size-3" />
            Added
          </Badge>
        )}
        {model.isFeatured && (
          <Badge variant="secondary" className="hidden sm:inline-flex gap-1">
            <Sparkles className="size-3" />
            Featured
          </Badge>
        )}
        {contextLabel && (
          <span className="hidden sm:inline whitespace-nowrap">
            {contextLabel}
          </span>
        )}
        <span>{priceIn}</span>
        {isSelected && <Check className="size-4 text-primary" />}
      </div>
    </ModelSelectorItem>
  );
},
(prev, next) =>
  prev.model === next.model &&
  prev.isSelected === next.isSelected &&
  prev.isInSelection === next.isInSelection);

function ProviderLogo({ providerSlug }: { providerSlug: string }) {
  return (
    <ModelSelectorLogo
      provider={providerSlug as ModelSelectorLogoProps["provider"]}
      className="size-4 shrink-0"
    />
  );
}
