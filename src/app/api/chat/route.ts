import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const qpSystem = url.searchParams.get('systemPrompt') || undefined;
  const qpModel = url.searchParams.get('model') || undefined;
  const { messages, systemPrompt: bodySystem, model: bodyModel }: { messages: UIMessage[]; systemPrompt?: string; model?: string } = await req.json().catch(() => ({ messages: [], systemPrompt: undefined, model: undefined }));
  const systemPrompt = bodySystem ?? qpSystem;
  
  function normalizeModelId(input?: string | null): string | undefined {
    if (!input) return undefined;
    let raw = String(input).trim();
    if (!raw) return undefined;
    raw = raw.replace(/\s+/g, '');
    raw = raw.replace(':', '/');
    const slashIndex = raw.indexOf('/');
    if (slashIndex <= 0 || slashIndex === raw.length - 1) return undefined;
    return raw;
  }
  
  const modelId = normalizeModelId(bodyModel ?? qpModel) ?? 'openai/gpt-5-nano';

  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const result = streamText({
    model: modelId,
    providerOptions: {
      openai: {
        reasoningEffort: 'minimal',
      },
    },
  
    system: systemPrompt,
    messages: convertToModelMessages(messages),
  });

  console.log(`[Chat] Using model: ${modelId}`);

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
