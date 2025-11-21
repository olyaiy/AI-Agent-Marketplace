import { NextResponse } from 'next/server';
import { getAgentForViewer } from '@/actions/agents';
import { auth } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ 'agent-id': string }> }
) {
  const { 'agent-id': id } = await params;
  const tag = `@${id}`;
  const url = new URL(req.url);
  const invite = url.searchParams.get('invite');
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  const { agent, reason } = await getAgentForViewer({
    tag,
    userId: session?.user?.id,
    userRole: session?.user?.role,
    inviteCode: invite,
  });
  if (!agent) {
    const status = reason === 'not_found' ? 404 : 403;
    return NextResponse.json({ ok: false }, { status });
  }
  return NextResponse.json({ ok: true, name: agent.name, visibility: agent.visibility });
}

