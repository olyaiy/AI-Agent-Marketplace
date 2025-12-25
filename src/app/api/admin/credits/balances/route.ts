import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { creditAccount } from '@/db/schema';
import { inArray } from 'drizzle-orm';

const bodySchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(100),
});

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

  let payload: z.infer<typeof bodySchema>;
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw ?? {});
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid payload', details: parsed.error.flatten() }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    payload = parsed.data;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const uniqueUserIds = Array.from(
    new Set(payload.userIds.map((id) => id.trim()).filter(Boolean))
  ).slice(0, 100);

  if (uniqueUserIds.length === 0) {
    return new Response(JSON.stringify({ error: 'userIds is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  await db
    .insert(creditAccount)
    .values(uniqueUserIds.map((userId) => ({ userId })))
    .onConflictDoNothing();

  const balances = await db
    .select({
      userId: creditAccount.userId,
      balanceMicrocents: creditAccount.balanceMicrocents,
      currency: creditAccount.currency,
    })
    .from(creditAccount)
    .where(inArray(creditAccount.userId, uniqueUserIds));

  return new Response(JSON.stringify({ balances }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
