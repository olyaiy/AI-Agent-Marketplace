import { auth } from '@/lib/auth';
import { deleteHomeRow, updateHomeRow } from '@/actions/homeRows';
import { type NextRequest } from 'next/server';

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

export async function PATCH(req: NextRequest, context: { params: Promise<{ rowId: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return new Response(JSON.stringify({ error: admin.error }), {
      status: admin.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = await req.json().catch(() => ({}));
  const maxItems = body?.maxItems === undefined ? undefined : Number(body.maxItems);

  const result = await updateHomeRow({
    id: params.rowId,
    title: body?.title,
    slug: body?.slug,
    description: body?.description,
    isPublished: typeof body?.isPublished === 'boolean' ? body.isPublished : undefined,
    maxItems: Number.isFinite(maxItems) ? maxItems : body?.maxItems === null ? null : undefined,
  });

  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 400,
    headers: { 'content-type': 'application/json' },
  });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ rowId: string }> }) {
  const params = await context.params;
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return new Response(JSON.stringify({ error: admin.error }), {
      status: admin.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const result = await deleteHomeRow(params.rowId);
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 400,
    headers: { 'content-type': 'application/json' },
  });
}
