export type Currency = 'usd';
export type PricingSource = 'gateway-cost';
export type RoundingMode = 'ceil' | 'floor' | 'round';

export interface GatewayCostPricingInput {
  costUsd: string | number;
  markupBps?: number;
  centsRounding?: RoundingMode;
  markupRounding?: RoundingMode;
  minChargeCents?: number;
}

export interface CostBreakdown {
  currency: Currency;
  source: PricingSource;
  markupBps: number;
  baseMicrocents: bigint;
  markupMicrocents: bigint;
  totalMicrocents: bigint;
  baseCents: number;
  markupCents: number;
  totalCents: number;
  centsRounding: RoundingMode;
  markupRounding: RoundingMode;
}

const MICRO_CENTS_PER_CENT = 1_000_000n;
const MICRO_CENTS_PER_DOLLAR = 100_000_000n;
const BPS_DIVISOR = 10_000n;
export const DEFAULT_MARKUP_BPS = 1500;

const toSafeNumber = (value: bigint): number => {
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  if (value > max) {
    throw new Error('Value exceeds safe integer range');
  }
  return Number(value);
};

const roundDivide = (numerator: bigint, divisor: bigint, mode: RoundingMode): bigint => {
  if (divisor === 0n) throw new Error('Division by zero');
  if (mode === 'floor') return numerator / divisor;
  if (mode === 'ceil') return (numerator + divisor - 1n) / divisor;
  return (numerator + divisor / 2n) / divisor;
};

const normalizeUsdInput = (input: string | number): string => {
  const raw = typeof input === 'number' ? input.toString() : String(input);
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('USD amount is required');
  }
  const cleaned = trimmed.replace(/[$,]/g, '');
  if (/e/i.test(cleaned)) {
    const value = Number(cleaned);
    if (!Number.isFinite(value)) {
      throw new Error('USD amount is invalid');
    }
    return value.toFixed(9);
  }
  return cleaned;
};

export const parseUsdToMicrocents = (value: string | number): bigint => {
  const normalized = normalizeUsdInput(value);
  const match = normalized.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
  if (!match) {
    throw new Error(`USD amount is invalid: "${normalized}"`);
  }
  if (match[1] === '-') {
    throw new Error('USD amount must be non-negative');
  }
  const wholePart = match[2];
  const fraction = match[3] ?? '';
  const padded = fraction.padEnd(8, '0');
  const mainFraction = padded.slice(0, 8);
  const remainder = fraction.slice(8);

  let microcents = BigInt(wholePart) * MICRO_CENTS_PER_DOLLAR + BigInt(mainFraction || '0');
  if (remainder.length > 0) {
    const nextDigit = Number(remainder[0] ?? '0');
    if (nextDigit >= 5) {
      microcents += 1n;
    }
  }

  return microcents;
};

export const safeParseUsdToMicrocents = (
  value: string | number | null | undefined
): bigint | null => {
  if (value === null || value === undefined) return null;
  try {
    return parseUsdToMicrocents(value);
  } catch {
    return null;
  }
};

export const microcentsToCents = (
  microcents: bigint,
  rounding: RoundingMode = 'ceil'
): number => {
  if (microcents < 0n) {
    throw new Error('Microcents must be non-negative');
  }
  const cents = roundDivide(microcents, MICRO_CENTS_PER_CENT, rounding);
  return toSafeNumber(cents);
};

const normalizeBps = (value: number | undefined): number => {
  if (value === undefined) return DEFAULT_MARKUP_BPS;
  if (!Number.isFinite(value)) {
    throw new Error('Markup bps must be a finite number');
  }
  const rounded = Math.round(value);
  if (rounded < 0) {
    throw new Error('Markup bps must be non-negative');
  }
  return rounded;
};

export const priceGatewayCost = (input: GatewayCostPricingInput): CostBreakdown => {
  const markupBps = normalizeBps(input.markupBps);
  const centsRounding = input.centsRounding ?? 'ceil';
  const markupRounding = input.markupRounding ?? 'round';
  const minChargeCents = Math.max(0, Math.floor(input.minChargeCents ?? 0));

  const baseMicrocents = parseUsdToMicrocents(input.costUsd);
  const markupMicrocents = roundDivide(
    baseMicrocents * BigInt(markupBps),
    BPS_DIVISOR,
    markupRounding
  );
  const totalMicrocents = baseMicrocents + markupMicrocents;

  const baseCents = microcentsToCents(baseMicrocents, centsRounding);
  const markupCents = microcentsToCents(markupMicrocents, centsRounding);
  let totalCents = microcentsToCents(totalMicrocents, centsRounding);

  if (minChargeCents > 0 && totalCents > 0) {
    totalCents = Math.max(totalCents, minChargeCents);
  }

  return {
    currency: 'usd',
    source: 'gateway-cost',
    markupBps,
    baseMicrocents,
    markupMicrocents,
    totalMicrocents,
    baseCents,
    markupCents,
    totalCents,
    centsRounding,
    markupRounding,
  };
};

export const priceGatewayCostOrNull = (
  input: Omit<GatewayCostPricingInput, 'costUsd'> & {
    costUsd?: string | number | null;
  }
): CostBreakdown | null => {
  if (input.costUsd === null || input.costUsd === undefined) return null;
  return priceGatewayCost({ ...input, costUsd: input.costUsd });
};
