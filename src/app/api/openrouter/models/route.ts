import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

interface OpenRouterModelArchitecture {
  input_modalities: string[];
  output_modalities: string[];
  tokenizer: string;
  instruct_type: string | null;
}

interface OpenRouterModelTopProvider {
  context_length: number | null;
  max_completion_tokens: number | null;
  is_moderated: boolean;
}

interface OpenRouterModelPricing {
  prompt: string;
  completion: string;
  image: string;
  request: string;
  input_cache_read: string | null;
  input_cache_write: string | null;
  web_search: string;
  internal_reasoning: string;
}

interface OpenRouterModel {
  id: string;
  name: string;
  canonical_slug: string | null;
  created: number;
  description: string;
  context_length: number | null;
  hugging_face_id: string | null;
  architecture: OpenRouterModelArchitecture;
  top_provider: OpenRouterModelTopProvider;
  supported_parameters: string[];
  pricing: OpenRouterModelPricing;
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

// Cached fetch function using Next.js unstable_cache
async function fetchOpenRouterModels(
  path: string,
  category: string | undefined,
  apiKey: string | undefined,
  revalidateSeconds: number
): Promise<OpenRouterModelsResponse> {
  const getCachedModels = unstable_cache(
    async () => {
      const baseUrl = "https://openrouter.ai/api/v1";
      const upstreamUrl = new URL(baseUrl + path);
      if (category) upstreamUrl.searchParams.set("category", category);

      const res = await fetch(upstreamUrl.toString(), {
        method: "GET",
        headers: apiKey
          ? {
              Authorization: `Bearer ${apiKey}`,
            }
          : undefined,
      });

      if (!res.ok) {
        throw new Error(`Upstream error ${res.status}`);
      }

      return (await res.json()) as OpenRouterModelsResponse;
    },
    [`openrouter-models-${path}-${category || "all"}`],
    {
      revalidate: revalidateSeconds,
      tags: ["openrouter-models"],
    }
  );

  return getCachedModels();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const category = searchParams.get("category") ?? undefined;
  const ttlMs = Number(searchParams.get("ttlMs") ?? 60_000); // default 60s
  const revalidateSeconds = Math.max(5, Math.floor(ttlMs / 1000));

  const apiKey = process.env.OPENROUTER_API_KEY;
  const path = apiKey ? "/models/user" : "/models";

  try {
    const data = await fetchOpenRouterModels(
      path,
      category,
      apiKey,
      revalidateSeconds
    );

    const filtered = filterModels(data, q);
    return NextResponse.json(filtered, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Upstream error")) {
      return NextResponse.json({ error: message }, { status: 502 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function filterModels(response: OpenRouterModelsResponse, q: string): { data: Array<{ id: string; name: string; description: string; context_length: number | null; created: number }> } {
  const items = response.data
    .filter((m) => {
      if (!q) return true;
      const hay = `${m.id} ${m.name} ${m.description}`.toLowerCase();
      return hay.includes(q);
    })
    .map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      context_length: m.context_length,
      created: m.created,
    }));

  return { data: items };
}


