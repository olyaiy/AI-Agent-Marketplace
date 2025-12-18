export type Currency = 'usd';
export type LedgerEntryType = 'credit' | 'debit' | 'adjustment' | 'refund';
export type LedgerEntryStatus = 'posted' | 'pending' | 'failed';

export interface CreditAccount {
  userId: string;
  balanceCents: number;
  currency: Currency;
  autoReloadEnabled: boolean;
  autoReloadThresholdCents: number | null;
  autoReloadAmountCents: number | null;
  defaultPaymentMethodId: string | null;
}

export interface CreditLedgerEntryInput {
  userId: string;
  amountCents: number;
  currency: Currency;
  type: LedgerEntryType;
  status?: LedgerEntryStatus;
  reason: string;
  externalSource?: string | null;
  metadata?: Record<string, unknown>;
  externalId?: string;
  balanceAfterCents?: number | null;
  createdAt?: Date;
}

export interface CreditStore {
  getAccount(userId: string): Promise<CreditAccount | null>;
  updateBalance(userId: string, balanceCents: number): Promise<void>;
  insertLedger(entry: CreditLedgerEntryInput): Promise<void>;
  withTransaction?<T>(fn: (tx: CreditStore) => Promise<T>): Promise<T>;
}

export interface CreditServiceOptions {
  currency?: Currency;
  allowNegative?: boolean;
  minBalanceCents?: number;
  now?: () => Date;
}

export interface CreditChangeResult {
  balanceBeforeCents: number;
  balanceAfterCents: number;
  ledger: CreditLedgerEntryInput;
}

export interface AutoReloadDecision {
  shouldReload: boolean;
  amountCents?: number;
  reason: 'disabled' | 'missing-config' | 'above-threshold' | 'below-threshold';
}

export class InsufficientCreditsError extends Error {
  balanceCents: number;
  requiredCents: number;
  minBalanceCents: number;

  constructor(message: string, options: { balanceCents: number; requiredCents: number; minBalanceCents: number }) {
    super(message);
    this.name = 'InsufficientCreditsError';
    this.balanceCents = options.balanceCents;
    this.requiredCents = options.requiredCents;
    this.minBalanceCents = options.minBalanceCents;
  }
}

export class MissingCreditAccountError extends Error {
  userId: string;

  constructor(userId: string) {
    super(`Missing credit account for user ${userId}`);
    this.name = 'MissingCreditAccountError';
    this.userId = userId;
  }
}

const ensureIntegerCents = (value: number, label: string): number => {
  if (!Number.isFinite(value) || !Number.isSafeInteger(value)) {
    throw new Error(`${label} must be a safe integer`);
  }
  return value;
};

const ensurePositiveCents = (value: number, label: string): number => {
  const cents = ensureIntegerCents(value, label);
  if (cents <= 0) {
    throw new Error(`${label} must be greater than zero`);
  }
  return cents;
};

const resolveNow = (options?: CreditServiceOptions): Date => {
  return options?.now ? options.now() : new Date();
};

const resolveMinBalance = (options?: CreditServiceOptions): number => {
  if (options?.allowNegative) {
    return Number.NEGATIVE_INFINITY;
  }
  return options?.minBalanceCents ?? 0;
};

const runInTransaction = async <T>(store: CreditStore, fn: (tx: CreditStore) => Promise<T>): Promise<T> => {
  if (store.withTransaction) {
    return store.withTransaction(fn);
  }
  return fn(store);
};

const requireAccount = async (store: CreditStore, userId: string): Promise<CreditAccount> => {
  const account = await store.getAccount(userId);
  if (!account) {
    throw new MissingCreditAccountError(userId);
  }
  return account;
};

export const getAutoReloadDecision = (account: CreditAccount): AutoReloadDecision => {
  if (!account.autoReloadEnabled) {
    return { shouldReload: false, reason: 'disabled' };
  }
  if (
    account.autoReloadThresholdCents === null ||
    account.autoReloadAmountCents === null ||
    account.autoReloadAmountCents <= 0
  ) {
    return { shouldReload: false, reason: 'missing-config' };
  }
  if (account.balanceCents > account.autoReloadThresholdCents) {
    return { shouldReload: false, reason: 'above-threshold' };
  }
  return {
    shouldReload: true,
    amountCents: account.autoReloadAmountCents,
    reason: 'below-threshold',
  };
};

export const createCreditService = (store: CreditStore, options?: CreditServiceOptions) => {
  const currency = options?.currency ?? 'usd';
  const minBalance = resolveMinBalance(options);

  const credit = async (input: {
    userId: string;
    amountCents: number;
    reason: string;
    metadata?: Record<string, unknown>;
    externalId?: string;
  }): Promise<CreditChangeResult> => {
    const delta = ensurePositiveCents(input.amountCents, 'amountCents');
    const now = resolveNow(options);

    return runInTransaction(store, async (tx) => {
      const account = await requireAccount(tx, input.userId);
      const balanceBefore = ensureIntegerCents(account.balanceCents, 'balanceCents');
      const balanceAfter = balanceBefore + delta;
      const ledger: CreditLedgerEntryInput = {
        userId: input.userId,
        amountCents: delta,
        currency,
        type: 'credit',
        status: 'posted',
        reason: input.reason,
        metadata: input.metadata,
        externalId: input.externalId,
        balanceAfterCents: balanceAfter,
        createdAt: now,
      };

      await tx.updateBalance(input.userId, balanceAfter);
      await tx.insertLedger(ledger);

      return { balanceBeforeCents: balanceBefore, balanceAfterCents: balanceAfter, ledger };
    });
  };

  const debit = async (input: {
    userId: string;
    amountCents: number;
    reason: string;
    metadata?: Record<string, unknown>;
    externalId?: string;
  }): Promise<CreditChangeResult> => {
    const delta = ensurePositiveCents(input.amountCents, 'amountCents');
    const now = resolveNow(options);

    return runInTransaction(store, async (tx) => {
      const account = await requireAccount(tx, input.userId);
      const balanceBefore = ensureIntegerCents(account.balanceCents, 'balanceCents');
      const balanceAfter = balanceBefore - delta;

      if (balanceAfter < minBalance) {
        throw new InsufficientCreditsError('Insufficient credits', {
          balanceCents: balanceBefore,
          requiredCents: delta,
          minBalanceCents: minBalance,
        });
      }

      const ledger: CreditLedgerEntryInput = {
        userId: input.userId,
        amountCents: -delta,
        currency,
        type: 'debit',
        status: 'posted',
        reason: input.reason,
        metadata: input.metadata,
        externalId: input.externalId,
        balanceAfterCents: balanceAfter,
        createdAt: now,
      };

      await tx.updateBalance(input.userId, balanceAfter);
      await tx.insertLedger(ledger);

      return { balanceBeforeCents: balanceBefore, balanceAfterCents: balanceAfter, ledger };
    });
  };

  const getBalance = async (userId: string): Promise<number> => {
    const account = await requireAccount(store, userId);
    return ensureIntegerCents(account.balanceCents, 'balanceCents');
  };

  const getAccount = async (userId: string): Promise<CreditAccount | null> => {
    return store.getAccount(userId);
  };

  const shouldAutoReload = (account: CreditAccount): AutoReloadDecision => {
    return getAutoReloadDecision(account);
  };

  return {
    getAccount,
    getBalance,
    credit,
    debit,
    shouldAutoReload,
  };
};
