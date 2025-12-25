import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { conversation } from '@/db/schema';
import { sql } from 'drizzle-orm';

const coalesceNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { id } = await params;

  const rows = await db
    .select({
      id: conversation.id,
      userId: conversation.userId,
      modelId: conversation.modelId,
      totalInputTokens: conversation.totalInputTokens,
      totalOutputTokens: conversation.totalOutputTokens,
      totalTokens: conversation.totalTokens,
      cachedInputTokens: conversation.cachedInputTokens,
      reasoningTokens: conversation.reasoningTokens,
      lastUsage: conversation.lastUsage,
    })
    .from(conversation)
    .where(sql`${conversation.id} = ${id} AND ${conversation.userId} = ${session.user.id}`)
    .limit(1);

  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: 'Conversation not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  const row = rows[0];
  const usage = (row.lastUsage as Record<string, unknown> | null) ?? {};
  const inputTokenDetails = (usage.inputTokenDetails ?? {}) as Record<string, unknown>;
  const outputTokenDetails = (usage.outputTokenDetails ?? {}) as Record<string, unknown>;
  const inputTokens = coalesceNumber(usage.inputTokens);
  const outputTokens = coalesceNumber(usage.outputTokens);
  const cachedInputTokens = coalesceNumber(
    inputTokenDetails.cacheReadTokens ?? usage.cachedInputTokens
  );
  const reasoningTokens = coalesceNumber(
    outputTokenDetails.reasoningTokens ?? usage.reasoningTokens
  );
  const totalTokens = usage.totalTokens != null
    ? coalesceNumber(usage.totalTokens)
    : inputTokens + outputTokens + reasoningTokens;
  const normalizedUsage = {
    inputTokens,
    outputTokens,
    totalTokens,
    cachedInputTokens,
    reasoningTokens,
  };

  return new Response(
    JSON.stringify({
      conversationId: row.id,
      modelId: row.modelId,
      usage: normalizedUsage,
      totals: {
        input: coalesceNumber(row.totalInputTokens),
        output: coalesceNumber(row.totalOutputTokens),
        total: coalesceNumber(row.totalTokens),
        cachedInput: coalesceNumber(row.cachedInputTokens),
        reasoning: coalesceNumber(row.reasoningTokens),
      },
    }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }
  );
}
