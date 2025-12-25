export type Currency = 'usd';
export type LedgerEntryType = 'credit' | 'debit' | 'adjustment' | 'refund';
export type LedgerEntryStatus = 'posted' | 'pending' | 'failed';

export interface CreditAccount {
  userId: string;
  balanceMicrocents: number;
  currency: Currency;
  autoReloadEnabled: boolean;
  autoReloadThresholdMicrocents: number | null;
  autoReloadAmountMicrocents: number | null;
  defaultPaymentMethodId: string | null;
}

export interface CreditLedgerEntryInput {
  userId: string;
  amountMicrocents: number;
  currency: Currency;
  type: LedgerEntryType;
  status?: LedgerEntryStatus;
  reason: string;
  externalSource?: string | null;
  metadata?: Record<string, unknown>;
  externalId?: string;
  balanceAfterMicrocents?: number | null;
  createdAt?: Date;
}

export interface CreditStore {
  getAccount(userId: string): Promise<CreditAccount | null>;
  updateBalance(userId: string, balanceMicrocents: number): Promise<void>;
  insertLedger(entry: CreditLedgerEntryInput): Promise<void>;
  withTransaction?<T>(fn: (tx: CreditStore) => Promise<T>): Promise<T>;
}

export interface CreditServiceOptions {
  currency?: Currency;
  allowNegative?: boolean;
  minBalanceMicrocents?: number;
  now?: () => Date;
}

export interface CreditChangeResult {
  balanceBeforeMicrocents: number;
  balanceAfterMicrocents: number;
  ledger: CreditLedgerEntryInput;
}

export interface AutoReloadDecision {
  shouldReload: boolean;
  amountMicrocents?: number;
  reason: 'disabled' | 'missing-config' | 'above-threshold' | 'below-threshold';
}

export class InsufficientCreditsError extends Error {
  balanceMicrocents: number;
  requiredMicrocents: number;
  minBalanceMicrocents: number;

  constructor(message: string, options: { balanceMicrocents: number; requiredMicrocents: number; minBalanceMicrocents: number }) {
    super(message);
    this.name = 'InsufficientCreditsError';
    this.balanceMicrocents = options.balanceMicrocents;
    this.requiredMicrocents = options.requiredMicrocents;
    this.minBalanceMicrocents = options.minBalanceMicrocents;
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

const ensureIntegerMicrocents = (value: number, label: string): number => {
  if (!Number.isFinite(value) || !Number.isSafeInteger(value)) {
    throw new Error(`${label} must be a safe integer`);
  }
  return value;
};

const ensurePositiveMicrocents = (value: number, label: string): number => {
  const microcents = ensureIntegerMicrocents(value, label);
  if (microcents <= 0) {
    throw new Error(`${label} must be greater than zero`);
  }
  return microcents;
};

const resolveNow = (options?: CreditServiceOptions): Date => {
  return options?.now ? options.now() : new Date();
};

const resolveMinBalance = (options?: CreditServiceOptions): number => {
  if (options?.allowNegative) {
    return Number.NEGATIVE_INFINITY;
  }
  return options?.minBalanceMicrocents ?? 0;
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
    account.autoReloadThresholdMicrocents === null ||
    account.autoReloadAmountMicrocents === null ||
    account.autoReloadAmountMicrocents <= 0
  ) {
    return { shouldReload: false, reason: 'missing-config' };
  }
  if (account.balanceMicrocents > account.autoReloadThresholdMicrocents) {
    return { shouldReload: false, reason: 'above-threshold' };
  }
  return {
    shouldReload: true,
    amountMicrocents: account.autoReloadAmountMicrocents,
    reason: 'below-threshold',
  };
};

export const createCreditService = (store: CreditStore, options?: CreditServiceOptions) => {
  const currency = options?.currency ?? 'usd';
  const minBalance = resolveMinBalance(options);

  const credit = async (input: {
    userId: string;
    amountMicrocents: number;
    reason: string;
    metadata?: Record<string, unknown>;
    externalId?: string;
  }): Promise<CreditChangeResult> => {
    const delta = ensurePositiveMicrocents(input.amountMicrocents, 'amountMicrocents');
    const now = resolveNow(options);

    return runInTransaction(store, async (tx) => {
      const account = await requireAccount(tx, input.userId);
      const balanceBefore = ensureIntegerMicrocents(account.balanceMicrocents, 'balanceMicrocents');
      const balanceAfter = balanceBefore + delta;
      const ledger: CreditLedgerEntryInput = {
        userId: input.userId,
        amountMicrocents: delta,
        currency,
        type: 'credit',
        status: 'posted',
        reason: input.reason,
        metadata: input.metadata,
        externalId: input.externalId,
        balanceAfterMicrocents: balanceAfter,
        createdAt: now,
      };

      await tx.updateBalance(input.userId, balanceAfter);
      await tx.insertLedger(ledger);

      return { balanceBeforeMicrocents: balanceBefore, balanceAfterMicrocents: balanceAfter, ledger };
    });
  };

  const debit = async (input: {
    userId: string;
    amountMicrocents: number;
    reason: string;
    metadata?: Record<string, unknown>;
    externalId?: string;
  }): Promise<CreditChangeResult> => {
    const delta = ensurePositiveMicrocents(input.amountMicrocents, 'amountMicrocents');
    const now = resolveNow(options);

    return runInTransaction(store, async (tx) => {
      const account = await requireAccount(tx, input.userId);
      const balanceBefore = ensureIntegerMicrocents(account.balanceMicrocents, 'balanceMicrocents');
      const balanceAfter = balanceBefore - delta;

      if (balanceAfter < minBalance) {
        throw new InsufficientCreditsError('Insufficient credits', {
          balanceMicrocents: balanceBefore,
          requiredMicrocents: delta,
          minBalanceMicrocents: minBalance,
        });
      }

      const ledger: CreditLedgerEntryInput = {
        userId: input.userId,
        amountMicrocents: -delta,
        currency,
        type: 'debit',
        status: 'posted',
        reason: input.reason,
        metadata: input.metadata,
        externalId: input.externalId,
        balanceAfterMicrocents: balanceAfter,
        createdAt: now,
      };

      await tx.updateBalance(input.userId, balanceAfter);
      await tx.insertLedger(ledger);

      return { balanceBeforeMicrocents: balanceBefore, balanceAfterMicrocents: balanceAfter, ledger };
    });
  };

  const getBalance = async (userId: string): Promise<number> => {
    const account = await requireAccount(store, userId);
    return ensureIntegerMicrocents(account.balanceMicrocents, 'balanceMicrocents');
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
