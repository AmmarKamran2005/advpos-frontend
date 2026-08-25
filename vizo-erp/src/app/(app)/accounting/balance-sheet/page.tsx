"use client";

import * as React from "react";
import axios from "axios";
import { AlertCircle, Info } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /accounting/balance-sheet?asOf=YYYY-MM-DD

   Balances are signed by the API to each account's natural sense: a
   debit-normal account (asset) is positive when debits exceed credits, a
   credit-normal one (liability, capital) the other way round, so this page just
   prints the number.

   The groups are the real "AccountGroup".GroupName values -- Assets,
   Liabilities and Capital. There is no "Equity" group in this database.

   `difference` is reported rather than hidden. Retained earnings are not a
   stored account here, so the two sides genuinely do not tie; a balance sheet
   that silently balances is worse than one that shows you the gap. */
type BsLine = { id: number; code: string; name: string; group: string; type: string; balance: number };

type BsResponse = {
  asOf: string;
  assets: BsLine[];
  liabilities: BsLine[];
  equity: BsLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  difference: number;
};

const EMPTY: BsResponse = {
  asOf: "", assets: [], liabilities: [], equity: [],
  totalAssets: 0, totalLiabilities: 0, totalEquity: 0, difference: 0,
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function BalanceSheetPage() {
  const [asOf, setAsOf] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = React.useState<number | null>(null);
  const [data, setData] = React.useState<BsResponse>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<BsResponse>(`${API_BASE_URL}/accounting/balance-sheet`, {
        params: { asOf },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not build the balance sheet."));
    } finally {
      setLoading(false);
    }
  }, [asOf]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const liabPlusEquity = data.totalLiabilities + data.totalEquity;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Money", href: "/accounting/coa" }, { label: "Balance Sheet" }]}
        title="Balance Sheet"
        subtitle={`Financial position as of ${asOf}`}
        actions={
          <ReportToolbar
            mode="asOf"
            reportName="Balance Sheet"
            asOfDate={asOf}
            onAsOfChange={setAsOf}
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
        <Stat label="Total Assets" loading={loading} value={formatCompact(data.totalAssets)} />
        <Stat label="Total Liabilities" loading={loading} value={formatCompact(data.totalLiabilities)} tone="text-warning" />
        <Stat label="Capital" loading={loading} value={formatCompact(data.totalEquity)} tone="text-info" />
      </div>

      {!loading && data.difference !== 0 && (
        <Card className="p-4 mb-6 border-warning/40">
          <div className="flex items-start gap-3">
            <Info className="size-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700 dark:text-slate-200">
              Assets are {formatMoney(Math.abs(data.difference))}{" "}
              {data.difference > 0 ? "above" : "below"} liabilities plus capital. Retained
              earnings are not a stored account in this chart, and the seeded opening
              balances do not tie — see backend/Database/db_code_changes.txt, section 3.2.
              The gap is shown rather than hidden.
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Assets" lines={data.assets} total={data.totalAssets} loading={loading} tone="text-navy-900 dark:text-white" />
        <div className="space-y-6">
          <Section title="Liabilities" lines={data.liabilities} total={data.totalLiabilities} loading={loading} tone="text-warning" />
          <Section title="Capital" lines={data.equity} total={data.totalEquity} loading={loading} tone="text-info" />
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Liabilities + Capital
              </span>
              {loading ? <Skeleton className="h-6 w-28" />
                       : <span className="tabular text-base font-bold text-navy-900 dark:text-white">{formatMoney(liabPlusEquity)}</span>}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Section({ title, lines, total, loading, tone }: {
  title: string; lines: BsLine[]; total: number; loading: boolean; tone: string;
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
        <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Nothing under {title.toLowerCase()}.</div>
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
                <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{formatMoney(l.balance)}</span>
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

function Stat({ label, value, loading, tone }: { label: string; value: string; loading: boolean; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      {loading ? <Skeleton className="h-8 w-28 mt-1" />
               : <div className={`text-2xl tabular font-bold mt-1 ${tone ?? "text-navy-900 dark:text-white"}`}>{value}</div>}
    </Card>
  );
}
