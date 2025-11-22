import { NextRequest, NextResponse } from 'next/server';

type ModelsDevModel = {
  id: string;
  name: string;
  description?: string;
  modalities?: { input?: string[]; output?: string[] };
  cost?: { input?: number; output?: number };
  limit?: { context?: number | null };
  reasoning?: boolean;
  tool_call?: boolean;
  structured_output?: boolean;
  temperature?: boolean;
  attachment?: boolean;
  release_date?: string;
  last_updated?: string;
};

type ModelsDevProvider = {
  id: string;
  name?: string;
  doc?: string;
  models?: Record<string, ModelsDevModel>;
};

type ModelsDevResponse = Record<string, ModelsDevProvider>;

type GatewayModelList = { id: string }[];

type FilteredModel = {
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

function normalizeId(providerId: string, modelId: string) {
  const cleanProvider = providerId.trim();
  const cleanModel = modelId.trim();
  if (!cleanProvider) return cleanModel;
  if (cleanModel.includes('/')) return cleanModel;
  return `${cleanProvider}/${cleanModel}`;
}

function dateToUnixSeconds(input?: string | null) {
  if (!input) return Math.floor(Date.now() / 1000);
  const ts = Date.parse(input);
  return Number.isFinite(ts) ? Math.floor(ts / 1000) : Math.floor(Date.now() / 1000);
}

async function fetchModelsDev(revalidateSeconds: number): Promise<ModelsDevResponse> {
  const res = await fetch('https://models.dev/api.json', {
    method: 'GET',
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) throw new Error(`Models.dev error ${res.status}`);
  return (await res.json()) as ModelsDevResponse;
}

async function fetchGatewayModels(revalidateSeconds: number): Promise<GatewayModelList> {
  const base = (process.env.AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1/ai').replace(/\/$/, '');
  const url = `${base}/models`;
  const headers: Record<string, string> = {};
  if (process.env.AI_GATEWAY_API_KEY) {
    headers.Authorization = `Bearer ${process.env.AI_GATEWAY_API_KEY}`;
  }
  const res = await fetch(url, {
    method: 'GET',
    headers: Object.keys(headers).length ? headers : undefined,
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) throw new Error(`Gateway models error ${res.status}`);
  const json = await res.json();
  // OpenAI-compatible response shape: { object: 'list', data: [{ id, ... }] }
  if (Array.isArray(json)) {
    return json as GatewayModelList;
  }
  if (Array.isArray(json?.data)) {
    return json.data.map((m: { id: string }) => ({ id: m.id }));
  }
  return [];
}

function modelMatchesQuery(model: FilteredModel, q: string) {
  if (!q) return true;
  const hay = `${model.id} ${model.name} ${model.description}`.toLowerCase();
  return hay.includes(q);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.toLowerCase() ?? '';
  const ttlMs = Number(searchParams.get('ttlMs') ?? 60_000); // default 60s
  const revalidateSeconds = Math.max(10, Math.floor(ttlMs / 1000));

  try {
    const [modelsDev, gatewayModels] = await Promise.all([
      fetchModelsDev(revalidateSeconds),
      fetchGatewayModels(revalidateSeconds).catch(() => [] as GatewayModelList),
    ]);
    const gatewayIds = new Set(gatewayModels.map((m) => m.id?.toLowerCase()).filter(Boolean));

    const items: FilteredModel[] = [];

    Object.entries(modelsDev).forEach(([providerId, provider]) => {
      const models = provider.models || {};
      Object.entries(models).forEach(([modelKey, model]) => {
        const resolvedId = normalizeId(provider.id || providerId, model.id || modelKey);
        if (gatewayIds.size > 0 && !gatewayIds.has(resolvedId.toLowerCase())) {
          return; // Skip models not available through the configured gateway
        }

        const context = model.limit?.context ?? null;
        const promptPerToken = (model.cost?.input ?? 0) / 1_000_000;
        const completionPerToken = (model.cost?.output ?? model.cost?.input ?? 0) / 1_000_000;
        const supported_parameters: string[] = [];
        if (model.reasoning) supported_parameters.push('reasoning');
        if (model.tool_call) supported_parameters.push('tool_calls');
        if (model.structured_output) supported_parameters.push('structured_output');
        if (model.temperature) supported_parameters.push('temperature');
        if (model.attachment) supported_parameters.push('attachments');

        const filtered: FilteredModel = {
          id: resolvedId,
          name: model.name || resolvedId,
          description: model.description || `${model.name || resolvedId} (${provider.name || providerId})`,
          context_length: context === null ? null : Number(context),
          created: dateToUnixSeconds(model.release_date || model.last_updated),
          pricing: {
            prompt: Number.isFinite(promptPerToken) ? promptPerToken : 0,
            completion: Number.isFinite(completionPerToken) ? completionPerToken : 0,
          },
          input_modalities: model.modalities?.input && model.modalities.input.length > 0 ? model.modalities.input : ['text'],
          output_modalities: model.modalities?.output && model.modalities.output.length > 0 ? model.modalities.output : ['text'],
          supported_parameters,
        };

        if (modelMatchesQuery(filtered, q)) {
          items.push(filtered);
        }
      });
    });

    const sorted = items.sort((a, b) => b.created - a.created);

    return NextResponse.json({ data: sorted }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
