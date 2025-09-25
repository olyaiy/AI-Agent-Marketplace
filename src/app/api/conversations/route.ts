import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { conversation } from '@/db/schema';
import { randomUUID } from 'node:crypto';

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const {
    agentTag,
    systemPrompt,
    model,
  }: { agentTag: string; systemPrompt?: string; model?: string } = await req.json().catch(() => ({ agentTag: 'unknown' } as any));

  if (!agentTag || typeof agentTag !== 'string') {
    return new Response(JSON.stringify({ error: 'agentTag is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const id = randomUUID();

  await db.insert(conversation).values({
    id,
    userId: session.user.id,
    agentTag,
    systemPrompt,
    modelId: (model && String(model)) || 'openai/gpt-5-nano',
  });

  return new Response(JSON.stringify({ id }), {
    status: 201,
    headers: { 'content-type': 'application/json' },
  });
}


