"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { AsyncSelect } from "@/components/ui/async-select";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
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
}

const RECOMMENDED_MODEL_IDS = [
  "anthropic/claude-sonnet-4.5",
  "openai/gpt-5-chat",
  "google/gemini-2.5-pro",
  "moonshotai/kimi-k2-0905",
  "deepseek/deepseek-v3.2-exp",
  "qwen/qwen3-vl-30b-a3b-instruct",
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

function ProviderAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const slug = getProviderSlug(name);
  
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
}

function groupModelsByMonth(models: SlimModel[]): Array<{ label: string; items: SlimModel[] }> {
  // Group models by month/year
  const groups = new Map<string, SlimModel[]>();
  
  models.forEach((model) => {
    const date = new Date(model.created * 1000); // Unix timestamp to Date
    const monthYear = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    
    if (!groups.has(monthYear)) {
      groups.set(monthYear, []);
    }
    groups.get(monthYear)!.push(model);
  });
  
  // Sort groups by date (newest first) and sort models within each group by date (newest first)
  return Array.from(groups.entries())
    .sort((a, b) => {
      const dateA = new Date(a[1][0].created * 1000);
      const dateB = new Date(b[1][0].created * 1000);
      return dateB.getTime() - dateA.getTime();
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
  const [recommendedModels, setRecommendedModels] = useState<SlimModel[]>([]);
  // Cache to prevent duplicate fetches on mount
  const cachedModelsRef = useRef<SlimModel[] | null>(null);

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
    
    // Cache the full list when query is empty
    if (!query) {
      cachedModelsRef.current = json.data;
    }
    
    return json.data;
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
        ).filter((m): m is SlimModel => m !== undefined);
        
        setRecommendedModels(recommended);
      } catch {
        // Silently fail - recommended is optional
      }
    }

    fetchRecommended();
  }, [fetcher]);

  return (
    <AsyncSelect<SlimModel>
      fetcher={fetcher}
      preload={true}
      filterFn={(model, query) => {
        const searchText = `${model.id} ${model.name} ${model.description}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      }}
      renderOption={(m) => (
        <div className="flex items-center gap-3 min-w-0 w-full">
          <ProviderAvatar name={m.name} size={32} />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate">{m.name}</span>
            <span className="text-xs text-muted-foreground truncate">{m.id}</span>
          </div>
          {m.context_length ? (
            <Badge variant="secondary" className="ml-auto shrink-0 text-xs">{m.context_length}</Badge>
          ) : null}
        </div>
      )}
      getOptionValue={(m) => m.id}
      getDisplayValue={(m) => (
        <div className="flex items-center gap-2 min-w-0">
          <ProviderAvatar name={m.name} size={24} />
          <span className="truncate">{m.name}</span>
        </div>
      )}
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
      filterConfig={{
        providers: {
          enabled: true,
          extractProvider: (m) => getProviderSlug(m.name),
        },
        contextLength: {
          enabled: true,
          extractContextLength: (m) => m.context_length,
          min: 0,
          max: 500000,
          step: 10000,
          formatLabel: (value) => `${(value / 1000).toFixed(0)}k`,
        },
        priceRange: {
          enabled: true,
          extractPrice: (m) => m.pricing.prompt,
          min: 0,
          max: 50,
          step: 0.5,
          formatLabel: (value) => value === 0 ? 'Free' : `$${value.toFixed(2)}`,
        },
      }}
    />
  );
}
