import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { conversation, message } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

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
    })
    .from(conversation)
    .where(sql`${conversation.userId} = ${session.user.id}`)
    .orderBy(sql`COALESCE(${conversation.lastMessageAt}, ${conversation.updatedAt}, ${conversation.createdAt}) DESC`)
    .limit(10);

  const items = rows.map((r) => {
    const date = (r.lastMessageAt as unknown as string) || (r.updatedAt as unknown as string) || (r.createdAt as unknown as string);
    const agentId = r.agentTag?.startsWith("@") ? r.agentTag.slice(1) : (r.agentTag as unknown as string);
    return { 
      id: r.id, 
      agentId, 
      dateIso: new Date(date).toISOString(),
      title: r.title || null,
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

  await db.insert(conversation).values({
    id,
    userId: session.user.id,
    agentTag,
    modelId: (model && String(model)) || 'openai/gpt-5-nano',
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


