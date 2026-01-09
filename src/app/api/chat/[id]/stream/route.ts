import { createUIMessageStreamResponse } from 'ai';
import { getRun } from 'workflow/api';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { conversation } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const startIndexParam = searchParams.get('startIndex');
  const startIndex = startIndexParam ? Number.parseInt(startIndexParam, 10) : undefined;

  const rows = await db
    .select({ id: conversation.id })
    .from(conversation)
    .where(sql`${conversation.activeRunId} = ${id} AND ${conversation.userId} = ${session.user.id}`)
    .limit(1);

  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: 'Run not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  const run = getRun(id);
  const stream = run.getReadable({
    startIndex: Number.isFinite(startIndex) ? startIndex : undefined,
  });

  return createUIMessageStreamResponse({ stream });
}
