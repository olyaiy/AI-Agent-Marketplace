import { auth } from '@/lib/auth';
import { searchAgentsForHomeRow } from '@/actions/homeRows';

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

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return new Response(JSON.stringify({ error: admin.error }), {
      status: admin.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q') ?? '';
  const limit = searchParams.get('limit');

  const agents = await searchAgentsForHomeRow(search, limit ? Number(limit) : undefined);
  return new Response(JSON.stringify({ agents }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
