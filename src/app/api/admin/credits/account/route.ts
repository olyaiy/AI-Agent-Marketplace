import { auth } from '@/lib/auth';
import { ensureCreditAccount, listCreditLedger, serializeCreditAccount } from '@/lib/billing/credit-store';

async function requireAdmin(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return { ok: false, status: 401, error: 'Unauthorized' } as const;
  }
  if (session.user.role !== 'admin') {
    return { ok: false, status: 403, error: 'Forbidden' } as const;
  }
  return { ok: true, adminId: session.user.id } as const;
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
  const userId = searchParams.get('userId')?.trim();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const account = await ensureCreditAccount(userId);
  const ledger = await listCreditLedger(userId, { limit: 5, offset: 0 });

  return new Response(JSON.stringify({ account: serializeCreditAccount(account), ledger }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
