import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { conversation } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function PATCH(
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
  const { title }: { title?: string } = await req.json().catch(() => ({ title: undefined }));

  if (!title || typeof title !== 'string') {
    return new Response(JSON.stringify({ error: 'Title is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Verify ownership before updating
  const existing = await db
    .select({ id: conversation.id })
    .from(conversation)
    .where(sql`${conversation.id} = ${id} AND ${conversation.userId} = ${session.user.id}`)
    .limit(1);

  if (existing.length === 0) {
    return new Response(JSON.stringify({ error: 'Conversation not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  const trimmedTitle = title.slice(0, 60).trim();

  await db
    .update(conversation)
    .set({ title: trimmedTitle, updatedAt: new Date() })
    .where(sql`${conversation.id} = ${id}`);

  return new Response(JSON.stringify({ id, title: trimmedTitle }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

export async function DELETE(
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

  // Verify ownership before deleting
  const existing = await db
    .select({ id: conversation.id })
    .from(conversation)
    .where(sql`${conversation.id} = ${id} AND ${conversation.userId} = ${session.user.id}`)
    .limit(1);

  if (existing.length === 0) {
    return new Response(JSON.stringify({ error: 'Conversation not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Delete conversation (cascade will delete messages)
  await db
    .delete(conversation)
    .where(sql`${conversation.id} = ${id}`);

  return new Response(JSON.stringify({ id, deleted: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
