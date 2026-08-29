"use client";

import * as React from "react";
import axios from "axios";
import { AlertCircle, Info } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /accounting/trial-balance?asOf=YYYY-MM-DD

   Only POSTED entries count. A draft entry is a piece of paper somebody is
   still typing, and including it is how a set of books stops agreeing with
   itself.

   The response separates POSTED MOVEMENT from OPENING balances on purpose.
   Movement is double entry and must balance to the cent; opening balances are
   typed in by hand at setup and frequently do not. Reporting one combined
   "not balanced" hides which of the two it is and sends people hunting through
   journal entries that were never at fault. */
type TbLine = {
  id: number;
  code: string;
  name: string;
  type: string;
  group: string;
  opening: number;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
};

type TbResponse = {
  asOf: string;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  movementDebit: number;
  movementCredit: number;
  movementBalances: boolean;
  openingImbalance: number;
  openingBalances: boolean;
  note: string | null;
  lines: TbLine[];
};

const EMPTY: TbResponse = {
  asOf: "", totalDebit: 0, totalCredit: 0, isBalanced: true,
  movementDebit: 0, movementCredit: 0, movementBalances: true,
  openingImbalance: 0, openingBalances: true, note: null, lines: [],
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function TrialBalancePage() {
  const [asOf, setAsOf] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = React.useState<number | null>(null);
  const [data, setData] = React.useState<TbResponse>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<TbResponse>(`${API_BASE_URL}/accounting/trial-balance`, {
        params: { asOf },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not build the trial balance."));
    } finally {
      setLoading(false);
    }
  }, [asOf]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Money", href: "/accounting/coa" }, { label: "Trial Balance" }]}
        title="Trial Balance"
        subtitle={`Every posting account and its balance — as of ${asOf}`}
        actions={
          <ReportToolbar
            mode="asOf"
            reportName="Trial Balance"
            asOfDate={asOf}
            onAsOfChange={setAsOf}
            locationId={locationId}
            onLocationChange={setLocationId}
            doc={{ family: "statement", key: "trial-balance" }}
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total Debit" loading={loading} value={formatCompact(data.totalDebit)} />
        <Stat label="Total Credit" loading={loading} value={formatCompact(data.totalCredit)} />
        <Stat
          label="Posted movement"
          loading={loading}
          value={data.movementBalances ? "Balanced" : "Out"}
          tone={data.movementBalances ? "text-success" : "text-danger"}
          sub={formatCompact(data.movementDebit)}
        />
        <Stat
          label="Opening balances"
          loading={loading}
          value={data.openingBalances ? "Balanced" : "Out"}
          tone={data.openingBalances ? "text-success" : "text-warning"}
          sub={data.openingBalances ? undefined : formatCompact(Math.abs(data.openingImbalance))}
        />
      </div>

      {!loading && data.note && (
        <Card className="p-4 mb-6 border-warning/40">
          <div className="flex items-start gap-3">
            <Info className="size-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700 dark:text-slate-200">{data.note}</div>
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : data.lines.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No posted activity as of {asOf}.
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-navy-700/50 border-b border-slate-200 dark:border-navy-700">
                  <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Code</th>
                  <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">Account</th>
                  <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5 hidden md:table-cell">Group</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">Debit</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {data.lines.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-navy-800">
                    <td className="px-4 py-2 tabular text-xs text-slate-600 dark:text-slate-400">{l.code}</td>
                    <td className="px-3 py-2">
                      <div className="text-sm text-navy-900 dark:text-white">{l.name}</div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400 md:hidden">{l.group}</div>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <Badge variant="muted">{l.group}</Badge>
                    </td>
                    <td className={cn("px-3 py-2 text-right tabular text-sm",
                      l.debitBalance > 0 ? "text-navy-900 dark:text-white font-medium" : "text-slate-300 dark:text-slate-600")}>
                      {l.debitBalance > 0 ? formatMoney(l.debitBalance) : "—"}
                    </td>
                    <td className={cn("px-4 py-2 text-right tabular text-sm",
                      l.creditBalance > 0 ? "text-navy-900 dark:text-white font-medium" : "text-slate-300 dark:text-slate-600")}>
                      {l.creditBalance > 0 ? formatMoney(l.creditBalance) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-navy-900 text-white">
                  <td colSpan={3} className="px-4 py-3 text-sm font-bold uppercase tracking-wider">Totals</td>
                  <td className="px-3 py-3 text-right tabular text-base font-bold text-brand-yellow">{formatMoney(data.totalDebit)}</td>
                  <td className="px-4 py-3 text-right tabular text-base font-bold text-brand-yellow">{formatMoney(data.totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Stat({ label, value, sub, loading, tone }: {
  label: string; value: string; sub?: string; loading: boolean; tone?: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      {loading ? <Skeleton className="h-8 w-24 mt-1" /> : (
        <>
          <div className={`text-2xl tabular font-bold mt-1 ${tone ?? "text-navy-900 dark:text-white"}`}>{value}</div>
          {sub && <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>}
        </>
      )}
    </Card>
  );
}
