import { NextRequest, NextResponse } from "next/server";
import { gateway } from "@ai-sdk/gateway";
import { unstable_cache } from "next/cache";
import { GATEWAY_PROVIDER_SET } from "@/lib/gateway-providers";

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
    provider?: string | null;
    providers?: string[];
    default_provider?: string | null;
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

type ModelsDevEntry = {
    model: ModelsDevModel;
    providerId: string;
    modelKey: string;
    fullId: string;
    baseName: string;
};

const CACHE_TTL_SECONDS = 300; // 5 minutes for models.dev data

// Cached full model data from models.dev
let modelsDevCache: Map<string, ModelsDevEntry> | null = null;
let modelsDevProvidersCache: Map<string, Set<string>> | null = null;
let modelsDevCacheTime = 0;

function normalizeBaseName(id: string): string {
    const trimmed = id.trim();
    const withoutProvider = trimmed.includes('/') ? trimmed.split('/').slice(1).join('/') : trimmed;
    return withoutProvider.toLowerCase();
}

// Parse release_date string (e.g., "2024-12-15") to timestamp, fallback to 0
function parseReleaseDate(dateStr: string | undefined | null): number {
    if (!dateStr) return 0;
    const parsed = Date.parse(dateStr);
    return Number.isNaN(parsed) ? 0 : parsed;
}

async function fetchModelsDevData(): Promise<{ modelMap: Map<string, ModelsDevEntry>; baseProviders: Map<string, Set<string>>; }> {
    const now = Date.now();
    // Return cached if valid (5 minutes)
    if (modelsDevCache && now - modelsDevCacheTime < CACHE_TTL_SECONDS * 1000) {
        return { modelMap: modelsDevCache, baseProviders: modelsDevProvidersCache || new Map() };
    }

    try {
        const response = await fetch('https://models.dev/api.json', {
            next: { revalidate: CACHE_TTL_SECONDS }
        });

        if (!response.ok) {
            console.warn('⚠️ Failed to fetch models.dev API, falling back to defaults');
            return { modelMap: modelsDevCache || new Map(), baseProviders: modelsDevProvidersCache || new Map() };
        }

        const data: Record<string, ModelsDevProvider> = await response.json();
        const modelMap = new Map<string, ModelsDevEntry>();
        const baseProviders = new Map<string, Set<string>>();

        // Build a map of all model IDs to their full data + provider ids, and track providers per base model name
        for (const provider of Object.values(data)) {
            if (provider.models) {
                for (const [modelKey, model] of Object.entries(provider.models)) {
                    const fullId = `${provider.id}/${modelKey}`;
                    const baseNames = [
                        normalizeBaseName(fullId),
                        normalizeBaseName(modelKey),
                        model.id ? normalizeBaseName(model.id) : null,
                    ].filter(Boolean) as string[];

                    baseNames.forEach((bn) => {
                        const set = baseProviders.get(bn) || new Set<string>();
                        set.add(provider.id);
                        baseProviders.set(bn, set);
                    });

                    const entry: ModelsDevEntry = {
                        model,
                        providerId: provider.id,
                        modelKey,
                        fullId,
                        baseName: baseNames[0] || normalizeBaseName(fullId),
                    };

                    // Store with various ID formats for flexible matching
                    modelMap.set(fullId, entry);
                    modelMap.set(modelKey, entry);
                    if (model.id) {
                        modelMap.set(model.id, entry);
                    }
                }
            }
        }

        console.log(`✅ Loaded ${modelMap.size} models from models.dev with full data`);
        modelsDevCache = modelMap;
        modelsDevProvidersCache = baseProviders;
        modelsDevCacheTime = now;
        return { modelMap, baseProviders };
    } catch (error) {
        console.warn('⚠️ Error fetching models.dev:', error);
        return { modelMap: modelsDevCache || new Map(), baseProviders: modelsDevProvidersCache || new Map() };
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
            const modelsDevMap = modelsDevData.modelMap;
            const modelsDevProviders = modelsDevData.baseProviders;

            // Transform to match our expected format
            const formattedModels: FormattedModel[] = availableModels.models.map((model) => {
                // Try to find full model data from models.dev
                const modelsDevEntry = lookupModelsDevModel(model.id, modelsDevMap);
                const modelsDevModel = modelsDevEntry?.model;
                const providerSlugRaw = (model.specification as { provider?: string } | undefined)?.provider || extractProvider(model.id);
                const providerSlug = providerSlugRaw ? providerSlugRaw.toLowerCase() : null;
                const baseName = normalizeBaseName(model.id);
                const providersSet = modelsDevProviders.get(baseName) || new Set<string>();
                if (providerSlug) providersSet.add(providerSlug.toLowerCase());
                const providers = Array.from(providersSet).filter((p) => GATEWAY_PROVIDER_SET.has(p));
                const defaultProvider = providerSlug && GATEWAY_PROVIDER_SET.has(providerSlug) ? providerSlug : (providers[0] || null);

                return {
                    id: model.id,
                    name: model.name || model.id,
                    description: model.description || `${extractProvider(model.id)} model`,
                    // Use models.dev context length if available
                    context_length: modelsDevModel?.limit?.context ?? null,
                    // Use release_date from models.dev for sorting (newest first)
                    created: parseReleaseDate(modelsDevModel?.release_date),
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
                    provider: defaultProvider,
                    providers,
                    default_provider: defaultProvider,
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
function lookupModelsDevModel(modelId: string, modelMap: Map<string, ModelsDevEntry>): ModelsDevEntry | undefined {
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
