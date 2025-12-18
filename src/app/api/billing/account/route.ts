import { z } from 'zod';
import { auth } from '@/lib/auth';
import { ensureCreditAccount, serializeCreditAccount, updateCreditAccountSettings } from '@/lib/billing/credit-store';

const updateSchema = z.object({
  autoReloadEnabled: z.boolean().optional(),
  autoReloadThresholdCents: z.number().int().nonnegative().nullable().optional(),
  autoReloadAmountCents: z.number().int().nonnegative().nullable().optional(),
});

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const account = await ensureCreditAccount(session.user.id);

  return new Response(JSON.stringify({ account: serializeCreditAccount(account) }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  let payload: z.infer<typeof updateSchema>;
  try {
    const raw = await req.json();
    const parsed = updateSchema.safeParse(raw ?? {});
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

  const existing = await ensureCreditAccount(session.user.id);
  const next = {
    autoReloadEnabled: payload.autoReloadEnabled ?? existing.autoReloadEnabled,
    autoReloadThresholdCents: payload.autoReloadThresholdCents ?? existing.autoReloadThresholdCents,
    autoReloadAmountCents: payload.autoReloadAmountCents ?? existing.autoReloadAmountCents,
  };

  if (next.autoReloadEnabled) {
    if (next.autoReloadThresholdCents == null || next.autoReloadAmountCents == null || next.autoReloadAmountCents <= 0) {
      return new Response(JSON.stringify({ error: 'Auto-reload requires threshold and amount' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
  } else {
    next.autoReloadThresholdCents = null;
    next.autoReloadAmountCents = null;
  }

  const updated = await updateCreditAccountSettings(session.user.id, next);

  return new Response(JSON.stringify({ account: serializeCreditAccount(updated) }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
