import { streamText, smoothStream, UIMessage, convertToModelMessages } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { conversation, message } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const qpSystem = url.searchParams.get('systemPrompt') || undefined;
  const qpModel = url.searchParams.get('model') || undefined;
  const {
    messages,
    systemPrompt: bodySystem,
    model: bodyModel,
    conversationId: bodyConversationId,
    agentTag,
    reasoningEnabled: bodyReasoningEnabled,
    webSearchEnabled: bodyWebSearchEnabled,
  }: { messages: UIMessage[]; systemPrompt?: string; model?: string; conversationId?: string; agentTag?: string; reasoningEnabled?: boolean; webSearchEnabled?: boolean } = await req
    .json()
    .catch(() => ({ messages: [], systemPrompt: undefined, model: undefined }));
  const systemPrompt = bodySystem ?? qpSystem;
  const reasoningEnabled = Boolean(bodyReasoningEnabled);
  const webSearchEnabled = Boolean(bodyWebSearchEnabled);
  
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

  // Initialize OpenRouter
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Ensure conversation exists or create one on-demand
  let ensuredConversationId = bodyConversationId;
  if (!ensuredConversationId) {
    ensuredConversationId = randomUUID();
    // Extract title from first user message
    const firstUserMsg = messages.find((m) => m.role === 'user');
    let title: string | null = null;
    if (firstUserMsg) {
      const parts = firstUserMsg.parts as Array<{ type: string; text?: string }>;
      const textContent = parts
        .filter((p) => p.type === 'text' && typeof p.text === 'string')
        .map((p) => p.text as string)
        .join(' ')
        .slice(0, 60)
        .trim();
      title = textContent || null;
    }
    try {
      await db.insert(conversation).values({
        id: ensuredConversationId,
        userId: session.user.id,
        agentTag: agentTag || 'unknown',
        modelId,
        title,
      });
      // If a system prompt was provided on-demand, persist it as an initial system message
      if (systemPrompt && systemPrompt.trim().length > 0) {
        try {
          await db
            .insert(message)
            .values({
              id: randomUUID(),
              conversationId: ensuredConversationId!,
              role: 'system',
              uiParts: [{ type: 'text', text: systemPrompt }] as unknown as Record<string, unknown>[],
              textPreview: systemPrompt.slice(0, 280),
              hasToolCalls: false,
            });
        } catch {
          // noop
        }
      }
    } catch {
      // noop
    }
  } else {
    // If a conversation id is provided but doesn't exist for this user, create it on-demand with that id.
    const existing = await db
      .select({ id: conversation.id })
      .from(conversation)
      .where(sql`${conversation.id} = ${ensuredConversationId} AND ${conversation.userId} = ${session.user.id}`)
      .limit(1);
    if (existing.length === 0) {
      try {
        // Extract quick title from first user message (same logic as no-id branch)
        const firstUserMsg = messages.find((m) => m.role === 'user');
        let quickTitle: string | null = null;
        if (firstUserMsg) {
          const parts = firstUserMsg.parts as Array<{ type: string; text?: string }>;
          const textContent = parts
            .filter((p) => p.type === 'text' && typeof p.text === 'string')
            .map((p) => p.text as string)
            .join(' ')
            .slice(0, 60)
            .trim();
          quickTitle = textContent || null;
        }

        await db.insert(conversation).values({
          id: ensuredConversationId!,
          userId: session.user.id,
          agentTag: agentTag || 'unknown',
          modelId,
          title: quickTitle,
        });
        // Persist initial system if present
        if (systemPrompt && systemPrompt.trim().length > 0) {
          try {
            await db.insert(message).values({
              id: randomUUID(),
              conversationId: ensuredConversationId!,
              role: 'system',
              uiParts: [{ type: 'text', text: systemPrompt }] as unknown as Record<string, unknown>[],
              textPreview: systemPrompt.slice(0, 280),
              hasToolCalls: false,
            });
          } catch {}
        }
      } catch {
        return new Response(JSON.stringify({ error: 'Conversation not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      }
    }
  }

  // Persist the latest user message idempotently (if present)
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUser) {
    const textPreview = (lastUser.parts as Array<{ type: string; text?: string }>)
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text as string)
      .join(' ')
      .slice(0, 280);
    try {
      await db
        .insert(message)
        .values({
          id: lastUser.id,
          conversationId: ensuredConversationId!,
          role: 'user',
          uiParts: lastUser.parts as unknown as Record<string, unknown>[],
          textPreview,
          hasToolCalls: false,
        })
        .onConflictDoNothing();
      // Update conversation timestamps
      await db
        .update(conversation)
        .set({ updatedAt: new Date(), lastMessageAt: new Date() })
        .where(sql`${conversation.id} = ${ensuredConversationId!}`);
    } catch {
      // ignore duplicate insert errors
    }
  }

  // Construct OpenRouter provider options
  const openrouterOptions: Record<string, unknown> = {};
  if (reasoningEnabled) {
    openrouterOptions.includeReasoning = true;
    openrouterOptions.reasoning = { effort: 'low', enabled: true };
  }
  if (webSearchEnabled) {
    openrouterOptions.plugins = [{ id: 'web' }];
  }

  const result = streamText({
    model: openrouter(modelId),
    abortSignal: req.signal,
    providerOptions: Object.keys(openrouterOptions).length > 0 ? { openrouter: openrouterOptions } : undefined,
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: 'word',
    }),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
  });

  // Attach conversation id header so clients can capture it if they didn't have one
  const response = result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
  response.headers.set('x-conversation-id', ensuredConversationId!);
  response.headers.set('x-reasoning-enabled', String(reasoningEnabled));
  response.headers.set('x-web-search-enabled', String(webSearchEnabled));
  return response;
}
