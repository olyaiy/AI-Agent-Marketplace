import { NextRequest, NextResponse } from "next/server";
import { gateway } from "@ai-sdk/gateway";
import { unstable_cache } from "next/cache";

// Types for our formatted model response (matching OpenRouter format for compatibility)
interface FormattedModel {
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
}

// Models.dev API response structure
interface ModelsDevProvider {
    id: string;
    name: string;
    models: Record<string, ModelsDevModel>;
}

interface ModelsDevModel {
    id: string;
    name: string;
    family?: string;
    reasoning: boolean;
    tool_call?: boolean;
    attachment?: boolean;
    temperature?: boolean;
    knowledge?: string;
    release_date?: string;
    last_updated?: string;
    modalities?: {
        input: string[];
        output: string[];
    };
    cost?: {
        input: number;
        output: number;
        reasoning?: number;
        cache_read?: number;
        cache_write?: number;
    };
    limit?: {
        context: number;
        output: number;
    };
    open_weights?: boolean;
}

const CACHE_TTL_SECONDS = 300; // 5 minutes for models.dev data

// Cached full model data from models.dev
let modelsDevCache: Map<string, ModelsDevModel> | null = null;
let modelsDevCacheTime = 0;

async function fetchModelsDevData(): Promise<Map<string, ModelsDevModel>> {
    const now = Date.now();
    // Return cached if valid (5 minutes)
    if (modelsDevCache && now - modelsDevCacheTime < CACHE_TTL_SECONDS * 1000) {
        return modelsDevCache;
    }

    try {
        const response = await fetch('https://models.dev/api.json', {
            next: { revalidate: CACHE_TTL_SECONDS }
        });

        if (!response.ok) {
            console.warn('⚠️ Failed to fetch models.dev API, falling back to defaults');
            return modelsDevCache || new Map();
        }

        const data: Record<string, ModelsDevProvider> = await response.json();
        const modelMap = new Map<string, ModelsDevModel>();

        // Build a map of all model IDs to their full data
        for (const provider of Object.values(data)) {
            if (provider.models) {
                for (const [modelKey, model] of Object.entries(provider.models)) {
                    // Store with various ID formats for flexible matching
                    const fullId = `${provider.id}/${modelKey}`;
                    modelMap.set(fullId, model);
                    modelMap.set(modelKey, model);
                    if (model.id) {
                        modelMap.set(model.id, model);
                    }
                }
            }
        }

        console.log(`✅ Loaded ${modelMap.size} models from models.dev with full data`);
        modelsDevCache = modelMap;
        modelsDevCacheTime = now;
        return modelMap;
    } catch (error) {
        console.warn('⚠️ Error fetching models.dev:', error);
        return modelsDevCache || new Map();
    }
}

// Cached fetch function using Next.js unstable_cache
async function fetchGatewayModels(
    revalidateSeconds: number
): Promise<FormattedModel[]> {
    const getCachedModels = unstable_cache(
        async () => {
            // Fetch both Gateway models and models.dev full data in parallel
            const [availableModels, modelsDevData] = await Promise.all([
                gateway.getAvailableModels(),
                fetchModelsDevData()
            ]);

            // Transform to match our expected format
            const formattedModels: FormattedModel[] = availableModels.models.map((model) => {
                // Try to find full model data from models.dev
                const modelsDevModel = lookupModelsDevModel(model.id, modelsDevData);

                return {
                    id: model.id,
                    name: model.name || model.id,
                    description: model.description || `${extractProvider(model.id)} model`,
                    // Use models.dev context length if available
                    context_length: modelsDevModel?.limit?.context ?? null,
                    created: Date.now(), // Placeholder - Gateway doesn't expose creation date
                    pricing: {
                        prompt: model.pricing?.input ? parseFloat(String(model.pricing.input)) : 0,
                        completion: model.pricing?.output ? parseFloat(String(model.pricing.output)) : 0,
                    },
                    // Use models.dev modalities if available, with fallbacks
                    input_modalities: modelsDevModel?.modalities?.input ?? ["text"],
                    output_modalities: modelsDevModel?.modalities?.output ?? ["text"],
                    // Use models.dev data for reasoning support, with fallback heuristic
                    supported_parameters: (modelsDevModel?.reasoning ?? inferReasoningSupportHeuristic(model.id))
                        ? ['reasoning']
                        : [],
                    default_parameters: undefined,
                };
            });

            return formattedModels;
        },
        ["gateway-models"],
        {
            revalidate: revalidateSeconds,
            tags: ["gateway-models"],
        }
    );

    return getCachedModels();
}

// Look up full model data from models.dev
function lookupModelsDevModel(modelId: string, modelMap: Map<string, ModelsDevModel>): ModelsDevModel | undefined {
    const id = modelId.toLowerCase();

    // Try exact match first
    if (modelMap.has(modelId)) {
        return modelMap.get(modelId);
    }

    // Try without provider prefix (e.g., "anthropic/claude-haiku-4.5" -> "claude-haiku-4.5")
    const modelName = modelId.includes('/') ? modelId.split('/').slice(1).join('/') : modelId;
    if (modelMap.has(modelName)) {
        return modelMap.get(modelName);
    }

    // Try lowercase versions
    if (modelMap.has(id)) {
        return modelMap.get(id);
    }

    // Try partial matching for versioned models
    for (const [key, value] of modelMap.entries()) {
        if (id.includes(key.toLowerCase()) || key.toLowerCase().includes(id)) {
            return value;
        }
    }

    return undefined;
}

// Fallback heuristic for when models.dev doesn't have the model
function inferReasoningSupportHeuristic(modelId: string): boolean {
    const id = modelId.toLowerCase();

    return (
        // Anthropic Claude models with thinking
        (id.includes('claude') && (id.includes('sonnet') || id.includes('opus') || id.includes('haiku'))) ||
        // OpenAI reasoning models
        id.includes('/o1') || id.includes('/o3') || id.includes('/o4') ||
        id.includes('gpt-5') || id.includes('gpt-oss') ||
        // DeepSeek reasoning
        id.includes('deepseek-reasoner') || id.includes('deepseek-r1') ||
        // Google Gemini thinking
        id.includes('gemini-2.5') || id.includes('gemini-3') ||
        // Qwen reasoning
        id.includes('qwq')
    );
}

// Helper to extract provider from model ID
function extractProvider(modelId: string): string {
    const parts = modelId.split("/");
    return parts.length > 1 ? parts[0] : "unknown";
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.toLowerCase() ?? "";
    const ttlMs = Number(searchParams.get("ttlMs") ?? 60_000);
    const revalidateSeconds = Math.max(5, Math.floor(ttlMs / 1000));

    try {
        const models = await fetchGatewayModels(revalidateSeconds);

        // Filter by search query if provided
        const filtered = q
            ? models.filter((m) => {
                const hay = `${m.id} ${m.name} ${m.description}`.toLowerCase();
                return hay.includes(q);
            })
            : models;

        return NextResponse.json({ data: filtered }, { status: 200 });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Gateway models fetch error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
