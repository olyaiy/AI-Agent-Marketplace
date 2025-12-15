import { streamText, smoothStream, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { agent, conversation, message } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { tavilyReadPageTool, tavilySearchTool } from '@/lib/tavily';

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

const MAX_TITLE_LENGTH = 60;
const MAX_PREVIEW_LENGTH = 280;
const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(...args);
  }
};

const booleanish = z.preprocess(
  (value) => {
    if (typeof value === 'string') {
      const lowered = value.toLowerCase();
      if (lowered === 'true') return true;
      if (lowered === 'false') return false;
    }
    return value;
  },
  z.boolean().optional(),
);

const messagePartSchema = z
  .object({
    type: z.string(),
    text: z.string().optional(),
  })
  .passthrough();

const uiMessageSchema = z
  .object({
    id: z.string().min(1),
    role: z.enum(['user', 'assistant', 'system']),
    parts: z.array(messagePartSchema),
    annotations: z.array(z.unknown()).optional(),
  })
  .passthrough();

const requestSchema = z
  .object({
    messages: z.array(uiMessageSchema).default([]),
    systemPrompt: z.string().optional(),
    model: z.string().optional(),
    conversationId: z.string().optional(),
    agentTag: z.string().optional(),
    reasoningEnabled: booleanish,
    webSearchEnabled: booleanish,
  })
  .passthrough();

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

function extractTextFromParts(parts: Array<{ type?: string; text?: string }>): string {
  return parts
    .filter((p) => p && typeof p === 'object' && p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join(' ');
}

function extractTitleFromMessages(messages: UIMessage[]): string | null {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (!firstUserMsg || !Array.isArray(firstUserMsg.parts)) return null;
  const textContent = extractTextFromParts(firstUserMsg.parts as Array<{ type?: string; text?: string }>)
    .slice(0, MAX_TITLE_LENGTH)
    .trim();
  return textContent || null;
}

async function persistSystemPrompt(tx: typeof db, conversationId: string, systemPrompt?: string | null) {
  const trimmed = systemPrompt?.trim();
  if (!trimmed) return;
  const systemMessageId = randomUUID();
  await tx.insert(message).values({
    id: systemMessageId,
    conversationId,
    role: 'system',
    uiParts: [{ type: 'text', text: trimmed }] as unknown as typeof message.$inferInsert['uiParts'],
    textPreview: trimmed.slice(0, MAX_PREVIEW_LENGTH),
    hasToolCalls: false,
  });
}

async function createConversationRecord(options: {
  conversationId: string;
  userId: string;
  agentTag: string;
  modelId: string;
  title: string | null;
  systemPrompt?: string | null;
}) {
  const { conversationId, userId, agentTag, modelId, title, systemPrompt } = options;
  await db
    .insert(conversation)
    .values({
      id: conversationId,
      userId,
      agentTag,
      modelId,
      title,
    })
    .returning({ id: conversation.id });
  try {
    await persistSystemPrompt(db, conversationId, systemPrompt);
  } catch (error) {
    debugLog('Failed to persist system prompt', error);
  }
}

async function persistUserMessage(conversationId: string, lastUser: UIMessage) {
  const parts = Array.isArray(lastUser.parts) ? lastUser.parts : [];
  const textPreview = extractTextFromParts(parts as Array<{ type?: string; text?: string }>).slice(0, MAX_PREVIEW_LENGTH);

  const inserted = await db
    .insert(message)
    .values({
      id: lastUser.id,
      conversationId,
      role: 'user',
      uiParts: lastUser.parts as unknown as typeof message.$inferInsert['uiParts'],
      textPreview,
      hasToolCalls: false,
    })
    .onConflictDoNothing()
    .returning({ id: message.id });

  if (inserted.length > 0) {
    const now = new Date();
    await db
      .update(conversation)
      .set({ updatedAt: now, lastMessageAt: now })
      .where(sql`${conversation.id} = ${conversationId}`);
  }
}

function normalizeUsage(raw: unknown) {
  const toInt = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) && num >= 0 ? Math.round(num) : 0;
  };
  const usage = (raw ?? {}) as Record<string, unknown>;
  const inputTokens = toInt(usage.inputTokens);
  const outputTokens = toInt(usage.outputTokens);
  const totalTokens = toInt(usage.totalTokens || inputTokens + outputTokens);
  const cachedInputTokens = toInt(usage.cachedInputTokens);
  const reasoningTokens = toInt(usage.reasoningTokens);
  return { inputTokens, outputTokens, totalTokens, cachedInputTokens, reasoningTokens };
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const qpSystem = url.searchParams.get('systemPrompt') || undefined;
  const qpModel = url.searchParams.get('model') || undefined;

  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  let parsedBody: z.infer<typeof requestSchema>;
  try {
    const rawBody = await req.json();
    const validation = requestSchema.safeParse(rawBody ?? {});
    if (!validation.success) {
      return new Response(JSON.stringify({ error: 'Invalid payload', details: validation.error.flatten() }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    parsedBody = validation.data;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const {
    messages,
    systemPrompt: bodySystem,
    model: bodyModel,
    conversationId: bodyConversationId,
    agentTag,
    reasoningEnabled: bodyReasoningEnabled,
    webSearchEnabled: bodyWebSearchEnabled,
  } = parsedBody;

  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const systemPrompt = (bodySystem ?? qpSystem)?.trim() || undefined;
  const rawModelInput = bodyModel ?? qpModel;
  const requestedModelId = normalizeModelId(rawModelInput);
  if (rawModelInput && !requestedModelId) {
    return new Response(JSON.stringify({ error: 'Invalid model format' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  const reasoningEnabled = Boolean(bodyReasoningEnabled);
  const webSearchEnabled = Boolean(bodyWebSearchEnabled);

  let ensuredConversationId = bodyConversationId ?? null;
  let conversationModelFromDb: string | undefined;
  let effectiveAgentTag = agentTag || undefined;
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
    } catch (error) {
      debugLog('Agent lookup failed', error);
      agentRecord = null;
    }
  }

  const allowedModels = agentRecord
    ? [agentRecord.model, ...(Array.isArray(agentRecord.secondaryModels) ? agentRecord.secondaryModels : [])].filter(Boolean)
    : [];
  const fallbackModel = agentRecord?.model ?? 'openai/gpt-5-mini';

  if (allowedModels.length > 0 && requestedModelId && !allowedModels.includes(requestedModelId)) {
    return new Response(JSON.stringify({ error: 'Requested model not allowed', allowedModels }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }

  let modelId = requestedModelId ?? conversationModelFromDb ?? fallbackModel ?? 'openai/gpt-5-nano';
  if (allowedModels.length > 0 && !allowedModels.includes(modelId)) {
    modelId = allowedModels[0];
  }

  const conversationTitle = extractTitleFromMessages(messages as UIMessage[]);
  const resolvedAgentTag = effectiveAgentTag || 'unknown';

  if (!ensuredConversationId) {
    ensuredConversationId = randomUUID();
    try {
      await createConversationRecord({
        conversationId: ensuredConversationId,
        userId: session.user.id,
        agentTag: resolvedAgentTag,
        modelId,
        title: conversationTitle,
        systemPrompt,
      });
    } catch (error) {
      debugLog('Failed to create conversation', error);
      return new Response(JSON.stringify({ error: 'Unable to create conversation' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  } else if (!existingConversation) {
    try {
      await createConversationRecord({
        conversationId: ensuredConversationId,
        userId: session.user.id,
        agentTag: resolvedAgentTag,
        modelId,
        title: conversationTitle,
        systemPrompt,
      });
    } catch (error) {
      debugLog('Failed to create conversation with provided id', error);
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
    } catch (error) {
      debugLog('Failed to update conversation model', error);
    }
  }

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUser) {
    try {
      await persistUserMessage(ensuredConversationId!, lastUser as UIMessage);
    } catch (error) {
      debugLog('Failed to persist user message', error);
    }
  }

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const openrouterOptions: Record<string, JsonValue> = {
    usage: { include: true }, // Enable usage accounting to get cost
  };
  if (reasoningEnabled) {
    openrouterOptions.includeReasoning = true;
    openrouterOptions.reasoning = { effort: 'low', enabled: true };
  }

  const tools = webSearchEnabled
    ? {
      'web-search': tavilySearchTool,
      'read-page': tavilyReadPageTool,
    }
    : undefined;

  // Check if this is an Anthropic model to enable interleaved thinking
  const isAnthropicModel = modelId.toLowerCase().includes('anthropic') || modelId.toLowerCase().includes('claude');

  // Build headers for interleaved thinking (required for reasoning + tools on Anthropic)
  const streamHeaders: Record<string, string> = {};
  if (reasoningEnabled && isAnthropicModel) {
    streamHeaders['x-anthropic-beta'] = 'interleaved-thinking-2025-05-14';
  }

  // Debug logging for interleaved thinking
  const convertedMessages = convertToModelMessages(messages as UIMessage[]);
  console.log('🔍 Debug - Model:', modelId);
  console.log('🔍 Debug - Is Anthropic:', isAnthropicModel);
  console.log('🔍 Debug - Reasoning enabled:', reasoningEnabled);
  console.log('🔍 Debug - Headers:', JSON.stringify(streamHeaders));
  console.log('🔍 Debug - UI Messages count:', messages.length);
  console.log('🔍 Debug - UI Messages:', JSON.stringify(messages, null, 2));
  console.log('🔍 Debug - Converted Messages:', JSON.stringify(convertedMessages, null, 2));

  const result = streamText({
    model: openrouter(modelId),
    abortSignal: req.signal,
    providerOptions: { openrouter: openrouterOptions },
    headers: Object.keys(streamHeaders).length > 0 ? streamHeaders : undefined,
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: 'word',
    }),
    tools,
    system: systemPrompt,
    messages: convertedMessages,
    stopWhen: tools ? stepCountIs(10) : undefined,
    onStepFinish: ({ toolCalls, toolResults }) => {
      if (process.env.NODE_ENV === 'production') return;
      if (toolCalls && toolCalls.length > 0) {
        toolCalls.forEach((toolCall) => {
          debugLog('Tool call', {
            toolCallId: 'toolCallId' in toolCall ? toolCall.toolCallId : undefined,
            toolName: toolCall.toolName,
          });
        });
      }
      if (toolResults && toolResults.length > 0) {
        toolResults.forEach((toolResult) => {
          debugLog('Tool result', {
            toolCallId: toolResult.toolCallId,
            toolName: toolResult.toolName,
          });
        });
      }
    },
    onFinish: async (result) => {
      // Log the full usage object to see what's available
      console.log('Full usage object:', JSON.stringify(result.usage, null, 2));
      const resultWithMetadata = result as { experimental_providerMetadata?: unknown };
      console.log('Provider metadata:', JSON.stringify(resultWithMetadata.experimental_providerMetadata, null, 2));

      try {
        const usage = normalizeUsage(result.usage);
        const hasUsage = Object.values(usage).some((value) => value > 0);
        if (hasUsage && ensuredConversationId) {
          const now = new Date();
          await db
            .update(conversation)
            .set({
              totalInputTokens: sql`COALESCE(${conversation.totalInputTokens}, 0) + ${usage.inputTokens}`,
              totalOutputTokens: sql`COALESCE(${conversation.totalOutputTokens}, 0) + ${usage.outputTokens}`,
              totalTokens: sql`COALESCE(${conversation.totalTokens}, 0) + ${usage.totalTokens}`,
              cachedInputTokens: sql`COALESCE(${conversation.cachedInputTokens}, 0) + ${usage.cachedInputTokens}`,
              reasoningTokens: sql`COALESCE(${conversation.reasoningTokens}, 0) + ${usage.reasoningTokens}`,
              lastUsage: usage as unknown as typeof conversation.$inferInsert['lastUsage'],
              updatedAt: now,
              lastMessageAt: now,
            })
            .where(eq(conversation.id, ensuredConversationId));
        }
      } catch (error) {
        debugLog('Failed to persist usage', error);
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

  return response;
}
