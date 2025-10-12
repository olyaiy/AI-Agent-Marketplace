"use client";

import { useCallback, useState, useEffect } from "react";
import { AsyncSelect } from "@/components/ui/async-select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot } from "lucide-react";

interface SlimModel {
  id: string;
  name: string;
  description: string;
  context_length: number | null;
}

const RECOMMENDED_MODEL_IDS = [
  "anthropic/claude-sonnet-4.5",
  "openai/gpt-5-chat",
  "google/gemini-2.5-pro",
  "moonshotai/kimi-k2-0905",
  "deepseek/deepseek-v3.2-exp",
  "qwen/qwen3-vl-30b-a3b-instruct",
];

function getProviderLogoUrl(modelId: string): string {
  const provider = modelId.split("/")[0];
  return `https://models.dev/logos/${provider}.svg`;
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

  const fetcher = useCallback(async (query?: string) => {
    const url = new URL("/api/openrouter/models", window.location.origin);
    if (query) url.searchParams.set("q", query);
    if (category) url.searchParams.set("category", category);
    url.searchParams.set("ttlMs", String(60_000));

    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) throw new Error("Failed to load models");
    const json = (await res.json()) as ModelsResponse;
    return json.data;
  }, [category]);

  // Fetch recommended models on mount
  useEffect(() => {
    async function fetchRecommended() {
      try {
        const url = new URL("/api/openrouter/models", window.location.origin);
        if (category) url.searchParams.set("category", category);
        url.searchParams.set("ttlMs", String(60_000));

        const res = await fetch(url.toString(), { method: "GET" });
        if (!res.ok) return;
        const json = (await res.json()) as ModelsResponse;
        
        // Filter to only recommended models, maintaining order
        const recommended = RECOMMENDED_MODEL_IDS.map((id) =>
          json.data.find((m) => m.id === id)
        ).filter((m): m is SlimModel => m !== undefined);
        
        setRecommendedModels(recommended);
      } catch {
        // Silently fail - recommended is optional
      }
    }

    fetchRecommended();
  }, [category]);

  return (
    <AsyncSelect<SlimModel>
      fetcher={fetcher}
      preload={false}
      renderOption={(m) => (
        <div className="flex items-center gap-3 min-w-0 w-full">
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={getProviderLogoUrl(m.id)} alt={m.name} />
            <AvatarFallback>
              <Bot className="size-4" />
            </AvatarFallback>
          </Avatar>
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
          <Avatar className="size-6 shrink-0">
            <AvatarImage src={getProviderLogoUrl(m.id)} alt={m.name} />
            <AvatarFallback>
              <Bot className="size-3" />
            </AvatarFallback>
          </Avatar>
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
    />
  );
}


