import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { conversation, message } from '@/db/schema';
import { sql } from 'drizzle-orm';

interface UIMessagePartText {
  type: 'text';
  text: string;
}

interface UIMessageShape {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: readonly UIMessagePartText[] | readonly unknown[];
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { conversationId, message: uiMessage }: { conversationId: string; message: UIMessageShape } = await req.json();
  if (!conversationId || !uiMessage) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Verify ownership
  const convo = await db
    .select({ id: conversation.id })
    .from(conversation)
    .where(sql`${conversation.id} = ${conversationId} AND ${conversation.userId} = ${session.user.id}`)
    .limit(1);
  if (convo.length === 0) {
    return new Response(JSON.stringify({ error: 'Conversation not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  const textPreview = Array.isArray(uiMessage.parts)
    ? (uiMessage.parts as any[])
        .filter((p) => p && typeof p === 'object' && (p as any).type === 'text' && typeof (p as any).text === 'string')
        .map((p) => (p as any).text as string)
        .join(' ')
        .slice(0, 280)
    : null;

  await db
    .insert(message)
    .values({
      id: uiMessage.id,
      conversationId,
      role: uiMessage.role,
      uiParts: uiMessage.parts as unknown as any,
      textPreview: textPreview || null,
      hasToolCalls: false,
    })
    .onConflictDoNothing();

  await db
    .update(conversation)
    .set({ updatedAt: new Date(), lastMessageAt: new Date() })
    .where(sql`${conversation.id} = ${conversationId}`);

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { 'content-type': 'application/json' },
  });
}

export async function DELETE(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { messageId }: { messageId: string } = await req.json();
  if (!messageId) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Verify ownership via conversation
  const msg = await db
    .select({ 
      id: message.id,
      conversationId: message.conversationId,
      userId: conversation.userId 
    })
    .from(message)
    .innerJoin(conversation, sql`${message.conversationId} = ${conversation.id}`)
    .where(sql`${message.id} = ${messageId}`)
    .limit(1);

  if (msg.length === 0) {
    return new Response(JSON.stringify({ error: 'Message not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (msg[0].userId !== session.user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }

  await db.delete(message).where(sql`${message.id} = ${messageId}`);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

