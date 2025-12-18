import { z } from 'zod';
import { auth } from '@/lib/auth';
import { applyCreditDelta } from '@/lib/billing/credit-store';

const bodySchema = z.object({
  userId: z.string().min(1),
  amountCents: z.number().int(),
  reason: z.string().min(1).max(256),
  note: z.string().max(500).optional(),
});

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

  if (payload.amountCents === 0) {
    return new Response(JSON.stringify({ error: 'amountCents must be non-zero' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const balanceCents = await applyCreditDelta({
    userId: payload.userId,
    amountCents: payload.amountCents,
    entryType: 'adjustment',
    reason: payload.reason,
    externalSource: 'admin',
    metadata: {
      adminUserId: admin.adminId,
      note: payload.note ?? null,
    },
  });

  return new Response(JSON.stringify({ balanceCents }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
