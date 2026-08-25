"use client";

import * as React from "react";
import axios from "axios";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /accounting/profit-loss?from=&to=

   Income and expense accounts over the range, POSTED entries only.

   The API keys on the real "AccountGroup".GroupName values -- Revenue and
   Expenses. They are plural and they are not the words you would guess; an
   earlier version filtered on "Income"/"Expense" and this page rendered a
   confident 0 / 0 because nothing matched. */
type PlLine = { id: number; code: string; name: string; type: string; amount: number };

type PlResponse = {
  from: string;
  to: string;
  income: PlLine[];
  expense: PlLine[];
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
};

const EMPTY: PlResponse = {
  from: "", to: "", income: [], expense: [], totalIncome: 0, totalExpense: 0, netProfit: 0,
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function ProfitLossPage() {
  const [from, setFrom] = React.useState(() => `${new Date().getFullYear()}-01-01`);
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = React.useState<number | null>(null);
  const [data, setData] = React.useState<PlResponse>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<PlResponse>(`${API_BASE_URL}/accounting/profit-loss`, {
        params: { from, to },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not build the profit and loss statement."));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const margin = data.totalIncome === 0 ? 0 : Math.round((data.netProfit / data.totalIncome) * 1000) / 10;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Money", href: "/accounting/coa" }, { label: "Profit & Loss" }]}
        title="Profit & Loss"
        subtitle={`Posted income and expenses — ${from} to ${to}`}
        actions={
          <ReportToolbar
            mode="range"
            reportName="Profit & Loss"
            fromDate={from}
            toDate={to}
            onRangeChange={(f, t) => { setFrom(f); setTo(t); }}
            locationId={locationId}
            onLocationChange={setLocationId}
          />
        }
      />

      {error && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Revenue</div>
          {loading ? <Skeleton className="h-8 w-28 mt-1" />
                   : <div className="text-2xl tabular font-bold text-success mt-1">{formatCompact(data.totalIncome)}</div>}
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Expenses</div>
          {loading ? <Skeleton className="h-8 w-28 mt-1" />
                   : <div className="text-2xl tabular font-bold text-danger mt-1">{formatCompact(data.totalExpense)}</div>}
        </Card>
        <Card className={cn("p-4", !loading && (data.netProfit >= 0 ? "border-success/40" : "border-danger/40"))}>
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Net Profit</div>
          {loading ? <Skeleton className="h-8 w-28 mt-1" /> : (
            <div className="flex items-baseline gap-2 mt-1">
              <span className={cn("text-2xl tabular font-bold", data.netProfit >= 0 ? "text-success" : "text-danger")}>
                {formatCompact(data.netProfit)}
              </span>
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {data.netProfit >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {margin}%
              </span>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section
          title="Revenue"
          lines={data.income}
          total={data.totalIncome}
          tone="text-success"
          loading={loading}
          empty="No income posted in this range."
        />
        <Section
          title="Expenses"
          lines={data.expense}
          total={data.totalExpense}
          tone="text-danger"
          loading={loading}
          empty="No expenses posted in this range."
        />
      </div>

      <Card className="mt-6">
        <CardBody>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Net {data.netProfit >= 0 ? "Profit" : "Loss"}
            </span>
            {loading ? <Skeleton className="h-7 w-32" /> : (
              <span className={cn("tabular text-xl font-bold", data.netProfit >= 0 ? "text-success" : "text-danger")}>
                {formatMoney(Math.abs(data.netProfit))}
              </span>
            )}
          </div>
        </CardBody>
      </Card>
    </>
  );
}

function Section({ title, lines, total, tone, loading, empty }: {
  title: string; lines: PlLine[]; total: number; tone: string; loading: boolean; empty: string;
}) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-700/50">
        <h3 className="text-sm font-semibold text-navy-900 dark:text-white">{title}</h3>
      </div>
      {loading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : lines.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{empty}</div>
      ) : (
        <>
          <div className="divide-y divide-slate-100 dark:divide-navy-700">
            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="tabular text-2xs text-slate-500 dark:text-slate-400 w-12 shrink-0">{l.code}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-navy-900 dark:text-white truncate">{l.name}</div>
                  <div className="text-2xs text-slate-500 dark:text-slate-400">{l.type}</div>
                </div>
                <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{formatMoney(l.amount)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-700/40">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Total {title}</span>
            <span className={cn("tabular text-base font-bold", tone)}>{formatMoney(total)}</span>
          </div>
        </>
      )}
    </Card>
  );
}
