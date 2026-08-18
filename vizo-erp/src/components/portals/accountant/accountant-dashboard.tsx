"use client";

import * as React from "react";
import Link from "next/link";
import {
  Clock, Wallet, TrendingDown, AlertTriangle, ArrowRight, Check, X,
  Banknote, Landmark, Smartphone,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/dialogs";
import { toast } from "@/components/ui/toaster";
import { ReminderList } from "@/components/widgets/reminder-list";
import { useSession } from "@/components/providers/session-provider";
import {
  collections, awaitingConfirmation, totalOf, COLLECTION_METHOD_LABEL, type Collection,
} from "@/data/collections";
import { payablesDueSoon } from "@/data/purchases";
import { dashboardStats, cashPosition } from "@/data/mock";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const METHOD_ICON: Record<Collection["method"], typeof Banknote> = {
  CASH: Banknote,
  CHEQUE: Banknote,
  BANK: Landmark,
  JAZZCASH: Smartphone,
  EASYPAISA: Smartphone,
};

/**
 * The accountant's day is deciding whether money that other people say
 * arrived actually did. This screen leads with exactly that queue, not a
 * chart — the same house rule Sales and Order Dept open on.
 */
export function AccountantDashboard() {
  const { user } = useSession();

  const awaiting = awaitingConfirmation();
  const confirmedToday = collections.filter(
    (c) => c.status === "CONFIRMED" && c.confirmedOn === "2026-08-15"
  );
  const duePayables = payablesDueSoon();

  const [confirming, setConfirming] = React.useState<Collection | null>(null);
  const [bouncing, setBouncing] = React.useState<Collection | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
          Good morning, {user.fullName.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {awaiting.length > 0
            ? `${awaiting.length} ${awaiting.length === 1 ? "receipt is" : "receipts are"} waiting on your confirmation.`
            : "Every collection is confirmed. Nothing waiting on you."}
        </p>
      </div>

      {/* Counters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Counter
          label="Awaiting confirmation"
          value={awaiting.length}
          icon={Clock}
          tone="warning"
          hint={formatCompact(totalOf(awaiting))}
          href="/accounting/collections"
        />
        <Counter
          label="Confirmed today"
          value={confirmedToday.length}
          icon={Check}
          tone="success"
          hint={formatCompact(totalOf(confirmedToday))}
          href="/accounting/collections?tab=CONFIRMED"
        />
        <Counter
          label="Payables due"
          value={duePayables.length}
          icon={TrendingDown}
          tone="danger"
          hint="overdue or due within 3 days"
          href="/purchases/invoices"
        />
        <Counter
          label="Recovery 60+ days"
          value={formatCompact(dashboardStats.arOutstanding.overdue60Plus)}
          icon={AlertTriangle}
          tone="info"
          hint="outstanding, 60 days or older"
          href="/reports/aging/customer"
        />
      </div>

      {/* What the software is chasing you for */}
      <ReminderList limit={6} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Confirm queue, right on the dashboard */}
        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-navy-900 dark:text-white">
                  Confirm collections
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Oldest first — the ledger waits on your word
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/accounting/collections">View all <ArrowRight /></Link>
              </Button>
            </div>

            {awaiting.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                Nothing waiting. The desk is clear.
              </p>
            ) : (
              <div className="space-y-2">
                {awaiting.slice(0, 6).map((c) => {
                  const Icon = METHOD_ICON[c.method];
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-navy-700"
                    >
                      <Avatar initials={c.customerInitials} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-navy-900 dark:text-white truncate">
                          {c.customerName}
                        </div>
                        <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                          {c.receiptNo} · {c.collectedBy} · {formatDate(c.collectedOn)}
                        </div>
                      </div>
                      <Icon className="size-3.5 text-slate-400 flex-shrink-0 hidden sm:block" />
                      <div className="hidden sm:block text-2xs text-slate-500 dark:text-slate-400 w-24 flex-shrink-0">
                        {COLLECTION_METHOD_LABEL[c.method]}
                      </div>
                      <div className="tabular text-sm font-bold text-navy-900 dark:text-white w-24 text-right flex-shrink-0">
                        {formatMoney(c.amount)}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="accent" size="sm" className="gap-1" onClick={() => setConfirming(c)}>
                          <Check /> Confirm
                        </Button>
                        <Button
                          variant="ghost" size="icon-sm" className="text-danger"
                          aria-label="Mark bounced" onClick={() => setBouncing(c)}
                        >
                          <X />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Cash position */}
        <Card>
          <CardBody>
            <h2 className="text-base font-semibold text-navy-900 dark:text-white">Cash position</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
              What is actually liquid right now
            </p>

            <div className="tabular text-2xl font-bold text-navy-900 dark:text-white mb-4">
              {formatMoney(cashPosition.total)}
            </div>

            <div className="space-y-3">
              {cashPosition.breakdown.map((b) => (
                <div key={b.label} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-navy-900 dark:text-white">{b.label}</div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400">{b.sublabel}</div>
                  </div>
                  <div className="tabular text-sm font-bold text-navy-900 dark:text-white">
                    {formatCompact(b.value)}
                  </div>
                </div>
              ))}
            </div>

            <Button variant="secondary" size="md" className="w-full mt-4 justify-center gap-1.5" asChild>
              <Link href="/accounting/ledgers">
                <Wallet /> See ledgers <ArrowRight />
              </Link>
            </Button>
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={`Confirm ${formatMoney(confirming?.amount ?? 0)} from ${confirming?.customerName}?`}
        description="The customer's balance drops by this amount and it posts to the ledger. Only do this once the cash or cheque is actually in hand."
        variant="info"
        confirmLabel="Yes, confirm it"
        onConfirm={() => {
          toast.success("Collection confirmed", {
            description: `${confirming?.receiptNo} posted to the ledger.`,
          });
          setConfirming(null);
        }}
      />

      <ConfirmDialog
        open={bouncing !== null}
        onOpenChange={(o) => !o && setBouncing(null)}
        title={`Mark ${bouncing?.receiptNo} bounced?`}
        description={`${bouncing?.customerName}'s balance goes back up by ${formatMoney(bouncing?.amount ?? 0)}. The receipt stays on record as evidence of what was promised.`}
        variant="danger"
        confirmLabel="Yes, it bounced"
        requireReason
        reasonLabel="What happened?"
        reasonPlaceholder="e.g. insufficient funds, wrong account…"
        onConfirm={(r) => {
          toast.success("Marked bounced", { description: `${bouncing?.receiptNo} — ${r}` });
          setBouncing(null);
        }}
      />
    </div>
  );
}

const TONE_BG: Record<string, string> = {
  yellow: "bg-brand-yellow/10 text-brand-yellow",
  info: "bg-info/10 text-info",
  danger: "bg-danger/10 text-danger",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

function Counter({
  label, value, icon: Icon, tone, hint, href,
}: {
  label: string; value: number | string; icon: typeof Clock;
  tone: string; hint: string; href: string;
}) {
  return (
    <Link href={href}>
      <Card className="p-5 hover:border-brand-yellow/40 transition-colors h-full">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
              {label}
            </div>
            <div className="tabular text-3xl font-bold text-navy-900 dark:text-white mt-1.5">
              {value}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</div>
          </div>
          <div className={cn("size-10 rounded-lg flex items-center justify-center", TONE_BG[tone])}>
            <Icon className="size-5" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
