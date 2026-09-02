"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  Clock, Check, TrendingDown, AlertTriangle, ArrowRight, Wallet,
  AlertCircle, Receipt, ArrowDownToLine, ArrowUpFromLine,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Counter, CounterSkeletons } from "@/components/portals/dashboard-counter";
import { API_BASE_URL, authHeader, useSession } from "@/components/providers/session-provider";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /reports/dashboard/accountant — one request, everything on the page.
   Nothing here comes from @/data any more. */
type QueueRow = {
  id: number;
  receiptNo: string;
  customerName: string;
  collectedBy: string;
  collectedOn: string;
  amount: number;
  method: string;
  reference: string | null;
};

type PayableRow = {
  id: number;
  invoiceNo: string;
  supplier: string;
  dueDate: string;
  total: number;
  balance: number;
};

type CashAccount = { id: number; name: string; code: string; balance: number };

type Data = {
  asOf: string;
  cash: { total: number; breakdown: CashAccount[] };
  collections: {
    awaitingCount: number;
    awaitingTotal: number;
    confirmedTodayCount: number;
    confirmedTodayTotal: number;
    queue: QueueRow[];
  };
  money: {
    receiptsToday: number;
    paymentsToday: number;
    receiptsMonth: number;
    paymentsMonth: number;
    receiptsPrevMonth: number;
    paymentsPrevMonth: number;
  };
  payables: {
    openCount: number;
    openTotal: number;
    dueSoonCount: number;
    dueSoonTotal: number;
    dueSoon: PayableRow[];
  };
  receivables: {
    total: number;
    current: number;
    days1To30: number;
    days31To60: number;
    days60Plus: number;
  };
  expenses: { draftCount: number; draftValue: number };
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export function AccountantDashboard() {
  const { user } = useSession();

  const [data, setData] = React.useState<Data | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<Data>(`${API_BASE_URL}/reports/dashboard/accountant`, {
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  /* `user` is filled by the session provider before this renders. Reading it
     after the hooks above keeps the hook count stable between renders. */
  const firstName = (user?.fullName ?? "").split(" ")[0];

  const awaiting = data?.collections.awaitingCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
            Good morning{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {loading
              ? "Checking what is waiting on you…"
              : error
                ? "The dashboard could not be loaded."
                : awaiting > 0
                  ? `${awaiting} ${awaiting === 1 ? "receipt is" : "receipts are"} waiting on your confirmation.`
                  : "Every collection is confirmed. Nothing waiting on you."}
          </p>
        </div>
        {data && (
          <div className="text-right shrink-0">
            <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
              Cash &amp; bank
            </div>
            <div className="tabular text-2xl font-bold text-navy-900 dark:text-white">
              {formatCompact(data.cash.total)}
            </div>
          </div>
        )}
      </div>

      {error && (
        <Card className="p-4 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !data ? (
          <CounterSkeletons count={4} />
        ) : (
          <>
            <Counter
              label="Awaiting confirmation"
              value={data.collections.awaitingCount}
              icon={Clock}
              tone="warning"
              hint={formatCompact(data.collections.awaitingTotal)}
              href="/accounting/collections"
            />
            <Counter
              label="Confirmed today"
              value={data.collections.confirmedTodayCount}
              icon={Check}
              tone="success"
              hint={formatCompact(data.collections.confirmedTodayTotal)}
              href="/accounting/collections"
            />
            <Counter
              label="Payables due"
              value={data.payables.dueSoonCount}
              icon={TrendingDown}
              tone="danger"
              hint={`${formatCompact(data.payables.dueSoonTotal)} · overdue or due in 3 days`}
              href="/purchases/invoices"
            />
            <Counter
              label="Recovery 60+ days"
              value={formatCompact(data.receivables.days60Plus)}
              icon={AlertTriangle}
              tone="info"
              hint="outstanding, 60 days or older"
              href="/reports/aging/customer"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* The confirm queue, right where the accountant lands */}
        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-navy-900 dark:text-white">
                  Confirm collections
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Money a rep has taken that has not been confirmed yet
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/accounting/collections">View all <ArrowRight /></Link>
              </Button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : !data || data.collections.queue.length === 0 ? (
              <EmptyState
                icon={Check}
                title="Nothing waiting"
                description="Every collection has been confirmed."
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-navy-700">
                {data.collections.queue.map((c) => (
                  <Link
                    key={c.id}
                    href="/accounting/collections"
                    className="flex items-center gap-3 py-3 hover:bg-slate-50 dark:hover:bg-navy-700/50 -mx-2 px-2 rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-navy-900 dark:text-white truncate">
                        {c.customerName}
                      </div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="tabular">{c.receiptNo}</span> · {c.collectedBy} · {formatDate(c.collectedOn)}
                      </div>
                    </div>
                    <Badge variant="muted">{c.method}</Badge>
                    <div className="tabular text-sm font-semibold text-navy-900 dark:text-white shrink-0">
                      {formatMoney(c.amount)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          {/* Cash position, straight from the ledger */}
          <Card>
            <CardBody>
              <h2 className="text-base font-semibold text-navy-900 dark:text-white">Cash position</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Posted movement, not a guess
              </p>

              {loading ? (
                <div className="mt-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
                </div>
              ) : !data ? null : (
                <>
                  <div className="tabular text-3xl font-bold text-navy-900 dark:text-white mt-3">
                    {formatMoney(data.cash.total)}
                  </div>
                  <div className="mt-4 space-y-2">
                    {data.cash.breakdown.map((b) => (
                      <Link
                        key={b.id}
                        href={`/accounting/ledger?accountId=${b.id}`}
                        className="flex items-center justify-between text-sm py-1 hover:text-navy-900 dark:hover:text-white"
                      >
                        <span className="text-slate-600 dark:text-slate-300 truncate">{b.name}</span>
                        <span className={cn("tabular font-medium shrink-0 ml-3",
                          b.balance < 0 ? "text-danger" : "text-navy-900 dark:text-white")}>
                          {formatMoney(b.balance)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {/* Money in and out */}
          <Card>
            <CardBody>
              <h2 className="text-base font-semibold text-navy-900 dark:text-white">Money moved</h2>
              {loading || !data ? (
                <div className="mt-4 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
                </div>
              ) : (
                <dl className="mt-3 space-y-2.5 text-sm">
                  <Row
                    label="In today"
                    value={formatMoney(data.money.receiptsToday)}
                    icon={ArrowDownToLine}
                    tone="text-success"
                  />
                  <Row
                    label="Out today"
                    value={formatMoney(data.money.paymentsToday)}
                    icon={ArrowUpFromLine}
                    tone="text-danger"
                  />
                  <div className="pt-2 mt-2 border-t border-slate-100 dark:border-navy-700 space-y-2.5">
                    <Row label="In this month" value={formatMoney(data.money.receiptsMonth)} tone="text-success" />
                    <Row label="Out this month" value={formatMoney(data.money.paymentsMonth)} tone="text-danger" />
                    <Row
                      label="Last month, in"
                      value={formatMoney(data.money.receiptsPrevMonth)}
                      tone="text-slate-500 dark:text-slate-400"
                    />
                  </div>
                </dl>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Receivables aging */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-navy-900 dark:text-white">What customers owe</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/reports/aging/customer">Recovery report <ArrowRight /></Link>
              </Button>
            </div>
            {loading || !data ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
              </div>
            ) : (
              <>
                <div className="tabular text-2xl font-bold text-navy-900 dark:text-white mb-3">
                  {formatMoney(data.receivables.total)}
                </div>
                <dl className="space-y-2.5 text-sm">
                  <Row label="Not due yet" value={formatMoney(data.receivables.current)} />
                  <Row label="1 – 30 days" value={formatMoney(data.receivables.days1To30)} tone="text-warning" />
                  <Row label="31 – 60 days" value={formatMoney(data.receivables.days31To60)} tone="text-warning" />
                  <Row label="60+ days" value={formatMoney(data.receivables.days60Plus)} tone="text-danger" />
                </dl>
              </>
            )}
          </CardBody>
        </Card>

        {/* Payables due soon */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-navy-900 dark:text-white">Bills to pay</h2>
                {data && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {data.payables.openCount} open · {formatMoney(data.payables.openTotal)} outstanding
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/purchases/invoices">All bills <ArrowRight /></Link>
              </Button>
            </div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : !data || data.payables.dueSoon.length === 0 ? (
              <EmptyState icon={Check} title="Nothing due" description="No bill is overdue or due within three days." />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-navy-700">
                {data.payables.dueSoon.map((p) => (
                  <Link
                    key={p.id}
                    href={`/purchases/invoices/${p.id}`}
                    className="flex items-center gap-3 py-2.5 hover:bg-slate-50 dark:hover:bg-navy-700/50 -mx-2 px-2 rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{p.supplier}</div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="tabular">{p.invoiceNo}</span> · due {formatDate(p.dueDate)}
                      </div>
                    </div>
                    <div className="tabular text-sm font-semibold text-danger shrink-0">
                      {formatMoney(p.balance)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Expenses awaiting this accountant */}
      {data && data.expenses.draftCount > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardBody className="py-4">
            <div className="flex items-center gap-3">
              <Receipt className="size-5 text-warning shrink-0" />
              <div className="flex-1 min-w-0 text-sm text-navy-900 dark:text-white">
                <strong>{data.expenses.draftCount}</strong>{" "}
                {data.expenses.draftCount === 1 ? "expense is" : "expenses are"} waiting for approval,
                worth {formatMoney(data.expenses.draftValue)}.
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/accounting/expenses?status=DRAFT">Review</Link>
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {data && (
        <p className="text-2xs text-slate-400 dark:text-slate-500 text-right">
          Figures as at {formatDate(data.asOf)}
          <span className="mx-1.5">·</span>
          <Wallet className="size-3 inline-block -mt-0.5" /> posted entries only
        </p>
      )}
    </div>
  );
}

function Row({
  label, value, icon: Icon, tone,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </dt>
      <dd className={cn("tabular font-medium shrink-0", tone ?? "text-navy-900 dark:text-white")}>
        {value}
      </dd>
    </div>
  );
}
