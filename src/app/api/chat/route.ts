import { streamText, smoothStream, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { createGateway } from '@ai-sdk/gateway';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { agent, conversation, message } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { tavilyReadPageTool, tavilySearchTool } from '@/lib/tavily';
import { applyCreditDelta } from '@/lib/billing/credit-store';
import { priceGatewayCostOrNull } from '@/lib/billing/pricing';
import { GATEWAY_PROVIDER_SET } from '@/lib/gateway-providers';

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
    provider: z.string().optional(),
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

async function loadPersistedSystemPrompt(conversationId: string, userId: string): Promise<string | undefined> {
  try {
    const rows = await db
      .select({ uiParts: message.uiParts })
      .from(message)
      .innerJoin(conversation, eq(message.conversationId, conversation.id))
      .where(sql`${message.role} = 'system' AND ${conversation.id} = ${conversationId} AND ${conversation.userId} = ${userId}`)
      .orderBy(message.createdAt)
      .limit(1);
    if (rows.length === 0) return undefined;
    const rawParts = rows[0].uiParts;
    const parts = Array.isArray(rawParts)
      ? (rawParts as Array<{ type?: string; text?: string }>)
      : [];
    const text = extractTextFromParts(parts).trim();
    return text || undefined;
  } catch (error) {
    debugLog('Failed to load system prompt', error);
    return undefined;
  }
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
  const inputTokenDetails = (usage.inputTokenDetails ?? {}) as Record<string, unknown>;
  const outputTokenDetails = (usage.outputTokenDetails ?? {}) as Record<string, unknown>;
  const inputTokens = toInt(usage.inputTokens);
  const outputTokens = toInt(usage.outputTokens);
  const totalTokens = toInt(usage.totalTokens || inputTokens + outputTokens);
  const cacheReadTokens = toInt(inputTokenDetails.cacheReadTokens ?? usage.cachedInputTokens);
  const cacheWriteTokens = toInt(inputTokenDetails.cacheWriteTokens);
  const noCacheTokens = toInt(inputTokenDetails.noCacheTokens);
  const reasoningTokens = toInt(outputTokenDetails.reasoningTokens ?? usage.reasoningTokens);
  const textTokens = toInt(outputTokenDetails.textTokens);
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    cachedInputTokens: cacheReadTokens,
    reasoningTokens,
    inputTokenDetails: {
      noCacheTokens,
      cacheReadTokens,
      cacheWriteTokens,
    },
    outputTokenDetails: {
      textTokens,
      reasoningTokens,
    },
  };
}

const hasUsageValues = (usage: ReturnType<typeof normalizeUsage>) =>
  Object.values(usage).some((value) => value > 0);

function applyAnthropicCacheControl(messages: Array<Record<string, unknown>>) {
  const systemIndex = messages.findIndex((msg) => (msg as { role?: string }).role === 'system');
  if (systemIndex === -1) return messages;

  return messages.map((msg, index) => {
    if (index !== systemIndex) return msg;
    const current = msg as { providerOptions?: Record<string, unknown> };
    const providerOptions = (current.providerOptions && typeof current.providerOptions === 'object')
      ? current.providerOptions
      : {};
    const anthropicOptions = (providerOptions.anthropic && typeof providerOptions.anthropic === 'object')
      ? providerOptions.anthropic as Record<string, unknown>
      : {};
    if ('cacheControl' in anthropicOptions) return msg;

    return {
      ...current,
      providerOptions: {
        ...providerOptions,
        anthropic: {
          ...anthropicOptions,
          cacheControl: { type: 'ephemeral' },
        },
      },
    };
  });
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
    provider: bodyProvider,
  } = parsedBody;

  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  let systemPrompt = (bodySystem ?? qpSystem)?.trim() || undefined;
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

  let agentRecord: { model: string; secondaryModels: string[]; providerOptions?: Record<string, { order?: string[]; only?: string[] }> } | null = null;
  if (effectiveAgentTag) {
    try {
      const rows = await db
        .select({ model: agent.model, secondaryModels: agent.secondaryModels, providerOptions: agent.providerOptions })
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

  const providerOverride = (() => {
    if (!bodyProvider || typeof bodyProvider !== 'string') return null;
    const cleaned = bodyProvider.trim().toLowerCase();
    if (!cleaned || !GATEWAY_PROVIDER_SET.has(cleaned)) return null;
    return cleaned;
  })();

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

  if (!systemPrompt && ensuredConversationId) {
    systemPrompt = await loadPersistedSystemPrompt(ensuredConversationId, session.user.id);
  }

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUser) {
    try {
      await persistUserMessage(ensuredConversationId!, lastUser as UIMessage);
    } catch (error) {
      debugLog('Failed to persist user message', error);
    }
  }

  let assistantMessageId: string | null = null;
  let assistantUsage: ReturnType<typeof normalizeUsage> | null = null;
  let assistantGenerationId: string | null = null;
  let assistantGatewayCostUsd: string | null = null;

  const updateAssistantUsage = async () => {
    if (!assistantMessageId) return;
    const updateValues: Partial<typeof message.$inferInsert> = {
      modelId,
    };
    if (assistantUsage) {
      updateValues.tokenUsage = assistantUsage as unknown as typeof message.$inferInsert['tokenUsage'];
    }
    if (assistantGenerationId) {
      updateValues.generationId = assistantGenerationId;
    }
    if (assistantGatewayCostUsd) {
      updateValues.gatewayCostUsd = assistantGatewayCostUsd;
    }
    await db.update(message).set(updateValues).where(eq(message.id, assistantMessageId));
  };

  const persistAssistantMessage = async (responseMessage: UIMessage) => {
    if (!ensuredConversationId || responseMessage.role !== 'assistant' || !responseMessage.id) return;
    assistantMessageId = responseMessage.id;

    const parts = Array.isArray(responseMessage.parts) ? responseMessage.parts : [];
    const textPreview = extractTextFromParts(parts as Array<{ type?: string; text?: string }>)
      .slice(0, MAX_PREVIEW_LENGTH)
      .trim();

    const insertValues: typeof message.$inferInsert = {
      id: responseMessage.id,
      conversationId: ensuredConversationId,
      role: responseMessage.role,
      uiParts: responseMessage.parts as unknown as typeof message.$inferInsert['uiParts'],
      textPreview: textPreview || null,
      hasToolCalls: false,
      modelId,
    };

    if (responseMessage.annotations !== undefined) {
      insertValues.annotations = responseMessage.annotations as unknown as typeof message.$inferInsert['annotations'];
    }
    if (assistantUsage) {
      insertValues.tokenUsage = assistantUsage as unknown as typeof message.$inferInsert['tokenUsage'];
    }
    if (assistantGenerationId) {
      insertValues.generationId = assistantGenerationId;
    }
    if (assistantGatewayCostUsd) {
      insertValues.gatewayCostUsd = assistantGatewayCostUsd;
    }

    const updateValues: Partial<typeof message.$inferInsert> = {
      uiParts: insertValues.uiParts,
      textPreview: insertValues.textPreview,
      hasToolCalls: insertValues.hasToolCalls,
      modelId,
    };
    if (responseMessage.annotations !== undefined) {
      updateValues.annotations = responseMessage.annotations as unknown as typeof message.$inferInsert['annotations'];
    }
    if (assistantUsage) {
      updateValues.tokenUsage = assistantUsage as unknown as typeof message.$inferInsert['tokenUsage'];
    }
    if (assistantGenerationId) {
      updateValues.generationId = assistantGenerationId;
    }
    if (assistantGatewayCostUsd) {
      updateValues.gatewayCostUsd = assistantGatewayCostUsd;
    }

    await db
      .insert(message)
      .values(insertValues)
      .onConflictDoUpdate({
        target: message.id,
        set: updateValues,
      });

    const now = new Date();
    await db
      .update(conversation)
      .set({ updatedAt: now, lastMessageAt: now })
      .where(eq(conversation.id, ensuredConversationId));

    await updateAssistantUsage();
  };

  // Create Vercel AI Gateway provider
  const gateway = createGateway({
    apiKey: process.env.VERCEL_AI_GATEWAY_API_KEY,
  });

  const tools = webSearchEnabled
    ? {
      'web-search': tavilySearchTool,
      'read-page': tavilyReadPageTool,
    }
    : undefined;

  // Detect provider type for provider-specific options
  const modelIdLower = modelId.toLowerCase();
  const isAnthropicModel = modelIdLower.includes('anthropic') || modelIdLower.includes('claude');
  const isOpenAIModel = modelIdLower.includes('openai') || modelIdLower.includes('gpt') || modelIdLower.includes('o1') || modelIdLower.includes('o3') || modelIdLower.includes('o4');
  const isDeepSeekModel = modelIdLower.includes('deepseek');
  const isGoogleModel = modelIdLower.includes('google') || modelIdLower.includes('gemini');

  // Build provider-specific options for reasoning
  // Gateway uses native provider options instead of unified openrouter options
  const providerOptions: Record<string, Record<string, JsonValue>> = {};

  // Agent-level provider preferences (gateway order/only)
  const providerPref = agentRecord?.providerOptions?.[modelId];
  if (providerPref && typeof providerPref === 'object') {
    const gatewayPref: { order?: string[]; only?: string[] } = {};
    if (Array.isArray(providerPref.order) && providerPref.order.length > 0) {
      gatewayPref.order = providerPref.order;
    }
    if (Array.isArray(providerPref.only) && providerPref.only.length > 0) {
      gatewayPref.only = providerPref.only;
    }
    if (gatewayPref.order?.length || gatewayPref.only?.length) {
      providerOptions.gateway = gatewayPref as Record<string, JsonValue>;
    }
  }

  // Per-request override from client (ephemeral)
  if (providerOverride) {
    providerOptions.gateway = {
      order: [providerOverride],
      only: [providerOverride],
    } as Record<string, JsonValue>;
  }

  if (reasoningEnabled) {
    if (isAnthropicModel) {
      // Anthropic Claude models (claude-opus-4, claude-sonnet-4, claude-3-7-sonnet)
      // Use thinking with a budget in tokens
      providerOptions.anthropic = {
        thinking: { type: 'enabled', budgetTokens: 10000 },
      };
    } else if (isOpenAIModel) {
      // OpenAI reasoning models (o1, o3, o4, gpt-5, gpt-5.1)
      // For gpt-5 and gpt-5.1, BOTH reasoningEffort AND reasoningSummary are required
      // For o-series models, reasoningEffort controls reasoning depth
      providerOptions.openai = {
        reasoningEffort: 'low', // 'none' | 'low' | 'medium' | 'high'
        reasoningSummary: 'auto', // 'auto' | 'concise' | 'detailed'
      };
    } else if (isDeepSeekModel) {
      // DeepSeek reasoner model (deepseek-reasoner) exposes reasoning through streaming
      // automatically - no special providerOptions needed, reasoning just flows through
      // the fullStream as { type: 'reasoning', text: '...' } parts
      // Note: Other deepseek models don't support reasoning
    } else if (isGoogleModel) {
      // Google/Gemini models with thinking capability
      // Gemini 3 models: use thinkingLevel ('low' | 'medium' | 'high')
      // Gemini 2.5 models: use thinkingBudget (number of tokens)
      const isGemini3 = modelIdLower.includes('gemini-3');
      providerOptions.google = {
        thinkingConfig: isGemini3
          ? { thinkingLevel: 'medium', includeThoughts: true }
          : { thinkingBudget: 8192, includeThoughts: true },
      };
    }
  }

  if (isOpenAIModel && ensuredConversationId) {
    const openaiOptions = (providerOptions.openai ?? {}) as Record<string, JsonValue>;
    openaiOptions.promptCacheKey = `chat:${ensuredConversationId}:${modelId}`;
    if (modelIdLower.includes('gpt-5.1')) {
      openaiOptions.promptCacheRetention = '24h';
    }
    providerOptions.openai = openaiOptions;
  }

  // Build headers for provider-specific features
  const streamHeaders: Record<string, string> = {};

  // Enable interleaved thinking for Anthropic models when reasoning is enabled
  // This allows Claude to alternate between reasoning and tool use
  if (reasoningEnabled && isAnthropicModel) {
    streamHeaders['anthropic-beta'] = 'interleaved-thinking-2025-05-14';
  }

  // Debug logging
  const hasSystemMessage = (messages as UIMessage[]).some((m) => m.role === 'system');
  const messagesWithSystem = systemPrompt && !hasSystemMessage
    ? [
        {
          id: randomUUID(),
          role: 'system',
          parts: [{ type: 'text', text: systemPrompt }],
        } satisfies UIMessage,
        ...(messages as UIMessage[]),
      ]
    : (messages as UIMessage[]);
  const convertedMessages = await convertToModelMessages(messagesWithSystem);
  const messagesWithCacheControl = isAnthropicModel
    ? (applyAnthropicCacheControl(convertedMessages as Array<Record<string, unknown>>) as typeof convertedMessages)
    : convertedMessages;
  console.log('🔍 Debug - Model:', modelId);
  console.log('🔍 Debug - Provider:', isAnthropicModel ? 'anthropic' : isOpenAIModel ? 'openai' : isDeepSeekModel ? 'deepseek' : isGoogleModel ? 'google' : 'unknown');
  console.log('🔍 Debug - Reasoning enabled:', reasoningEnabled);
  console.log('🔍 Debug - Provider Options:', JSON.stringify(providerOptions, null, 2));
  console.log('🔍 Debug - Stream Headers:', JSON.stringify(streamHeaders, null, 2));
  console.log('🔍 Debug - UI Messages count:', messages.length);

  const result = streamText({
    model: gateway(modelId),
    abortSignal: req.signal,
    providerOptions,
    headers: Object.keys(streamHeaders).length > 0 ? streamHeaders : undefined,
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: 'word',
    }),
    tools,
    messages: messagesWithCacheControl,
    stopWhen: tools ? stepCountIs(10) : undefined,
    onStepFinish: (stepResult) => {
      if (process.env.NODE_ENV === 'production') return;

      // Cast to access all properties
      const step = stepResult as Record<string, unknown>;
      const { text, reasoning, toolCalls, toolResults, response } = step;

      console.log('\n' + '='.repeat(80));
      console.log('📍 STEP FINISHED');
      console.log('='.repeat(80));
      console.log('Step keys:', Object.keys(step));

      // Log reasoning content
      if (reasoning) {
        const reasoningStr = typeof reasoning === 'string' ? reasoning : JSON.stringify(reasoning);
        console.log('\n🧠 REASONING:');
        console.log('  - Type:', typeof reasoning);
        console.log('  - Length:', reasoningStr.length);
        console.log('  - Preview:', reasoningStr.slice(0, 200) + (reasoningStr.length > 200 ? '...' : ''));
      }

      // Log text content
      if (text && typeof text === 'string') {
        console.log('\n📝 TEXT:');
        console.log('  - Length:', text.length);
        console.log('  - Preview:', text.slice(0, 200) + (text.length > 200 ? '...' : ''));
      }

      // Log tool calls
      const toolCallsArr = toolCalls as Array<{ toolName: string; toolCallId?: string; args?: unknown }> | undefined;
      if (toolCallsArr && toolCallsArr.length > 0) {
        console.log('\n🔧 TOOL CALLS:', toolCallsArr.length);
        toolCallsArr.forEach((toolCall, idx) => {
          console.log(`  [${idx}] Tool: ${toolCall.toolName}`);
          console.log(`       ID: ${toolCall.toolCallId || 'N/A'}`);
          console.log(`       Args:`, JSON.stringify(toolCall.args || {}, null, 2).slice(0, 200));
        });
      }

      // Log tool results
      const toolResultsArr = toolResults as Array<{ toolName: string; toolCallId: string; result?: unknown }> | undefined;
      if (toolResultsArr && toolResultsArr.length > 0) {
        console.log('\n✅ TOOL RESULTS:', toolResultsArr.length);
        toolResultsArr.forEach((result, idx) => {
          console.log(`  [${idx}] Tool: ${result.toolName}`);
          console.log(`       ID: ${result.toolCallId}`);
          const resultStr = JSON.stringify(result.result || {});
          console.log(`       Result length: ${resultStr.length} chars`);
        });
      }

      // Log response info
      const resp = response as { id?: string; modelId?: string } | undefined;
      if (resp) {
        console.log('\n📦 RESPONSE:');
        console.log('  - ID:', resp.id);
        console.log('  - Model:', resp.modelId);
      }

      console.log('='.repeat(80) + '\n');
    },
    onFinish: async (result) => {
      // Extract provider metadata for cost info
      const resultWithMetadata = result as {
        providerMetadata?: {
          gateway?: {
            cost?: string;
            marketCost?: string;
            generationId?: string;
          };
          openai?: {
            cachedPromptTokens?: number;
          };
        };
      };

      // Get usage data
      const usage = normalizeUsage(result.usage);
      const openaiCachedPromptTokens = resultWithMetadata.providerMetadata?.openai?.cachedPromptTokens;
      if (typeof openaiCachedPromptTokens === 'number' && Number.isFinite(openaiCachedPromptTokens)) {
        const rounded = Math.max(0, Math.round(openaiCachedPromptTokens));
        if (rounded > 0) {
          usage.cachedInputTokens = Math.max(usage.cachedInputTokens, rounded);
          usage.inputTokenDetails.cacheReadTokens = Math.max(usage.inputTokenDetails.cacheReadTokens, rounded);
        }
      }
      const hasUsage = hasUsageValues(usage);
      assistantUsage = hasUsage ? usage : null;

      // Get gateway cost data
      const gatewayData = resultWithMetadata.providerMetadata?.gateway;
      const cost = gatewayData?.cost ? parseFloat(gatewayData.cost) : null;
      assistantGenerationId = gatewayData?.generationId ?? null;
      assistantGatewayCostUsd = gatewayData?.cost ?? (Number.isFinite(cost) ? cost.toString() : null);

      try {
        await updateAssistantUsage();
      } catch (error) {
        debugLog('Failed to persist assistant usage metadata', error);
      }
      let pricing = null as ReturnType<typeof priceGatewayCostOrNull>;
      try {
        pricing = priceGatewayCostOrNull({
          costUsd: gatewayData?.cost ?? cost ?? null,
        });
      } catch (error) {
        debugLog('Failed to price gateway cost', error);
      }

      // Log cost and token breakdown
      console.log('\n💰 GENERATION COST');
      console.log('─'.repeat(40));
      if (cost !== null) {
        console.log(`   Total Cost:      $${cost.toFixed(6)} USD`);
      } else {
        console.log('   Total Cost:      N/A');
      }
      if (pricing) {
        console.log(`   Base Cost:       $${(pricing.baseCents / 100).toFixed(2)} USD`);
        console.log(`   Markup (15%):    $${(pricing.markupCents / 100).toFixed(2)} USD`);
        console.log(`   Billed Total:    $${(pricing.totalCents / 100).toFixed(2)} USD`);
      }
      console.log(`   Input Tokens:    ${usage.inputTokens.toLocaleString()}`);
      console.log(`   Output Tokens:   ${usage.outputTokens.toLocaleString()}`);
      console.log(`   Cached Tokens:   ${usage.cachedInputTokens.toLocaleString()}`);
      console.log(`   Reasoning Tokens: ${usage.reasoningTokens.toLocaleString()}`);
      console.log(`   Total Tokens:    ${usage.totalTokens.toLocaleString()}`);
      if (gatewayData?.generationId) {
        console.log(`   Generation ID:   ${gatewayData.generationId}`);
      }
      console.log(`   User ID:         ${session.user.id}`);
      console.log(`   Conversation ID: ${ensuredConversationId ?? 'N/A'}`);
      console.log('─'.repeat(40) + '\n');

      try {
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

      if (pricing && pricing.totalMicrocents > 0n) {
        try {
          const totalMicrocents = Number(pricing.totalMicrocents);
          if (!Number.isSafeInteger(totalMicrocents)) {
            throw new Error('Gateway cost exceeds safe integer range');
          }
          await applyCreditDelta({
            userId: session.user.id,
            amountMicrocents: -totalMicrocents,
            entryType: 'usage',
            reason: `Chat usage (${modelId})`,
            externalSource: 'gateway',
            externalId: gatewayData?.generationId ?? null,
            metadata: {
              conversationId: ensuredConversationId,
              modelId,
              usage,
              gatewayCostUsd: gatewayData?.cost ?? cost,
              pricing: {
                baseCents: pricing.baseCents,
                markupCents: pricing.markupCents,
                totalCents: pricing.totalCents,
                baseMicrocents: pricing.baseMicrocents.toString(),
                markupMicrocents: pricing.markupMicrocents.toString(),
                totalMicrocents: pricing.totalMicrocents.toString(),
              },
            },
          });
          const billedUsd = totalMicrocents / 100000000;
          console.log(`💳 Credits debited: -$${billedUsd.toFixed(8)} USD`);
        } catch (error) {
          debugLog('Failed to debit credits', error);
        }
      } else {
        console.log('💳 Credits debited: N/A (missing gateway cost)');
      }
    },
  });

  const response = result.toUIMessageStreamResponse({
    originalMessages: messages as UIMessage[],
    generateMessageId: randomUUID,
    sendReasoning: true,
    sendSources: true,
    onFinish: async ({ responseMessage }) => {
      try {
        await persistAssistantMessage(responseMessage as UIMessage);
      } catch (error) {
        debugLog('Failed to persist assistant message', error);
      }
    },
  });
  response.headers.set('x-conversation-id', ensuredConversationId!);
  response.headers.set('x-reasoning-enabled', String(reasoningEnabled));
  response.headers.set('x-web-search-enabled', String(webSearchEnabled));

  return response;
}
