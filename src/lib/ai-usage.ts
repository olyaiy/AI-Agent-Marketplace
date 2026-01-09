type UsageSnapshot = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  inputTokenDetails: {
    noCacheTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
  };
  outputTokenDetails: {
    textTokens: number;
    reasoningTokens: number;
  };
};

export function normalizeUsage(raw: unknown): UsageSnapshot {
  const toInt = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) && num >= 0 ? Math.round(num) : 0;
  };
  const usage = (raw ?? {}) as Record<string, unknown>;
  const inputTokenDetails = (usage.inputTokenDetails ?? {}) as Record<string, unknown>;
  const outputTokenDetails = (usage.outputTokenDetails ?? {}) as Record<string, unknown>;
  const inputTokens = toInt(usage.inputTokens);
  const outputTokens = toInt(usage.outputTokens);
  const totalTokens = toInt(usage.totalTokens || inputTokens + outputTokens);
  const cacheReadTokens = toInt(inputTokenDetails.cacheReadTokens ?? usage.cachedInputTokens);
  const cacheWriteTokens = toInt(inputTokenDetails.cacheWriteTokens);
  const noCacheTokens = toInt(inputTokenDetails.noCacheTokens);
  const reasoningTokens = toInt(outputTokenDetails.reasoningTokens ?? usage.reasoningTokens);
  const textTokens = toInt(outputTokenDetails.textTokens);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    cachedInputTokens: cacheReadTokens,
    reasoningTokens,
    inputTokenDetails: {
      noCacheTokens,
      cacheReadTokens,
      cacheWriteTokens,
    },
    outputTokenDetails: {
      textTokens,
      reasoningTokens,
    },
  };
}

export const hasUsageValues = (usage: UsageSnapshot) =>
  Object.values(usage).some((value) => value > 0);
