import { auth } from '@/lib/auth';
import { setHomeRowAgents } from '@/actions/homeRows';

async function requireAdmin(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return { ok: false, status: 401, error: 'Unauthorized' } as const;
  }
  if (session.user.role !== 'admin') {
    return { ok: false, status: 403, error: 'Forbidden' } as const;
  }
  return { ok: true } as const;
}

export async function POST(req: Request, { params }: { params: { rowId: string } }) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return new Response(JSON.stringify({ error: admin.error }), {
      status: admin.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = await req.json().catch(() => ({}));
  const agentTags = Array.isArray(body?.agentTags) ? body.agentTags.map(String) : [];

  const result = await setHomeRowAgents(params.rowId, agentTags);
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 400,
    headers: { 'content-type': 'application/json' },
  });
}
