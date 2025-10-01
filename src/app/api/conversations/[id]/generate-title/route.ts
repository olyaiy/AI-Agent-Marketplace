import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { conversation, message } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { generateConversationTitle } from '@/lib/title-generation';

export async function POST(
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

  // Verify ownership
  const existingConversation = await db
    .select({ id: conversation.id, title: conversation.title })
    .from(conversation)
    .where(sql`${conversation.id} = ${id} AND ${conversation.userId} = ${session.user.id}`)
    .limit(1);

  if (existingConversation.length === 0) {
    return new Response(JSON.stringify({ error: 'Conversation not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Get the first user message from this conversation
  const firstMessage = await db
    .select({ textPreview: message.textPreview })
    .from(message)
    .where(sql`${message.conversationId} = ${id} AND ${message.role} = 'user'`)
    .orderBy(sql`${message.createdAt} ASC`)
    .limit(1);

  if (firstMessage.length === 0 || !firstMessage[0].textPreview) {
    return new Response(JSON.stringify({ error: 'No message found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Generate AI-powered title
  const generatedTitle = await generateConversationTitle(firstMessage[0].textPreview);

  // Update conversation with new title
  await db
    .update(conversation)
    .set({ title: generatedTitle, updatedAt: new Date() })
    .where(sql`${conversation.id} = ${id}`);

  return new Response(JSON.stringify({ id, title: generatedTitle }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
