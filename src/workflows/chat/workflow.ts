import { DurableAgent } from '@workflow/ai/agent';
import { getWritable, sleep } from 'workflow';
import { stepCountIs, type ModelMessage, type UIMessageChunk } from 'ai';
import { tavilyReadPageTool, tavilySearchTool } from '@/lib/tavily';
import { db } from '@/db/drizzle';
import { conversation, message } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { applyCreditDelta } from '@/lib/billing/credit-store';
import { priceGatewayCostOrNull } from '@/lib/billing/pricing';
import { normalizeUsage, hasUsageValues } from '@/lib/ai-usage';
import { randomUUID } from 'node:crypto';

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

type ProviderOptions = Record<string, Record<string, JsonValue>>;

export type ChatWorkflowInput = {
  messages: ModelMessage[];
  modelId: string;
  providerOptions?: ProviderOptions;
  headers?: Record<string, string>;
  webSearchEnabled?: boolean;
  conversationId: string;
  userId: string;
};

export async function chatWorkflow(input: ChatWorkflowInput) {
  'use workflow';

  const writable = getWritable<UIMessageChunk>();
  const assistantMessageId = await writeAssistantStart(writable);

  const tools = input.webSearchEnabled
    ? {
      'web-search': tavilySearchTool,
      'read-page': tavilyReadPageTool,
    }
    : undefined;

  const agent = new DurableAgent({
    model: input.modelId,
    tools,
  });

  let streamResult: Awaited<ReturnType<typeof agent.stream>> | null = null;

  try {
    streamResult = await agent.stream({
      messages: input.messages,
      writable,
      sendStart: false,
      sendFinish: true,
      stopWhen: tools ? stepCountIs(10) : undefined,
      headers: input.headers,
      providerOptions: input.providerOptions,
      onStepFinish: (stepResult) => {
        if (process.env.NODE_ENV === 'production') return;

        const step = stepResult as Record<string, unknown>;
        const { text, reasoning, toolCalls, toolResults, response } = step;

        console.log('\n' + '='.repeat(80));
        console.log('📍 STEP FINISHED');
        console.log('='.repeat(80));
        console.log('Step keys:', Object.keys(step));

        if (reasoning) {
          const reasoningStr = typeof reasoning === 'string' ? reasoning : JSON.stringify(reasoning);
          console.log('\n🧠 REASONING:');
          console.log('  - Type:', typeof reasoning);
          console.log('  - Length:', reasoningStr.length);
          console.log('  - Preview:', reasoningStr.slice(0, 200) + (reasoningStr.length > 200 ? '...' : ''));
        }

        if (text && typeof text === 'string') {
          console.log('\n📝 TEXT:');
          console.log('  - Length:', text.length);
          console.log('  - Preview:', text.slice(0, 200) + (text.length > 200 ? '...' : ''));
        }

        const toolCallsArr = toolCalls as Array<{ toolName: string; toolCallId?: string; args?: unknown; input?: unknown }> | undefined;
        if (toolCallsArr && toolCallsArr.length > 0) {
          console.log('\n🔧 TOOL CALLS:', toolCallsArr.length);
          toolCallsArr.forEach((toolCall, idx) => {
            console.log(`  [${idx}] Tool: ${toolCall.toolName}`);
            console.log(`       ID: ${toolCall.toolCallId || 'N/A'}`);
            const callArgs = toolCall.args ?? toolCall.input ?? {};
            console.log('       Args:', JSON.stringify(callArgs, null, 2).slice(0, 200));
          });
        }

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

        const resp = response as { id?: string; modelId?: string } | undefined;
        if (resp) {
          console.log('\n📦 RESPONSE:');
          console.log('  - ID:', resp.id);
          console.log('  - Model:', resp.modelId);
        }

        console.log('='.repeat(80) + '\n');
      },
    });
  } catch (error) {
    console.error('❌ Agent stream failed', error);
    throw error;
  }

  if (!streamResult) return;

  const steps = streamResult.steps ?? [];
  const lastStep = steps.length > 0 ? steps[steps.length - 1] : null;
  if (!lastStep) return;

  const resultWithMetadata = lastStep as {
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

  const usage = normalizeUsage(lastStep.usage);
  const openaiCachedPromptTokens = resultWithMetadata.providerMetadata?.openai?.cachedPromptTokens;
  if (typeof openaiCachedPromptTokens === 'number' && Number.isFinite(openaiCachedPromptTokens)) {
    const rounded = Math.max(0, Math.round(openaiCachedPromptTokens));
    if (rounded > 0) {
      usage.cachedInputTokens = Math.max(usage.cachedInputTokens, rounded);
      usage.inputTokenDetails.cacheReadTokens = Math.max(usage.inputTokenDetails.cacheReadTokens, rounded);
    }
  }
  const hasUsage = hasUsageValues(usage);

  const gatewayData = resultWithMetadata.providerMetadata?.gateway;
  const cost = gatewayData?.cost ? parseFloat(gatewayData.cost) : null;
  const assistantGenerationId = gatewayData?.generationId ?? null;
  const assistantGatewayCostUsd = gatewayData?.cost ?? (Number.isFinite(cost) ? cost.toString() : null);
  let pricing = null as ReturnType<typeof priceGatewayCostOrNull>;
  try {
    pricing = priceGatewayCostOrNull({
      costUsd: gatewayData?.cost ?? cost ?? null,
    });
  } catch (error) {
    console.error('Failed to price gateway cost', error);
  }

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
  console.log(`   User ID:         ${input.userId}`);
  console.log(`   Conversation ID: ${input.conversationId}`);
  console.log('─'.repeat(40) + '\n');

  if (hasUsage) {
    await updateConversationUsage(input.conversationId, usage);
  }

  if (assistantMessageId) {
    const updatePayload = {
      messageId: assistantMessageId,
      modelId: input.modelId,
      usage: hasUsage ? usage : null,
      generationId: assistantGenerationId,
      gatewayCostUsd: assistantGatewayCostUsd,
    };
    let updated = await updateAssistantMessageMetadata(updatePayload);
    if (!updated) {
      for (let attempt = 0; attempt < 3 && !updated; attempt++) {
        await sleep('250ms');
        updated = await updateAssistantMessageMetadata(updatePayload);
      }
    }
  }

  if (pricing && pricing.totalMicrocents > 0n) {
    await debitCredits({
      userId: input.userId,
      conversationId: input.conversationId,
      modelId: input.modelId,
      usage,
      gatewayCostUsd: gatewayData?.cost ?? cost ?? null,
      generationId: assistantGenerationId,
      pricing,
    });
  } else {
    console.log('💳 Credits debited: N/A (missing gateway cost)');
  }
}

async function writeAssistantStart(writable: WritableStream<UIMessageChunk>) {
  'use step';
  const messageId = randomUUID();
  const writer = writable.getWriter();
  try {
    await writer.write({ type: 'start', messageId });
  } finally {
    writer.releaseLock();
  }
  return messageId;
}

async function updateAssistantMessageMetadata(options: {
  messageId: string;
  modelId: string;
  usage: ReturnType<typeof normalizeUsage> | null;
  generationId: string | null;
  gatewayCostUsd: string | null;
}) {
  'use step';
  try {
    const updateValues: Partial<typeof message.$inferInsert> = {
      modelId: options.modelId,
    };
    if (options.usage) {
      updateValues.tokenUsage = options.usage as unknown as typeof message.$inferInsert['tokenUsage'];
    }
    if (options.generationId) {
      updateValues.generationId = options.generationId;
    }
    if (options.gatewayCostUsd) {
      updateValues.gatewayCostUsd = options.gatewayCostUsd;
    }

    const updated = await db
      .update(message)
      .set(updateValues)
      .where(eq(message.id, options.messageId))
      .returning({ id: message.id });

    return updated.length > 0;
  } catch (error) {
    console.error('Failed to update assistant message metadata', error);
    return false;
  }
}

async function updateConversationUsage(
  conversationId: string,
  usage: ReturnType<typeof normalizeUsage>,
) {
  'use step';
  try {
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
      .where(eq(conversation.id, conversationId));
  } catch (error) {
    console.error('Failed to persist usage totals', error);
  }
}

async function debitCredits(options: {
  userId: string;
  conversationId: string;
  modelId: string;
  usage: ReturnType<typeof normalizeUsage>;
  gatewayCostUsd: string | null;
  generationId: string | null;
  pricing: ReturnType<typeof priceGatewayCostOrNull>;
}) {
  'use step';
  try {
    if (!options.pricing) return;
    const totalMicrocents = Number(options.pricing.totalMicrocents);
    if (!Number.isSafeInteger(totalMicrocents)) {
      throw new Error('Gateway cost exceeds safe integer range');
    }
    await applyCreditDelta({
      userId: options.userId,
      amountMicrocents: -totalMicrocents,
      entryType: 'usage',
      reason: `Chat usage (${options.modelId})`,
      externalSource: 'gateway',
      externalId: options.generationId ?? null,
      metadata: {
        conversationId: options.conversationId,
        modelId: options.modelId,
        usage: options.usage,
        gatewayCostUsd: options.gatewayCostUsd,
        pricing: {
          baseCents: options.pricing.baseCents,
          markupCents: options.pricing.markupCents,
          totalCents: options.pricing.totalCents,
          baseMicrocents: options.pricing.baseMicrocents.toString(),
          markupMicrocents: options.pricing.markupMicrocents.toString(),
          totalMicrocents: options.pricing.totalMicrocents.toString(),
        },
      },
    });
    const billedUsd = totalMicrocents / 100000000;
    console.log(`💳 Credits debited: -$${billedUsd.toFixed(8)} USD`);
  } catch (error) {
    console.error('Failed to debit credits', error);
  }
}
