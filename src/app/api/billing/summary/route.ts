import { auth } from '@/lib/auth';
import { creditLedger } from '@/db/schema';
import { db } from '@/db/drizzle';
import { and, eq, sql } from 'drizzle-orm';

const parseWindowDays = (value: string | null, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(Math.floor(num), 365);
};

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { searchParams } = new URL(req.url);
  const windowDays = parseWindowDays(searchParams.get('windowDays'), 30);
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      totalSpentMicrocents: sql<number>`COALESCE(SUM(CASE WHEN ${creditLedger.amountMicrocents} < 0 THEN -${creditLedger.amountMicrocents} ELSE 0 END), 0)`,
      totalCreditsMicrocents: sql<number>`COALESCE(SUM(CASE WHEN ${creditLedger.amountMicrocents} > 0 THEN ${creditLedger.amountMicrocents} ELSE 0 END), 0)`,
    })
    .from(creditLedger)
    .where(
      and(
        eq(creditLedger.userId, session.user.id),
        sql`${creditLedger.createdAt} >= ${windowStart}`
      )
    );

  const totals = rows[0] ?? { totalSpentMicrocents: 0, totalCreditsMicrocents: 0 };
  const totalSpentMicrocents = Number(totals.totalSpentMicrocents ?? 0) || 0;
  const totalCreditsMicrocents = Number(totals.totalCreditsMicrocents ?? 0) || 0;

  return new Response(JSON.stringify({ windowDays, totalSpentMicrocents, totalCreditsMicrocents }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
