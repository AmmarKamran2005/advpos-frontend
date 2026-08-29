"use client";

import * as React from "react";
import axios from "axios";
import { AlertCircle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /accounting/cash-flow?from=&to=

   Movement through the cash and bank accounts over the range, POSTED entries
   only. A debit to a cash account is money in; a credit is money out.

   This is a cash MOVEMENT statement, not a full IAS 7 cash-flow statement --
   there is no operating / investing / financing split, because nothing in the
   chart of accounts classifies them. Calling it what it is beats inventing
   three headings the data cannot support. */
type CfLine = { id: number; code: string; name: string; inflow: number; outflow: number; net: number };

type CfResponse = {
  from: string;
  to: string;
  totalInflow: number;
  totalOutflow: number;
  netChange: number;
  lines: CfLine[];
};

const EMPTY: CfResponse = { from: "", to: "", totalInflow: 0, totalOutflow: 0, netChange: 0, lines: [] };

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function CashFlowPage() {
  const [from, setFrom] = React.useState(() => `${new Date().getFullYear()}-01-01`);
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = React.useState<number | null>(null);
  const [data, setData] = React.useState<CfResponse>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<CfResponse>(`${API_BASE_URL}/accounting/cash-flow`, {
        params: { from, to },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not build the cash-flow statement."));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Money", href: "/accounting/coa" }, { label: "Cash Flow" }]}
        title="Cash Movement"
        subtitle={`Money in and out of every cash and bank account — ${from} to ${to}`}
        actions={
          <ReportToolbar
            mode="range"
            reportName="Cash Flow"
            fromDate={from}
            toDate={to}
            onRangeChange={(f, t) => { setFrom(f); setTo(t); }}
            locationId={locationId}
            onLocationChange={setLocationId}
            doc={{ family: "statement", key: "cash-flow" }}
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
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Money In</div>
          {loading ? <Skeleton className="h-8 w-28 mt-1" /> : (
            <div className="inline-flex items-center gap-1 text-2xl tabular font-bold text-success mt-1">
              <ArrowUpRight className="size-5" />{formatCompact(data.totalInflow)}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Money Out</div>
          {loading ? <Skeleton className="h-8 w-28 mt-1" /> : (
            <div className="inline-flex items-center gap-1 text-2xl tabular font-bold text-danger mt-1">
              <ArrowDownRight className="size-5" />{formatCompact(data.totalOutflow)}
            </div>
          )}
        </Card>
        <Card className={cn("p-4", !loading && (data.netChange >= 0 ? "border-success/40" : "border-danger/40"))}>
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Net Change</div>
          {loading ? <Skeleton className="h-8 w-28 mt-1" /> : (
            <div className={cn("text-2xl tabular font-bold mt-1", data.netChange >= 0 ? "text-success" : "text-danger")}>
              {formatCompact(data.netChange)}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : data.lines.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No cash moved in this range.
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-navy-700/50 border-b border-slate-200 dark:border-navy-700">
                  <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Account</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">In</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">Out</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {data.lines.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-navy-800">
                    <td className="px-4 py-2.5">
                      <div className="text-sm font-medium text-navy-900 dark:text-white">{l.name}</div>
                      <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{l.code}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular text-sm text-success">{l.inflow > 0 ? formatMoney(l.inflow) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular text-sm text-danger">{l.outflow > 0 ? formatMoney(l.outflow) : "—"}</td>
                    <td className={cn("px-4 py-2.5 text-right tabular text-sm font-bold",
                      l.net >= 0 ? "text-navy-900 dark:text-white" : "text-danger")}>
                      {formatMoney(l.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-navy-900 text-white">
                  <td className="px-4 py-3 text-sm font-bold uppercase tracking-wider">Totals</td>
                  <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(data.totalInflow)}</td>
                  <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(data.totalOutflow)}</td>
                  <td className="px-4 py-3 text-right tabular text-base font-bold text-brand-yellow">{formatMoney(data.netChange)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
