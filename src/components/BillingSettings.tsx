"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "motion/react";
import {
  Wallet,
  RefreshCw,
  Zap,
  CreditCard,
  Clock,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

type CreditAccount = {
  userId: string;
  balanceCents: number;
  currency: string;
  stripeCustomerId?: string | null;
  defaultPaymentMethodId?: string | null;
  autoReloadEnabled: boolean;
  autoReloadThresholdCents: number | null;
  autoReloadAmountCents: number | null;
  lastAutoReloadAt?: string | null;
};

type LedgerEntry = {
  id: string;
  amountCents: number;
  currency: string;
  entryType: string;
  status: string;
  reason: string;
  balanceAfterCents?: number | null;
  createdAt: string;
};

type Summary = {
  windowDays: number;
  totalSpentCents: number;
  totalCreditsCents: number;
};

const formatCentsInput = (value: number | null | undefined) => {
  if (value == null) return "";
  return (value / 100).toFixed(2);
};

const parseCentsInput = (value: string) => {
  const normalized = value.trim().replace(/[$,]/g, "");
  if (!normalized) return null;
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction.padEnd(2, "0"), 10);
  if (!Number.isSafeInteger(cents)) return null;
  return cents;
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BillingSettings() {
  const [account, setAccount] = useState<CreditAccount | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(false);
  const [thresholdInput, setThresholdInput] = useState("");
  const [amountInput, setAmountInput] = useState("");

  const formatter = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
    []
  );

  const loadAccount = useCallback(async () => {
    const res = await fetch("/api/billing/account", { cache: "no-cache" });
    if (!res.ok) {
      throw new Error("Failed to load account");
    }
    const data = await res.json();
    const next = data?.account as CreditAccount | undefined;
    if (!next) {
      throw new Error("Missing account data");
    }
    setAccount(next);
    setAutoReloadEnabled(next.autoReloadEnabled);
    setThresholdInput(formatCentsInput(next.autoReloadThresholdCents));
    setAmountInput(formatCentsInput(next.autoReloadAmountCents));
  }, []);

  const loadLedger = useCallback(async () => {
    const res = await fetch("/api/billing/ledger?limit=20", { cache: "no-cache" });
    if (!res.ok) {
      throw new Error("Failed to load ledger");
    }
    const data = await res.json();
    const entries = Array.isArray(data?.entries) ? (data.entries as LedgerEntry[]) : [];
    setLedger(entries);
  }, []);

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/billing/summary?windowDays=30", { cache: "no-cache" });
    if (!res.ok) {
      throw new Error("Failed to load summary");
    }
    const data = await res.json();
    setSummary({
      windowDays: data?.windowDays ?? 30,
      totalSpentCents: data?.totalSpentCents ?? 0,
      totalCreditsCents: data?.totalCreditsCents ?? 0,
    });
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadAccount();
      await loadLedger();
      await loadSummary();
    } catch (error) {
      console.error(error);
      toast.error("Failed to load billing data");
    } finally {
      setIsLoading(false);
    }
  }, [loadAccount, loadLedger, loadSummary]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleSave = async () => {
    if (!account) return;
    const thresholdCents = parseCentsInput(thresholdInput);
    const amountCents = parseCentsInput(amountInput);

    if (autoReloadEnabled) {
      if (thresholdCents == null || amountCents == null || amountCents <= 0) {
        toast.error("Enter a valid threshold and reload amount.");
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/billing/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          autoReloadEnabled,
          autoReloadThresholdCents: autoReloadEnabled ? thresholdCents : null,
          autoReloadAmountCents: autoReloadEnabled ? amountCents : null,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || "Failed to update auto-reload settings");
      }

      const data = await res.json();
      const next = data?.account as CreditAccount | undefined;
      if (next) {
        setAccount(next);
        setAutoReloadEnabled(next.autoReloadEnabled);
        setThresholdInput(formatCentsInput(next.autoReloadThresholdCents));
        setAmountInput(formatCentsInput(next.autoReloadAmountCents));
      }
      toast.success("Auto-reload settings updated");
    } catch (error) {
      console.error(error);
      toast.error("Unable to save auto-reload settings");
    } finally {
      setIsSaving(false);
    }
  };

  const balanceValue = account ? account.balanceCents / 100 : 0;
  const isLowBalance = balanceValue < 5;

  if (isLoading) {
    return (
      <div className="space-y-10">
        {/* Balance Section Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-baseline gap-4">
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>

        {/* Settings Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>

        {/* Transactions Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Balance Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Credits Balance
          </h2>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-baseline gap-3"
          >
            <span className={cn(
              "text-5xl font-bold tracking-tight",
              isLowBalance ? "text-destructive" : "text-foreground"
            )}>
              {formatter.format(balanceValue)}
            </span>
            {isLowBalance && (
              <Badge variant="destructive" className="gap-1.5">
                <AlertCircle className="w-3 h-3" />
                Low balance
              </Badge>
            )}
          </motion.div>

          {summary && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>{summary.windowDays}-day spend: {formatter.format(summary.totalSpentCents / 100)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button disabled className="gap-2">
            <CreditCard className="w-4 h-4" />
            Buy credits
            <Badge variant="outline" className="ml-1 text-[10px]">Coming soon</Badge>
          </Button>
          <Button
            variant="outline"
            onClick={loadAll}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* Auto-Reload Settings */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Auto-Reload
            </h2>
          </div>
          {account?.autoReloadEnabled && (
            <Badge variant="secondary" className="gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              Active
            </Badge>
          )}
        </div>

        <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-secondary/30 to-secondary/10 overflow-hidden">
          {/* Toggle Header */}
          <div
            className="flex items-center justify-between gap-4 p-5 cursor-pointer hover:bg-secondary/20 transition-colors"
            onClick={() => setAutoReloadEnabled(!autoReloadEnabled)}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                autoReloadEnabled ? "bg-primary text-primary-foreground" : "bg-secondary"
              )}>
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">Automatic top-up</p>
                <p className="text-sm text-muted-foreground">
                  Never run out of credits mid-conversation
                </p>
              </div>
            </div>
            <Switch
              checked={autoReloadEnabled}
              onCheckedChange={setAutoReloadEnabled}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Expanded Settings */}
          <AnimatePresence>
            {autoReloadEnabled && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="border-t border-border/40 p-5 space-y-6 bg-background/50">
                  {/* Threshold Setting */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-foreground">
                        Reload when balance drops below
                      </Label>
                      <span className="text-xs text-muted-foreground">Threshold</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[2, 5, 10, 20].map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setThresholdInput(amount.toFixed(2))}
                          className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            thresholdInput === amount.toFixed(2)
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-secondary/50 text-foreground hover:bg-secondary"
                          )}
                        >
                          ${amount}
                        </button>
                      ))}
                      <div className="relative flex-1 min-w-[100px]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          value={thresholdInput}
                          onChange={(e) => setThresholdInput(e.target.value)}
                          placeholder="Custom"
                          className="pl-7 h-9 bg-background border-border/50 focus:border-primary/50 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Amount Setting */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-foreground">
                        Amount to add
                      </Label>
                      <span className="text-xs text-muted-foreground">Reload amount</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[10, 25, 50, 100].map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setAmountInput(amount.toFixed(2))}
                          className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            amountInput === amount.toFixed(2)
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-secondary/50 text-foreground hover:bg-secondary"
                          )}
                        >
                          ${amount}
                        </button>
                      ))}
                      <div className="relative flex-1 min-w-[100px]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          value={amountInput}
                          onChange={(e) => setAmountInput(e.target.value)}
                          placeholder="Custom"
                          className="pl-7 h-9 bg-background border-border/50 focus:border-primary/50 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  {thresholdInput && amountInput && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-sm text-foreground">
                        When your balance falls below <span className="font-semibold">${thresholdInput}</span>,
                        we&apos;ll automatically add <span className="font-semibold">${amountInput}</span> to your account.
                      </p>
                    </motion.div>
                  )}

                  {/* Save Button */}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      Requires a payment method on file
                    </p>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || isLoading}
                      className="gap-2"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Save settings
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* Payment Method */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Payment Method
          </h2>
        </div>

        <div className="flex items-center justify-between py-4 px-4 rounded-xl bg-secondary/20">
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {account?.defaultPaymentMethodId ? "Card ending in ****" : "No payment method on file"}
            </p>
            <p className="text-sm text-muted-foreground">
              Payment method setup coming soon with Stripe integration.
            </p>
          </div>
          <Button variant="outline" disabled className="gap-2">
            Add card
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* Transaction History */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recent Transactions
          </h2>
        </div>

        <div className="divide-y divide-border/40">
          {ledger.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-12 text-center"
            >
              <div className="bg-secondary/30 rounded-full w-12 h-12 mx-auto flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Your billing history will appear here
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {ledger.map((entry, index) => {
                const amount = entry.amountCents / 100;
                const isPositive = entry.amountCents >= 0;
                const date = new Date(entry.createdAt);

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center justify-between py-4 px-4 hover:bg-muted/30 rounded-lg transition-colors -mx-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        isPositive ? "bg-emerald-500/10" : "bg-destructive/10"
                      )}>
                        {isPositive ? (
                          <TrendingUp className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Zap className="w-5 h-5 text-destructive" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-medium text-foreground capitalize">
                          {entry.entryType.replace("_", " ")}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {entry.reason}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-semibold tabular-nums",
                        isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                      )}>
                        {isPositive ? "+" : "-"}{formatter.format(Math.abs(amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(date)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </section>
    </div>
  );
}
