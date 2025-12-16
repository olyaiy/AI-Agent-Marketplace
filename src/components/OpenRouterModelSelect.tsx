"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useDeferredValue,
  useRef,
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
  ModelSelectorName,
  ModelSelectorSeparator,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { deriveProviderSlug, getDisplayName } from "@/lib/model-display";
import { ProviderAvatar } from "@/components/ProviderAvatar";
import {
  Check,
  ChevronDown,
  Loader2,
  Sparkles,
  Coins,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Zap,
  Copy,
  CheckCircle2,
  Brain,
  type LucideIcon
} from "lucide-react";

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
const INITIAL_VISIBLE_RESULTS = 80;
const LOAD_STEP = 120;
const SCROLL_LOAD_THRESHOLD_PX = 240;

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
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(1)}M`;
  return `${Math.round(ctx / 1000)}k`;
}

function formatContextLengthFull(ctx: number | null) {
  if (!ctx) return "Unknown";
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(1)} million tokens`;
  return `${ctx.toLocaleString()} tokens`;
}

function enhanceModels(raw: SlimModel[]): EnhancedModel[] {
  const deduped = new Map<string, EnhancedModel>();

  raw.forEach((model) => {
    const providerSlug = deriveProviderSlug(model.name, model.id);
    const displayName = getDisplayName(model.name, model.id);
    const searchText = `${model.id} ${model.name} ${model.description} ${providerSlug || ""
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

  const url = new URL("/api/gateway/models", window.location.origin);
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

// ─────────────────────────────────────────────────────────────────────────────
// Model Detail Panel Component
// ─────────────────────────────────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  children
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50 shrink-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <div className="text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}

function ModalityBadge({ modality }: { modality: string }) {
  const getIcon = () => {
    switch (modality.toLowerCase()) {
      case "text":
        return <FileText className="size-3" />;
      case "image":
        return <ImageIcon className="size-3" />;
      default:
        return <Zap className="size-3" />;
    }
  };

  return (
    <Badge variant="outline" className="gap-1 text-xs capitalize">
      {getIcon()}
      {modality}
    </Badge>
  );
}

function ModelDetailPanel({ model }: { model: EnhancedModel | null }) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = useCallback(() => {
    if (!model) return;
    navigator.clipboard.writeText(model.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [model]);

  if (!model) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-sidebar/50 dark:bg-sidebar/30">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#BE6254]/20 to-[#BE6254]/5 dark:from-[#BE6254]/30 dark:to-[#BE6254]/10 flex items-center justify-center mb-3 ring-1 ring-[#BE6254]/20">
          <Brain className="size-7 text-[#BE6254]/60 dark:text-[#BE6254]/80" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          Hover over a model
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          to see details
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-sidebar/50 dark:bg-sidebar/30">
      {/* Header with gradient */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-b from-[#BE6254]/5 dark:from-[#BE6254]/10 to-transparent">
        <div className="flex items-start gap-3">
          {model.providerSlug ? (
            <div className="ring-2 ring-[#BE6254]/20 dark:ring-[#BE6254]/30 rounded-xl">
              <ProviderAvatar providerSlug={model.providerSlug} size={44} />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#BE6254] to-[#a54e42] flex items-center justify-center shadow-lg shadow-[#BE6254]/20">
              <Sparkles className="size-5 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate text-foreground">
                {model.displayName}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">
              {model.providerSlug || "Unknown Provider"}
            </p>
            {model.isFeatured && (
              <Badge
                variant="outline"
                className="mt-1.5 gap-1 text-[10px] border-[#BE6254]/30 text-[#BE6254] dark:border-[#BE6254]/50 dark:text-[#BE6254]"
              >
                <Sparkles className="size-2.5" />
                Featured
              </Badge>
            )}
          </div>
        </div>

        {/* Model ID with copy */}
        <button
          onClick={handleCopyId}
          className="mt-3 w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-background/50 dark:bg-background/30 hover:bg-background/80 dark:hover:bg-background/50 transition-colors group border border-border/50"
        >
          <code className="text-[11px] text-muted-foreground truncate flex-1 text-left font-mono">
            {model.id}
          </code>
          {copied ? (
            <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
          ) : (
            <Copy className="size-3.5 text-muted-foreground group-hover:text-[#BE6254] transition-colors shrink-0" />
          )}
        </button>
      </div>

      {/* Details */}
      <div className="flex-1 p-4 space-y-3.5">
        {/* Description */}
        {model.description && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Description
            </p>
            <p className="text-xs text-foreground/90 leading-relaxed">
              {model.description}
            </p>
          </div>
        )}

        {/* Pricing */}
        <DetailRow icon={Coins} label="Pricing">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-[10px]">In:</span>
              <span className="font-semibold text-xs text-foreground">
                {formatPricePerMillion(model.pricing.prompt)}
              </span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-[10px]">Out:</span>
              <span className="font-semibold text-xs text-foreground">
                {formatPricePerMillion(model.pricing.completion)}
              </span>
            </div>
          </div>
        </DetailRow>

        {/* Context Length */}
        <DetailRow icon={MessageSquare} label="Context Window">
          <span className={model.context_length ? "font-semibold" : "text-muted-foreground italic"}>
            {model.context_length
              ? formatContextLengthFull(model.context_length)
              : "Not available"}
          </span>
        </DetailRow>

        {/* Input Modalities */}
        {model.input_modalities.length > 0 && (
          <DetailRow icon={FileText} label="Inputs">
            <div className="flex flex-wrap gap-1 mt-0.5">
              {model.input_modalities.map((mod) => (
                <ModalityBadge key={mod} modality={mod} />
              ))}
            </div>
          </DetailRow>
        )}

        {/* Output Modalities */}
        {model.output_modalities.length > 0 && (
          <DetailRow icon={Zap} label="Outputs">
            <div className="flex flex-wrap gap-1 mt-0.5">
              {model.output_modalities.map((mod) => (
                <ModalityBadge key={mod} modality={mod} />
              ))}
            </div>
          </DetailRow>
        )}

        {/* Capabilities */}
        {model.supported_parameters.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Capabilities
            </p>
            <div className="flex flex-wrap gap-1">
              {model.supported_parameters.map((param) => (
                <Badge
                  key={param}
                  variant="secondary"
                  className="text-[10px] bg-[#BE6254]/10 dark:bg-[#BE6254]/20 text-[#BE6254] dark:text-[#BE6254] border-0"
                >
                  {param === 'reasoning' ? '🧠 Reasoning' : param}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

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
  /** Optional primary model id for badge labeling */
  primaryId?: string;
  primaryLabel?: string;
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
  primaryId,
  primaryLabel = "Primary Model",
}: OpenRouterModelSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [models, setModels] = useState<EnhancedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_RESULTS);
  const [hoveredModel, setHoveredModel] = useState<EnhancedModel | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
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

  // Set initial hovered model to selected model when dialog opens
  useEffect(() => {
    if (open && selectedModel && !hoveredModel) {
      setHoveredModel(selectedModel);
    }
    if (!open) {
      setHoveredModel(null);
    }
  }, [open, selectedModel, hoveredModel]);

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
  useEffect(() => {
    if (!open) return;
    const listEl = listRef.current;
    const estimatedVisible =
      listEl && listEl.clientHeight
        ? Math.ceil(listEl.clientHeight / 56) * 6
        : INITIAL_VISIBLE_RESULTS;
    const nextVisible = Math.max(INITIAL_VISIBLE_RESULTS, estimatedVisible);
    setVisibleCount((current) => {
      const capped = Math.min(nextVisible, remainingToShow.length || nextVisible);
      return current === capped ? current : capped;
    });
    if (listEl) listEl.scrollTop = 0;
  }, [deferredQuery, open, remainingToShow.length]);

  const visibleRemaining = useMemo(() => {
    if (visibleCount >= remainingToShow.length) return remainingToShow;
    return remainingToShow.slice(0, visibleCount);
  }, [remainingToShow, visibleCount]);

  const hasMoreRemaining = remainingToShow.length > visibleRemaining.length;
  const hasResults =
    prioritizedModels.length > 0 ||
    featuredToShow.length > 0 ||
    remainingToShow.length > 0;

  const handleListScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!hasMoreRemaining) return;
      const target = event.currentTarget;
      const distanceFromBottom =
        target.scrollHeight - (target.scrollTop + target.clientHeight);
      if (distanceFromBottom < SCROLL_LOAD_THRESHOLD_PX) {
        setVisibleCount((current) =>
          Math.min(remainingToShow.length, current + LOAD_STEP)
        );
      }
    },
    [hasMoreRemaining, remainingToShow.length]
  );

  const widthStyle = useMemo(() => {
    if (typeof width === "number") return `${width}px`;
    return width;
  }, [width]);

  const handleSelect = useCallback(
    (id: string) => {
      if (keepOpenOnSelect && selectionSet.has(id)) {
        if (primaryId && id === primaryId) return;
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
    [onChange, keepOpenOnSelect, selectionSet, value, primaryId]
  );

  const handleClear = useCallback(() => {
    onChange("");
    setOpen(false);
    setQuery("");
  }, [onChange]);

  const handleModelHover = useCallback((model: EnhancedModel) => {
    setHoveredModel(model);
  }, []);

  return (
    <div className="space-y-2" style={{ width: widthStyle }}>
      {label ? (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{label}</span>
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
          if (!next) {
            setQuery("");
            setVisibleCount(INITIAL_VISIBLE_RESULTS);
            listRef.current?.scrollTo({ top: 0 });
          }
        }}
      >
        <ModelSelectorTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("w-full justify-between cursor-pointer", {
              "text-muted-foreground": !selectedModel && !loading,
            })}
            disabled={disabled || loading}
          >
            <span className="flex items-center gap-2 truncate">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {!loading && selectedModel?.providerSlug ? (
                <ProviderAvatar providerSlug={selectedModel.providerSlug} size={24} />
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
            {/* Two-column layout */}
            <div className="flex flex-col md:flex-row h-[60vh] sm:h-[65vh] md:h-[70vh] max-h-[600px]">
              {/* Left column - Model list */}
              <div className="w-full md:w-1/2 min-w-0 md:border-r">
                <ModelSelectorList
                  ref={listRef}
                  onScroll={handleListScroll}
                  className="h-full max-h-full"
                >
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
                              onHover={handleModelHover}
                              isSelected={model.id === value}
                              isInSelection={selectionSet.has(model.id)}
                              isPrimary={primaryId === model.id}
                              primaryLabel={primaryLabel}
                              isHovered={hoveredModel?.id === model.id}
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
                              onHover={handleModelHover}
                              isSelected={model.id === value}
                              isInSelection={selectionSet.has(model.id)}
                              isPrimary={primaryId === model.id}
                              primaryLabel={primaryLabel}
                              isHovered={hoveredModel?.id === model.id}
                            />
                          ))}
                        </ModelSelectorGroup>
                      )}

                      {remainingToShow.length > 0 ? (
                        <ModelSelectorGroup
                          heading={hasQuery ? "Results" : "All models"}
                        >
                          {visibleRemaining.map((model) => (
                            <ModelListItem
                              key={model.id}
                              model={model}
                              onSelect={handleSelect}
                              onHover={handleModelHover}
                              isSelected={model.id === value}
                              isInSelection={selectionSet.has(model.id)}
                              isPrimary={primaryId === model.id}
                              primaryLabel={primaryLabel}
                              isHovered={hoveredModel?.id === model.id}
                            />
                          ))}
                          {hasMoreRemaining && (
                            <div className="px-2 py-2 text-[11px] text-muted-foreground">
                              Scroll to load more ({visibleRemaining.length} of{" "}
                              {remainingToShow.length})
                            </div>
                          )}
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
                              className="cursor-pointer"
                            >
                              Clear selection
                            </ModelSelectorItem>
                          </ModelSelectorGroup>
                        </>
                      )}
                    </>
                  )}
                </ModelSelectorList>
              </div>

              {/* Right column - Model details */}
              <div className="hidden md:flex md:flex-col md:w-1/2 bg-muted/10">
                <ModelDetailPanel model={hoveredModel} />
              </div>
            </div>
          </ModelSelectorContent>
        )}
      </SelectorRoot>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Model List Item Component
// ─────────────────────────────────────────────────────────────────────────────

const ModelListItem = React.memo(function ModelListItem({
  model,
  onSelect,
  onHover,
  isSelected,
  isPrimary,
  primaryLabel,
  isInSelection,
  isHovered,
}: {
  model: EnhancedModel;
  onSelect: (id: string) => void;
  onHover: (model: EnhancedModel) => void;
  isSelected: boolean;
  isPrimary?: boolean;
  primaryLabel?: string;
  isInSelection?: boolean;
  isHovered?: boolean;
}) {
  const provider = model.providerSlug;
  const priceIn = formatPricePerMillion(model.pricing.prompt);
  const contextLabel = formatContextLength(model.context_length);

  return (
    <ModelSelectorItem
      value={model.id}
      onSelect={() => onSelect(model.id)}
      onMouseEnter={() => onHover(model)}
      className={cn(
        "cursor-pointer transition-colors py-2.5",
        isHovered && "bg-accent"
      )}
    >
      {provider ? (
        <ProviderAvatar providerSlug={provider} size={28} />
      ) : (
        <div className="size-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <Sparkles className="size-3.5 text-white" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <ModelSelectorName className="text-[13px] font-medium truncate">
          {model.displayName}
        </ModelSelectorName>
        <span className="text-[10px] text-muted-foreground capitalize truncate">
          {provider || model.id.split('/')[0]}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground shrink-0">
        {isPrimary ? (
          <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0">
            <Sparkles className="size-2.5 text-amber-500" />
            Primary
          </Badge>
        ) : isInSelection && (
          <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0">
            <Check className="size-2.5" />
          </Badge>
        )}

        {contextLabel && (
          <span className="hidden lg:inline whitespace-nowrap text-[11px] tabular-nums">
            {contextLabel}
          </span>
        )}
        <span className="text-[11px] font-medium tabular-nums">{priceIn}</span>
        {isSelected && <Check className="size-4 text-primary" />}
      </div>
    </ModelSelectorItem>
  );
},
  (prev, next) =>
    prev.model === next.model &&
    prev.isSelected === next.isSelected &&
    prev.isInSelection === next.isInSelection &&
    prev.isPrimary === next.isPrimary &&
    prev.primaryLabel === next.primaryLabel &&
    prev.isHovered === next.isHovered);

