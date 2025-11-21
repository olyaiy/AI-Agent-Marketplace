import { auth } from '@/lib/auth';
import { setHomeRowOrder } from '@/actions/homeRows';

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

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return new Response(JSON.stringify({ error: admin.error }), {
      status: admin.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = await req.json().catch(() => ({}));
  const orderIds = Array.isArray(body?.orderIds) ? body.orderIds.map(String) : [];

  const result = await setHomeRowOrder(orderIds);
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 400,
    headers: { 'content-type': 'application/json' },
  });
}
