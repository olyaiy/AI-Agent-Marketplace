"use server";

import { gateway } from "@ai-sdk/gateway";

export interface GatewayDiscoveredModel {
  id: string; // e.g., "openai/gpt-5"
  name?: string;
  modelType?: string; // e.g., "language", "embedding"
  description?: string;
  pricing?: {
    input?: number;
    output?: number;
    cachedInputTokens?: number;
    cacheCreationInputTokens?: number;
  };
  specification?: Record<string, unknown>;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description?: string;
  pricing?: {
    input?: number | string;
    output?: number | string;
    cachedInputTokens?: number | string;
    cacheCreationInputTokens?: number | string;
  };
  specification?: Record<string, unknown>;
}

function splitProviderAndModel(fullId: string): { provider: string; modelId: string } {
  const slashIndex = fullId.indexOf("/");
  if (slashIndex === -1) return { provider: "unknown", modelId: fullId };
  return {
    provider: fullId.slice(0, slashIndex),
    modelId: fullId.slice(slashIndex + 1),
  };
}

export async function fetchGatewayLanguageModels(): Promise<ModelOption[]> {
  try {
    const available = await gateway.getAvailableModels();
    const models = (available?.models ?? []) as GatewayDiscoveredModel[];

    // Detailed console output for debugging model metadata
    try {
      const count = models.length;
      // console.log(`[Gateway] Discovered ${count} model(s)`);
      for (const model of models) {
        // console.log(`• ${model.id}${model.name ? ` — ${model.name}` : ""}${model.modelType ? ` [${model.modelType}]` : ""}`);
        if (model.description) // console.log(`  Description: ${model.description}`);
        if (model.pricing) {
          // console.log(`  Pricing: ${safeStringify(model.pricing)}`);
        }
        if (model.specification) {
          // console.log(`  Specification: ${safeStringify(model.specification)}`);
        }
      }
    } catch {}
    const languageModels = models.filter((m) => m.modelType === "language");
    return languageModels
      .map((m) => {
        const { provider, modelId } = splitProviderAndModel(m.id);
        return {
          id: modelId,
          name: m.name ?? modelId,
          provider,
          description: m.description,
          pricing: m.pricing,
          specification: m.specification,
        } satisfies ModelOption;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    // Gracefully degrade if gateway is not configured yet
    return [];
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}


