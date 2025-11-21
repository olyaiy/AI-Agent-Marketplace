import { streamText, smoothStream, UIMessage, convertToModelMessages } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { agent, conversation, message } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

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
  
  console.log('📥 Chat Route - Input Parameters:', {
    qpSystem,
    qpModel,
    bodySystem,
    bodyModel,
    bodyConversationId,
    agentTag,
    bodyReasoningEnabled,
    bodyWebSearchEnabled,
    messagesCount: messages.length,
    messages: JSON.stringify(messages, null, 2),
  });
  
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
  
  // Initialize OpenRouter
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    console.log('❌ Chat Route - Unauthorized');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  
  console.log('✅ Chat Route - Session:', {
    userId: session.user.id,
    userEmail: session.user.email,
  });

  const requestedModelId = normalizeModelId(bodyModel ?? qpModel);
  let ensuredConversationId = bodyConversationId ?? null;
  let conversationModelFromDb: string | undefined;
  let effectiveAgentTag = agentTag;
  let existingConversation: { id: string; modelId: string | null; agentTag: string | null } | null = null;

  if (ensuredConversationId) {
    const existing = await db
      .select({ id: conversation.id, modelId: conversation.modelId, agentTag: conversation.agentTag })
      .from(conversation)
      .where(sql`${conversation.id} = ${ensuredConversationId} AND ${conversation.userId} = ${session.user.id}`)
      .limit(1);
    if (existing.length > 0) {
      existingConversation = existing[0];
      conversationModelFromDb = existing[0].modelId || undefined;
      if (!effectiveAgentTag && existing[0].agentTag) {
        effectiveAgentTag = existing[0].agentTag;
      }
    }
  }

  let agentRecord: { model: string; secondaryModels: string[] } | null = null;
  if (effectiveAgentTag) {
    try {
      const rows = await db
        .select({ model: agent.model, secondaryModels: agent.secondaryModels })
        .from(agent)
        .where(eq(agent.tag, effectiveAgentTag))
        .limit(1);
      agentRecord = rows[0] ?? null;
    } catch {
      agentRecord = null;
    }
  }

  const allowedModels = agentRecord
    ? [agentRecord.model, ...(Array.isArray(agentRecord.secondaryModels) ? agentRecord.secondaryModels : [])].filter(Boolean)
    : [];
  const fallbackModel = agentRecord?.model ?? 'openai/gpt-5-mini';

  let modelId = requestedModelId ?? conversationModelFromDb ?? fallbackModel ?? 'openai/gpt-5-nano';
  if (allowedModels.length > 0 && !allowedModels.includes(modelId)) {
    modelId = allowedModels[0];
  }
  
  console.log('🔧 Chat Route - Model Selection:', {
    requestedModelId,
    conversationModelFromDb,
    fallbackModel,
    finalModelId: modelId,
    allowedModels,
    agentRecord: agentRecord ? { model: agentRecord.model, secondaryModels: agentRecord.secondaryModels } : null,
    effectiveAgentTag,
    ensuredConversationId,
  });

  // Ensure conversation exists or create one on-demand
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
        agentTag: effectiveAgentTag || 'unknown',
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
  } else if (!existingConversation) {
    // If a conversation id is provided but doesn't exist for this user, create it on-demand with that id.
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
        agentTag: effectiveAgentTag || 'unknown',
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
  } else if (existingConversation.modelId !== modelId) {
    try {
      await db
        .update(conversation)
        .set({ modelId })
        .where(eq(conversation.id, ensuredConversationId));
    } catch {
      // noop
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
  const openrouterOptions: Record<string, JsonValue> = {};
  if (reasoningEnabled) {
    openrouterOptions.includeReasoning = true;
    openrouterOptions.reasoning = { effort: 'low', enabled: true };
  }
  if (webSearchEnabled) {
    openrouterOptions.plugins = [{ id: 'web' }];
  }

  console.log('🚀 Chat Route - Stream Configuration:', {
    modelId,
    systemPrompt,
    reasoningEnabled,
    webSearchEnabled,
    openrouterOptions,
    messagesCount: messages.length,
    convertedMessages: JSON.stringify(convertToModelMessages(messages), null, 2),
  });

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
    onFinish: async (result) => {
      console.log('✨ Chat Route - Complete Output Result:', JSON.stringify(result, null, 2));
      console.log('📊 Chat Route - Result Summary:', {
        finishReason: result.finishReason,
        usage: result.usage,
        response: result.response ? {
          text: result.response.text,
          toolCalls: result.response.toolCalls,
          toolResults: result.response.toolResults,
        } : null,
        warnings: result.warnings,
        experimental_providerMetadata: result.experimental_providerMetadata,
      });
      if (webSearchEnabled) {
        console.log('🔍 Chat Route - Web Search Details:', JSON.stringify(result, null, 2));
      }
    },
  });

  const response = result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
  });
  response.headers.set('x-conversation-id', ensuredConversationId!);
  response.headers.set('x-reasoning-enabled', String(reasoningEnabled));
  response.headers.set('x-web-search-enabled', String(webSearchEnabled));
  
  console.log('📤 Chat Route - Response Headers:', {
    'x-conversation-id': ensuredConversationId!,
    'x-reasoning-enabled': String(reasoningEnabled),
    'x-web-search-enabled': String(webSearchEnabled),
    contentType: response.headers.get('content-type'),
    status: response.status,
  });
  
  return response;
}
