"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  const balanceText = account ? formatter.format(account.balanceCents / 100) : "--";
  const summaryText = summary
    ? `${summary.windowDays}-day spend: ${formatter.format(summary.totalSpentCents / 100)}`
    : "Spend summary unavailable";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Credits balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-semibold">{balanceText}</div>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading balance..." : summaryText}
            </p>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button disabled>Buy credits (coming soon)</Button>
            <Button variant="outline" onClick={loadAll} disabled={isLoading}>
              Refresh
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auto-reload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Enable auto-reload</p>
                <p className="text-xs text-muted-foreground">
                  Charges require a saved card. Stripe setup is coming soon.
                </p>
              </div>
              <Switch checked={autoReloadEnabled} onCheckedChange={setAutoReloadEnabled} />
            </div>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>Reload when balance is below (USD)</Label>
                <Input
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  placeholder="5.00"
                  disabled={!autoReloadEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Reload amount (USD)</Label>
                <Input
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="25.00"
                  disabled={!autoReloadEnabled}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              Save settings
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              {account?.defaultPaymentMethodId ? "Card on file" : "No payment method on file"}
            </p>
            <p className="text-xs text-muted-foreground">
              Payment method setup is disabled until Stripe is connected.
            </p>
          </CardContent>
          <CardFooter>
            <Button disabled>Add payment method</Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Loading transactions...
                  </TableCell>
                </TableRow>
              ) : ledger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                ledger.map((entry) => {
                  const amount = entry.amountCents / 100;
                  const isPositive = entry.amountCents >= 0;
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="capitalize">{entry.entryType.replace("_", " ")}</TableCell>
                      <TableCell className="text-muted-foreground">{entry.reason}</TableCell>
                      <TableCell className={`text-right ${isPositive ? "text-emerald-600" : "text-destructive"}`}>
                        {isPositive ? "+" : "-"}
                        {formatter.format(Math.abs(amount))}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
