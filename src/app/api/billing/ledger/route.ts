import { auth } from '@/lib/auth';
import { ensureCreditAccount, listCreditLedger } from '@/lib/billing/credit-store';

const parseLimit = (value: string | null, fallback: number) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.min(Math.floor(num), 100) : fallback;
};

const parseOffset = (value: string | null) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.floor(num) : 0;
};

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  await ensureCreditAccount(session.user.id);
  const { searchParams } = new URL(req.url);
  const limit = parseLimit(searchParams.get('limit'), 20);
  const offset = parseOffset(searchParams.get('offset'));
  const entries = await listCreditLedger(session.user.id, { limit, offset });

  return new Response(JSON.stringify({ entries, limit, offset }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
