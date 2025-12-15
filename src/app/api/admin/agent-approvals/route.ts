import { auth } from '@/lib/auth';
import { approveAgentForPublic, listAgentApprovalQueue, rejectAgentForPublic, type PublishStatus } from '@/actions/agents';

async function requireAdmin(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return { ok: false, status: 401, error: 'Unauthorized' } as const;
  }
  if (session.user.role !== 'admin') {
    return { ok: false, status: 403, error: 'Forbidden' } as const;
  }
  return { ok: true, userId: session.user.id } as const;
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
  const statusParam = searchParams.get('status');
  const rawStatuses = statusParam ? statusParam.split(',').map((s) => s.trim()).filter(Boolean) : ['pending_review'];
  const allowedStatuses: PublishStatus[] = ['draft', 'pending_review', 'approved', 'rejected'];
  const statuses = rawStatuses.filter((s): s is PublishStatus => allowedStatuses.includes(s as PublishStatus));
  const requests = await listAgentApprovalQueue(statuses.length ? statuses : ['pending_review']);

  return new Response(JSON.stringify({ requests }), {
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
  const tag = typeof body?.tag === 'string' ? body.tag.trim() : '';
  const action = typeof body?.action === 'string' ? body.action.trim().toLowerCase() : '';
  const notes = typeof body?.notes === 'string' ? body.notes.trim() : undefined;

  if (!tag || (action !== 'approve' && action !== 'reject')) {
    return new Response(JSON.stringify({ error: 'Missing tag or action' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const result = action === 'approve'
    ? await approveAgentForPublic(tag, admin.userId, notes)
    : await rejectAgentForPublic(tag, admin.userId, notes);

  const status = result.ok ? 200 : 400;
  return new Response(JSON.stringify(result), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
