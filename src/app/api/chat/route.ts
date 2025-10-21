import { streamText, UIMessage, convertToModelMessages } from 'ai';
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
  }: { messages: UIMessage[]; systemPrompt?: string; model?: string; conversationId?: string; agentTag?: string } = await req
    .json()
    .catch(() => ({ messages: [], systemPrompt: undefined, model: undefined }));
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
    } catch {
      // noop
    }
  } else {
    // Optional: assert ownership using raw SQL where due to typed helpers not imported
    const existing = await db
      .select({ id: conversation.id })
      .from(conversation)
      .where(sql`${conversation.id} = ${ensuredConversationId} AND ${conversation.userId} = ${session.user.id}`)
      .limit(1);
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
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

  const result = streamText({
    model: openrouter(modelId),
    providerOptions: {
      openai: {
        reasoningEffort: 'minimal',
      },
    },
  
    system: systemPrompt,
    messages: convertToModelMessages(messages),
  });

  console.log('📨 Message History Sent to AI:', JSON.stringify(messages, null, 2));

  // Attach conversation id header so clients can capture it if they didn't have one
  const response = result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
  response.headers.set('x-conversation-id', ensuredConversationId!);
  return response;
}
