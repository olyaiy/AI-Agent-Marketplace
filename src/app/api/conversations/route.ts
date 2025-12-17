import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { agent, conversation, message } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

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

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const rows = await db
    .select({
      id: conversation.id,
      agentTag: conversation.agentTag,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.lastMessageAt,
      agentName: agent.name,
      agentAvatar: agent.avatar,
    })
    .from(conversation)
    .leftJoin(agent, sql`${conversation.agentTag} = ${agent.tag}`)
    .where(sql`${conversation.userId} = ${session.user.id}`)
    .orderBy(sql`COALESCE(${conversation.lastMessageAt}, ${conversation.updatedAt}, ${conversation.createdAt}) DESC`)
    .limit(15);

  const items = rows.map((r) => {
    const date = (r.lastMessageAt as unknown as string) || (r.updatedAt as unknown as string) || (r.createdAt as unknown as string);
    const agentId = r.agentTag?.startsWith("@") ? r.agentTag.slice(1) : (r.agentTag as unknown as string);
    return {
      id: r.id,
      agentId,
      agentTag: r.agentTag,
      dateIso: new Date(date).toISOString(),
      title: r.title || null,
      agentName: r.agentName || agentId,
      agentAvatar: r.agentAvatar || null,
    };
  });

  return new Response(JSON.stringify(items), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'private, no-cache, no-store, must-revalidate',
    },
  });
}


export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { agentTag, model, title, knowledgeText }: { agentTag: string; model?: string; title?: string; knowledgeText?: string } = await req.json().catch(() => ({ agentTag: 'unknown' as string, model: undefined, title: undefined, knowledgeText: undefined }));

  if (!agentTag || typeof agentTag !== 'string') {
    return new Response(JSON.stringify({ error: 'agentTag is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const id = randomUUID();

  // Truncate title to first 60 characters if provided
  const conversationTitle = title ? title.slice(0, 60).trim() : null;

  const requestedModelId = normalizeModelId(model);
  let allowedModels: string[] = [];
  let fallbackModel: string | undefined;
  try {
    const rows = await db
      .select({ primary: agent.model, secondary: agent.secondaryModels })
      .from(agent)
      .where(eq(agent.tag, agentTag))
      .limit(1);
    const record = rows[0];
    if (record) {
      fallbackModel = record.primary;
      allowedModels = [record.primary, ...(Array.isArray(record.secondary) ? record.secondary : [])].filter(Boolean);
    }
  } catch {
    // ignore validation issues and fall back to default
  }
  let modelId = requestedModelId ?? fallbackModel ?? 'openai/gpt-5-nano';
  if (allowedModels.length > 0 && !allowedModels.includes(modelId)) {
    modelId = allowedModels[0];
  }

  await db.insert(conversation).values({
    id,
    userId: session.user.id,
    agentTag,
    modelId,
    title: conversationTitle,
  });

  // Optionally persist initial system message containing combined system/knowledge text
  if (typeof knowledgeText === 'string' && knowledgeText.trim().length > 0) {
    try {
      await db.insert(message).values({
        id: randomUUID(),
        conversationId: id,
        role: 'system',
        uiParts: [{ type: 'text', text: knowledgeText }] as unknown as Record<string, unknown>[],
        textPreview: knowledgeText.slice(0, 280),
        hasToolCalls: false,
      });
    } catch {
      // ignore
    }
  }

  return new Response(JSON.stringify({ id, agentTag, title: conversationTitle }), {
    status: 201,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}
