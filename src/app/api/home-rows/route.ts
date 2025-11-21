import { auth } from '@/lib/auth';
import { createHomeRow, listHomeRows } from '@/actions/homeRows';

async function requireAdmin(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return { ok: false, status: 401, error: 'Unauthorized' } as const;
  }
  if (session.user.role !== 'admin') {
    return { ok: false, status: 403, error: 'Forbidden' } as const;
  }
  return { ok: true, user: session.user } as const;
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return new Response(JSON.stringify({ error: admin.error }), {
      status: admin.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const rows = await listHomeRows({ includeUnpublished: true });
  return new Response(JSON.stringify({ rows }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
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
  const maxItems = body?.maxItems === undefined ? undefined : Number(body.maxItems);

  const result = await createHomeRow({
    title: body?.title,
    slug: body?.slug,
    description: body?.description,
    isPublished: Boolean(body?.isPublished),
    maxItems: Number.isFinite(maxItems) ? maxItems : null,
  });

  const status = result.ok ? 201 : 400;
  return new Response(JSON.stringify(result), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
