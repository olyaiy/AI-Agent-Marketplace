"use client";

import { useCallback, useState, useEffect, useRef, useMemo, memo } from "react";
import { AsyncSelect } from "@/components/ui/async-select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Brain } from "lucide-react";
import * as LobehubIcons from '@lobehub/icons';

interface SlimModel {
  id: string;
  name: string;
  description: string;
  context_length: number | null;
  created: number;
  pricing: {
    prompt: number;
    completion: number;
  };
  input_modalities: string[];
  output_modalities: string[];
  supported_parameters: string[];
  default_parameters: DefaultParameters;
}

interface DefaultParameters {
  [key: string]: unknown;
}

// Enhanced model with pre-computed expensive values
interface EnhancedModel extends SlimModel {
  _providerSlug: string | null;
  _monthYearLabel: string;
  _displayName: string;
  _supportsReasoning: boolean;
}

const RECOMMENDED_MODEL_IDS = [
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-haiku-4.5",
  "openai/gpt-5-chat",
  "google/gemini-2.5-pro",
  "moonshotai/kimi-k2-0905",
  "deepseek/deepseek-v3.2-exp",
  "qwen/qwen3-vl-30b-a3b-instruct",
  "z-ai/glm-4.6",
];

// Map provider names to Lobehub icon objects (we'll render .Avatar when available)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PROVIDER_ICON_MAP: Record<string, any> = {
  'openai': LobehubIcons.OpenAI,
  'anthropic': LobehubIcons.Claude,
  // Google models are branded as Gemini in Lobehub icons
  'google': LobehubIcons.Gemini,
  'gemini': LobehubIcons.Gemini,
  'meta': LobehubIcons.Meta,
  'mistral': LobehubIcons.Mistral,
  'cohere': LobehubIcons.Cohere,
  'perplexity': LobehubIcons.Perplexity,
  'deepseek': LobehubIcons.DeepSeek,
  'xai': LobehubIcons.XAI,
  'baidu': LobehubIcons.Baidu,
  'bytedance': LobehubIcons.ByteDance,
  'qwen': LobehubIcons.Qwen,
  'huggingface': LobehubIcons.HuggingFace,
  'groq': LobehubIcons.Groq,
  'openrouter': LobehubIcons.OpenRouter,
  'nvidia': LobehubIcons.Nvidia,
  'sambanova': LobehubIcons.SambaNova,
  'fireworks': LobehubIcons.Fireworks,
  'together': LobehubIcons.Together,
  'moonshotai': LobehubIcons.Moonshot,
  // Z.ai mappings
  'z.ai': LobehubIcons.ZAI,
  'zai': LobehubIcons.ZAI,
};

// Extract the provider name (left of colon) from the model display name
function getProviderSlug(modelName: string): string | null {
  const m = modelName.match(/^([^:]+):/);
  return m ? m[1].trim().toLowerCase() : null;
}

// Extract just the model name (right of colon), removing the provider prefix
// e.g., "Anthropic: Claude Sonnet 4.5" -> "Claude Sonnet 4.5"
function getDisplayName(fullName: string): string {
  const colonIndex = fullName.indexOf(':');
  if (colonIndex === -1) return fullName;
  return fullName.substring(colonIndex + 1).trim();
}

// Enhance models with pre-computed expensive values to avoid repeated calculations
function enhanceModels(models: SlimModel[]): EnhancedModel[] {
  const enhanced = models.map((model) => {
    // Cache provider slug (used in filtering, rendering, icon lookup)
    const _providerSlug = getProviderSlug(model.name);
    
    // Cache date formatting (used in grouping)
    const date = new Date(model.created * 1000);
    const _monthYearLabel = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    
    // Cache display name without provider prefix (e.g., "Claude Sonnet 4.5" instead of "Anthropic: Claude Sonnet 4.5")
    const _displayName = getDisplayName(model.name);
    
    // Cache reasoning support (used in rendering badge)
    const _supportsReasoning = model.supported_parameters.includes('reasoning');
    
    // if (_supportsReasoning) {
    //   console.log('Model with reasoning support:', {
    //     id: model.id,
    //     name: model.name,
    //     supported_parameters: model.supported_parameters,
    //   });
    // }
    
    return {
      ...model,
      _providerSlug,
      _monthYearLabel,
      _displayName,
      _supportsReasoning,
    };
  });
  
  console.log(`Total models: ${models.length}, Models with reasoning: ${enhanced.filter(m => m._supportsReasoning).length}`);
  
  return enhanced;
}

// Memoized avatar component to prevent unnecessary re-renders
// Accepts optional pre-computed providerSlug to avoid repeated calculations
const ProviderAvatar = memo(function ProviderAvatar({ 
  name, 
  size = 32,
  providerSlug 
}: { 
  name: string; 
  size?: number;
  providerSlug?: string | null;
}) {
  // Use pre-computed slug if available, otherwise compute it
  const slug = providerSlug !== undefined ? providerSlug : getProviderSlug(name);
  
  // Fallback avatar with Sparkles icon
  const FallbackAvatar = () => (
    <div 
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shrink-0"
      style={{ width: size, height: size }}
    >
      <Sparkles size={size * 0.5} className="text-white" />
    </div>
  );
  
  if (!slug) return <FallbackAvatar />;

  const IconObj = PROVIDER_ICON_MAP[slug];
  if (!IconObj) return <FallbackAvatar />;

  type IconLike = React.ComponentType<{ size?: number; className?: string }> & { Avatar?: React.ComponentType<{ size?: number; className?: string }> };
  const Comp = IconObj as IconLike;
  const AvatarComp = Comp.Avatar || Comp;

  return <AvatarComp size={size} className="" />;
});

// Optimized grouping function that uses pre-computed date labels
function groupModelsByMonth(models: EnhancedModel[]): Array<{ label: string; items: EnhancedModel[] }> {
  // Group models by pre-computed month/year label (no date parsing needed)
  const groups = new Map<string, EnhancedModel[]>();
  
  models.forEach((model) => {
    const monthYear = model._monthYearLabel;
    
    if (!groups.has(monthYear)) {
      groups.set(monthYear, []);
    }
    groups.get(monthYear)!.push(model);
  });
  
  // Sort groups by date (newest first) and sort models within each group by date (newest first)
  // Using created timestamp directly - no date parsing needed
  return Array.from(groups.entries())
    .sort((a, b) => {
      // Compare using first item's timestamp (already sorted by creation)
      return b[1][0].created - a[1][0].created;
    })
    .map(([label, items]) => ({
      label,
      items: items.sort((a, b) => b.created - a.created),
    }));
}

interface ModelsResponse {
  data: SlimModel[];
}

export interface OpenRouterModelSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: string | number;
  disabled?: boolean;
  label?: string;
  category?: string;
}

export function OpenRouterModelSelect({
  value,
  onChange,
  placeholder = "Select a model...",
  width = 360,
  disabled,
  label = "Models",
  category,
}: OpenRouterModelSelectProps) {
  const [recommendedModels, setRecommendedModels] = useState<EnhancedModel[]>([]);
  // Cache to prevent duplicate fetches on mount
  const cachedModelsRef = useRef<EnhancedModel[] | null>(null);

  const fetcher = useCallback(async (query?: string) => {
    const url = new URL("/api/openrouter/models", window.location.origin);
    if (query) url.searchParams.set("q", query);
    if (category) url.searchParams.set("category", category);
    url.searchParams.set("ttlMs", String(60_000));

    // Return cached data for empty queries (avoids duplicate fetch on mount)
    if (!query && cachedModelsRef.current) {
      return cachedModelsRef.current;
    }

    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) throw new Error("Failed to load models");
    const json = (await res.json()) as ModelsResponse;
    // Enhance models with pre-computed values (provider slug, date labels)
    const enhanced = enhanceModels(json.data);
    
    // Cache the enhanced list when query is empty
    if (!query) {
      cachedModelsRef.current = enhanced;
    }
    
    return enhanced;
  }, [category]);

  // Fetch recommended models on mount (uses cached fetcher to avoid duplicate network request)
  useEffect(() => {
    async function fetchRecommended() {
      try {
        // Call fetcher with empty query - will fetch once and cache
        const allModels = await fetcher("");
        
        // Filter to only recommended models, maintaining order
        const recommended = RECOMMENDED_MODEL_IDS.map((id) =>
          allModels.find((m) => m.id === id)
        ).filter((m): m is EnhancedModel => m !== undefined);
        
        setRecommendedModels(recommended);
      } catch {
        // Silently fail - recommended is optional
      }
    }

    fetchRecommended();
  }, [fetcher]);

  // Memoized filter function for client-side search
  const filterFn = useCallback((model: EnhancedModel, query: string) => {
    const searchText = `${model.id} ${model.name} ${model.description}`.toLowerCase();
    return searchText.includes(query.toLowerCase());
  }, []);

  // Memoized render function for each option in the list
  // Uses pre-computed providerSlug and displayName to avoid repeated calculations
  const renderOption = useCallback((m: EnhancedModel) => {
    // Format pricing: convert from per-token to per-million-tokens for readability
    const formatPrice = (price: number) => {
      if (price === 0) return 'Free';
      const perMillion = price * 1_000_000;
      // Show whole numbers without decimals, otherwise show 2 decimal places
      if (Number.isInteger(perMillion)) {
        return `$${perMillion}`;
      }
      return `$${perMillion.toFixed(2)}`;
    };

    // Get input modalities that are not just "text" or "file"
    const getInputModalityBadges = () => {
      if (!m.input_modalities || m.input_modalities.length === 0) return null;
      
      const filteredModalities = m.input_modalities.filter(modality => 
        modality !== "text" && modality !== "file"
      );
      
      if (filteredModalities.length === 0) return null;
      
      return filteredModalities.map((modality, index) => (
        <Badge key={index} variant="default" className="text-xs bg-blue-500 hover:bg-blue-600">
          {modality}
        </Badge>
      ));
    };

    const inputModalityBadges = getInputModalityBadges();

    return (
      <div className="flex items-center gap-3 min-w-0 w-full">
        <ProviderAvatar name={m.name} size={32} providerSlug={m._providerSlug} />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium truncate">{m._displayName}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{m.id}</span>
            {m.pricing && (
              <>
                <span>•</span>
                <span className="whitespace-nowrap">In: {formatPrice(m.pricing.prompt)}</span>
                <span>|</span>
                <span className="whitespace-nowrap">Out: {formatPrice(m.pricing.completion)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {m._supportsReasoning && (
            <Brain className="w-4 h-4 text-purple-500" />
          )}
          {inputModalityBadges}
        </div>
      </div>
    );
  }, []);

  // Memoized function to get the value from a model
  const getOptionValue = useCallback((m: EnhancedModel) => m.id, []);

  // Memoized render function for the selected value display
  // Uses pre-computed providerSlug and displayName to avoid repeated calculations
  const getDisplayValue = useCallback((m: EnhancedModel) => (
    <div className="flex items-center gap-2 min-w-0">
      <ProviderAvatar name={m.name} size={24} providerSlug={m._providerSlug} />
      <span className="truncate">{m._displayName}</span>
    </div>
  ), []);

  // Memoized filter configuration to prevent unnecessary re-renders
  const filterConfig = useMemo(() => ({
    providers: {
      enabled: true,
      extractProvider: (m: SlimModel) => getProviderSlug(m.name),
    },
    contextLength: {
      enabled: true,
      extractContextLength: (m: SlimModel) => m.context_length,
      min: 0,
      max: 500000,
      step: 10000,
      formatLabel: (value: number) => `${(value / 1000).toFixed(0)}k`,
    },
    priceRange: {
      enabled: true,
      extractPrice: (m: SlimModel) => m.pricing.prompt,
      min: 0,
      max: 50,
      step: 0.5,
      formatLabel: (value: number) => {
        if (value === 0) return 'Free';
        const perMillion = value * 1_000_000;
        // Show whole numbers without decimals, otherwise show 2 decimal places
        if (Number.isInteger(perMillion)) {
          return `${perMillion}`;
        }
        return `${perMillion.toFixed(2)}`;
      },
    },
    sorting: {
      enabled: true,
      defaultSortId: 'created',
      options: [
        {
          id: 'created',
          label: 'Newest First',
          sortFn: (a: SlimModel, b: SlimModel) => b.created - a.created,
        },
        {
          id: 'price',
          label: 'Price (Low to High)',
          sortFn: (a: SlimModel, b: SlimModel) => a.pricing.prompt - b.pricing.prompt,
        },
        {
          id: 'context',
          label: 'Context Length (High to Low)',
          sortFn: (a: SlimModel, b: SlimModel) => (b.context_length ?? 0) - (a.context_length ?? 0),
        },
      ],
    },
  }), []);

  return (
    <AsyncSelect<EnhancedModel>
      fetcher={fetcher}
      preload={true}
      filterFn={filterFn}
      renderOption={renderOption}
      getOptionValue={getOptionValue}
      getDisplayValue={getDisplayValue}
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      width={width}
      disabled={disabled}
      noResultsMessage="No models found"
      recommendedItems={recommendedModels}
      recommendedLabel="Recommended"
      groupByFn={groupModelsByMonth}
      filterConfig={filterConfig}
    />
  );
}
