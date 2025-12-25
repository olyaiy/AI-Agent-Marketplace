import { randomUUID } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db/drizzle';
import { creditAccount, creditLedger } from '@/db/schema';
import type { CreditAccount, CreditLedgerEntryInput, CreditStore } from '@/lib/billing/credits';

const accountColumns = {
  userId: creditAccount.userId,
  balanceMicrocents: creditAccount.balanceMicrocents,
  currency: creditAccount.currency,
  stripeCustomerId: creditAccount.stripeCustomerId,
  defaultPaymentMethodId: creditAccount.defaultPaymentMethodId,
  autoReloadEnabled: creditAccount.autoReloadEnabled,
  autoReloadThresholdMicrocents: creditAccount.autoReloadThresholdMicrocents,
  autoReloadAmountMicrocents: creditAccount.autoReloadAmountMicrocents,
  lastAutoReloadAt: creditAccount.lastAutoReloadAt,
  createdAt: creditAccount.createdAt,
  updatedAt: creditAccount.updatedAt,
};

type CreditAccountRow = typeof creditAccount.$inferSelect;

const toCreditAccount = (row: CreditAccountRow): CreditAccount => ({
  userId: row.userId,
  balanceMicrocents: row.balanceMicrocents,
  currency: row.currency === 'usd' ? 'usd' : 'usd',
  autoReloadEnabled: row.autoReloadEnabled,
  autoReloadThresholdMicrocents: row.autoReloadThresholdMicrocents,
  autoReloadAmountMicrocents: row.autoReloadAmountMicrocents,
  defaultPaymentMethodId: row.defaultPaymentMethodId,
});

export const serializeCreditAccount = (row: CreditAccountRow) => ({
  userId: row.userId,
  balanceMicrocents: row.balanceMicrocents,
  currency: row.currency,
  stripeCustomerId: row.stripeCustomerId,
  defaultPaymentMethodId: row.defaultPaymentMethodId,
  autoReloadEnabled: row.autoReloadEnabled,
  autoReloadThresholdMicrocents: row.autoReloadThresholdMicrocents,
  autoReloadAmountMicrocents: row.autoReloadAmountMicrocents,
  lastAutoReloadAt: row.lastAutoReloadAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export async function ensureCreditAccount(userId: string): Promise<CreditAccountRow> {
  const existing = await db
    .select(accountColumns)
    .from(creditAccount)
    .where(eq(creditAccount.userId, userId))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  await db
    .insert(creditAccount)
    .values({ userId })
    .onConflictDoNothing();

  const created = await db
    .select(accountColumns)
    .from(creditAccount)
    .where(eq(creditAccount.userId, userId))
    .limit(1);

  if (!created[0]) {
    throw new Error(`Unable to create credit account for user ${userId}`);
  }

  return created[0];
}

export async function updateCreditAccountSettings(
  userId: string,
  updates: {
    autoReloadEnabled?: boolean;
    autoReloadThresholdMicrocents?: number | null;
    autoReloadAmountMicrocents?: number | null;
    defaultPaymentMethodId?: string | null;
    stripeCustomerId?: string | null;
  }
) {
  const now = new Date();
  await ensureCreditAccount(userId);
  const updated = await db
    .update(creditAccount)
    .set({
      ...updates,
      updatedAt: now,
    })
    .where(eq(creditAccount.userId, userId))
    .returning(accountColumns);

  if (!updated[0]) {
    throw new Error(`Unable to update credit account for user ${userId}`);
  }

  return updated[0];
}

export async function listCreditLedger(
  userId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  return db
    .select({
      id: creditLedger.id,
      amountMicrocents: creditLedger.amountMicrocents,
      currency: creditLedger.currency,
      entryType: creditLedger.entryType,
      status: creditLedger.status,
      reason: creditLedger.reason,
      externalSource: creditLedger.externalSource,
      externalId: creditLedger.externalId,
      metadata: creditLedger.metadata,
      balanceAfterMicrocents: creditLedger.balanceAfterMicrocents,
      createdAt: creditLedger.createdAt,
    })
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId))
    .orderBy(desc(creditLedger.createdAt))
    .limit(limit)
    .offset(offset);
}

export const drizzleCreditStore: CreditStore = {
  async getAccount(userId: string) {
    const row = await ensureCreditAccount(userId);
    return toCreditAccount(row);
  },
  async updateBalance(userId: string, balanceMicrocents: number) {
    const now = new Date();
    await db
      .update(creditAccount)
      .set({ balanceMicrocents, updatedAt: now })
      .where(eq(creditAccount.userId, userId));
  },
  async insertLedger(entry: CreditLedgerEntryInput) {
    await db.insert(creditLedger).values({
      id: randomUUID(),
      userId: entry.userId,
      amountMicrocents: entry.amountMicrocents,
      currency: entry.currency,
      entryType: entry.type,
      status: entry.status ?? 'posted',
      reason: entry.reason,
      externalSource: entry.externalSource ?? null,
      externalId: entry.externalId,
      metadata: entry.metadata,
      balanceAfterMicrocents: entry.balanceAfterMicrocents ?? null,
      createdAt: entry.createdAt ?? new Date(),
    });
  },
};

export async function applyCreditDelta(input: {
  userId: string;
  amountMicrocents: number;
  entryType: string;
  reason: string;
  metadata?: Record<string, unknown>;
  externalSource?: string | null;
  externalId?: string | null;
}) {
  const now = new Date();
  if (!Number.isFinite(input.amountMicrocents) || !Number.isSafeInteger(input.amountMicrocents)) {
    throw new Error('amountMicrocents must be a safe integer');
  }
  await ensureCreditAccount(input.userId);
  const hasExternalId = Boolean(input.externalSource && input.externalId);
  if (hasExternalId) {
    const existing = await db
      .select({ id: creditLedger.id })
      .from(creditLedger)
      .where(
        and(
          eq(creditLedger.externalSource, input.externalSource!),
          eq(creditLedger.externalId, input.externalId!)
        )
      )
      .limit(1);

    if (existing[0]) {
      const current = await db
        .select({ balanceMicrocents: creditAccount.balanceMicrocents })
        .from(creditAccount)
        .where(eq(creditAccount.userId, input.userId))
        .limit(1);
      return current[0]?.balanceMicrocents ?? 0;
    }
  }

  const updated = await db
    .update(creditAccount)
    .set({
      balanceMicrocents: sql`COALESCE(${creditAccount.balanceMicrocents}, 0) + ${input.amountMicrocents}`,
      updatedAt: now,
    })
    .where(eq(creditAccount.userId, input.userId))
    .returning({
      balanceMicrocents: creditAccount.balanceMicrocents,
      currency: creditAccount.currency,
    });

  if (!updated[0]) {
    throw new Error(`Unable to update balance for user ${input.userId}`);
  }

  await db.insert(creditLedger).values({
    id: randomUUID(),
    userId: input.userId,
    amountMicrocents: input.amountMicrocents,
    currency: updated[0].currency,
    entryType: input.entryType,
    status: 'posted',
    reason: input.reason,
    externalSource: input.externalSource ?? null,
    externalId: input.externalId ?? null,
    metadata: input.metadata,
    balanceAfterMicrocents: updated[0].balanceMicrocents,
    createdAt: now,
  });

  return updated[0].balanceMicrocents;
}
