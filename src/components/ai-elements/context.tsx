import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type Usage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
};

type ContextState = {
  usage: Usage;
  usedTokens: number;
  maxTokens?: number;
  modelId?: string;
};

const ContextUsageContext = React.createContext<ContextState | null>(null);

const normalizeUsage = (usage?: Partial<Usage> | null): Usage => {
  const toInt = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) && num >= 0 ? Math.round(num) : 0;
  };
  const normalized = {
    inputTokens: toInt(usage?.inputTokens),
    outputTokens: toInt(usage?.outputTokens),
    cachedInputTokens: toInt(usage?.cachedInputTokens),
    reasoningTokens: toInt(usage?.reasoningTokens),
  };
  const explicitTotal = toInt(usage?.totalTokens);
  const sum = normalized.inputTokens + normalized.outputTokens + normalized.reasoningTokens;
  const totalTokens = explicitTotal > 0 ? explicitTotal : sum;
  return { ...normalized, totalTokens };
};

const formatTokens = (value: number) => value.toLocaleString();

const useContextUsage = () => {
  const ctx = React.useContext(ContextUsageContext);
  if (!ctx) {
    throw new Error('Context components must be used within <Context>');
  }
  return ctx;
};

export function Context({
  children,
  usage,
  maxTokens,
  modelId,
  usedTokens,
}: {
  children: React.ReactNode;
  usage: Partial<Usage> | null | undefined;
  maxTokens?: number;
  modelId?: string;
  usedTokens?: number;
}) {
  const normalizedUsage = normalizeUsage(usage ?? undefined);
  const computedUsed = usedTokens ?? normalizedUsage.totalTokens;
  const state: ContextState = {
    usage: normalizedUsage,
    usedTokens: computedUsed,
    maxTokens,
    modelId,
  };

  return (
    <Popover>
      <ContextUsageContext.Provider value={state}>{children}</ContextUsageContext.Provider>
    </Popover>
  );
}

export function ContextTrigger({ className }: { className?: string }) {
  const { usedTokens, maxTokens } = useContextUsage();
  const percent = maxTokens ? Math.min(100, Math.round((usedTokens / maxTokens) * 100)) : null;

  return (
    <PopoverTrigger asChild>
      <button
        type="button"
        className={cn(
          'group inline-flex items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/50',
          className
        )}
      >
        <div className="flex flex-col text-left leading-tight">
          <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Context</span>
          <span className="text-sm font-semibold">
            {formatTokens(usedTokens)}
            {maxTokens ? ` / ${formatTokens(maxTokens)}` : ''}
          </span>
        </div>
        {percent !== null && (
          <div className="flex w-24 flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Used</span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
      </button>
    </PopoverTrigger>
  );
}

export function ContextContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <PopoverContent align="end" className={cn('w-80 space-y-4', className)}>
      {children}
    </PopoverContent>
  );
}

export function ContextContentHeader() {
  const { usage, maxTokens, usedTokens, modelId } = useContextUsage();
  const percent = maxTokens ? Math.min(100, Math.round((usedTokens / maxTokens) * 100)) : null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Model</p>
          <p className="text-sm font-semibold">{modelId || 'Unknown model'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Total</p>
          <p className="text-sm font-semibold">
            {formatTokens(usedTokens)}
            {maxTokens ? ` / ${formatTokens(maxTokens)}` : ''}
          </p>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${percent ?? 0}%` }}
        />
      </div>
      {percent !== null && (
        <p className="text-xs text-muted-foreground">
          {percent}% of available context used. Reserve some headroom to avoid truncation on the next turn.
        </p>
      )}
      {usage.cachedInputTokens > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Includes {formatTokens(usage.cachedInputTokens)} cached tokens (may be cheaper but still count toward the window).
        </p>
      )}
    </div>
  );
}

export function ContextContentBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('divide-y rounded-lg border', className)}>{children}</div>;
}

function UsageRow({
  label,
  value,
  accentClass,
  helper,
}: {
  label: string;
  value: number;
  accentClass?: string;
  helper?: string;
}) {
  const { maxTokens } = useContextUsage();
  const percent = maxTokens && maxTokens > 0 ? Math.min(100, Math.round((value / maxTokens) * 100)) : null;
  return (
    <div className="flex items-start gap-3 px-3 py-3">
      <div className={cn('mt-1 h-2 w-2 rounded-full bg-primary', accentClass)} />
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>{label}</span>
          <span className="tabular-nums text-muted-foreground">
            {formatTokens(value)}
            {percent !== null ? ` (${percent}%)` : ''}
          </span>
        </div>
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      </div>
    </div>
  );
}

export function ContextInputUsage() {
  const { usage } = useContextUsage();
  return (
    <UsageRow
      label="Prompt"
      value={usage.inputTokens}
      helper="Tokens currently in the prompt/history."
      accentClass="bg-blue-500"
    />
  );
}

export function ContextOutputUsage() {
  const { usage } = useContextUsage();
  return (
    <UsageRow
      label="Response"
      value={usage.outputTokens}
      helper="Tokens generated by the assistant."
      accentClass="bg-emerald-500"
    />
  );
}

export function ContextReasoningUsage() {
  const { usage } = useContextUsage();
  if (!usage.reasoningTokens) return null;
  return (
    <UsageRow
      label="Reasoning"
      value={usage.reasoningTokens}
      helper="Tokens used for reasoning traces."
      accentClass="bg-purple-500"
    />
  );
}

export function ContextCacheUsage() {
  const { usage } = useContextUsage();
  if (!usage.cachedInputTokens) return null;
  return (
    <UsageRow
      label="Cached"
      value={usage.cachedInputTokens}
      helper="Cached prompt tokens (billing may be discounted)."
      accentClass="bg-amber-500"
    />
  );
}

export function ContextContentFooter() {
  const { usage } = useContextUsage();
  return (
    <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
      Last turn total: {formatTokens(usage.totalTokens)} tokens. Keep prompts concise to stay within the context window.
    </div>
  );
}
