"use client";

import * as React from "react";
import axios from "axios";
import { AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /reports/aging/supplier?asOf=YYYY-MM-DD
   Open purchase invoices aged from their DUE date. What we owe, and how late. */
type AgingRow = {
  supplierId: number;
  supplierName: string;
  supplierInitials: string;
  creditDays: number;
  invoiceCount: number;
  current: number;
  d0_30: number;
  d31_60: number;
  d61_90: number;
  d90plus: number;
  outstanding: number;
};

type AgingResponse = {
  asOf: string;
  supplierCount: number;
  current: number;
  d0_30: number;
  d31_60: number;
  d61_90: number;
  d90plus: number;
  totalOutstanding: number;
  items: AgingRow[];
};

const EMPTY: AgingResponse = {
  asOf: "", supplierCount: 0, current: 0, d0_30: 0, d31_60: 0, d61_90: 0,
  d90plus: 0, totalOutstanding: 0, items: [],
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function SupplierAgingPage() {
  const [asOf, setAsOf] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = React.useState<number | null>(null);
  const [data, setData] = React.useState<AgingResponse>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<AgingResponse>(`${API_BASE_URL}/reports/aging/supplier`, {
        params: { asOf },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not build the payables ageing report."));
    } finally {
      setLoading(false);
    }
  }, [asOf]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project; see parties/page.tsx. */
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "AP Aging" }]}
        title="Accounts Payable Aging"
        subtitle={`What we owe suppliers, by age bucket — as of ${asOf}`}
        actions={
          <ReportToolbar
            mode="asOf"
            reportName="AP Aging"
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

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <BucketCard label="Total AP"   value={data.totalOutstanding} color="text-navy-900 dark:text-white" loading={loading} />
        <BucketCard label="Current"    value={data.current}          color="text-success" loading={loading} />
        <BucketCard label="1-30 Days"  value={data.d0_30}            color="text-info" loading={loading} />
        <BucketCard label="31-60 Days" value={data.d31_60}           color="text-warning" loading={loading} />
        <BucketCard label="61-90 Days" value={data.d61_90}           color="text-warning" loading={loading} />
        <BucketCard label="90+ Days"   value={data.d90plus}          color="text-danger" loading={loading} />
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : data.items.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Nothing owed to suppliers as of {asOf}.
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-navy-700/50 border-b border-slate-200 dark:border-navy-700">
                  <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Supplier</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">Current</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">1-30</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">31-60</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">61-90</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">90+</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {data.items.map((r) => (
                  <tr key={r.supplierId} className="hover:bg-slate-50 dark:hover:bg-navy-800">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={r.supplierInitials} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-navy-900 dark:text-white">{r.supplierName}</div>
                          <div className="text-2xs text-slate-500 dark:text-slate-400">
                            NET {r.creditDays} · {r.invoiceCount} open
                          </div>
                        </div>
                      </div>
                    </td>
                    <Cell value={r.current} className="text-success" />
                    <Cell value={r.d0_30} className="text-info" />
                    <Cell value={r.d31_60} className="text-warning" bold />
                    <Cell value={r.d61_90} className="text-warning" bold />
                    <Cell value={r.d90plus} className="text-danger" bold />
                    <td className="px-4 py-2.5 text-right tabular text-sm font-bold text-navy-900 dark:text-white">
                      {formatMoney(r.outstanding)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-navy-900 text-white">
                  <td className="px-4 py-3 text-sm font-bold uppercase tracking-wider">Totals</td>
                  <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(data.current)}</td>
                  <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(data.d0_30)}</td>
                  <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(data.d31_60)}</td>
                  <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(data.d61_90)}</td>
                  <td className="px-3 py-3 text-right tabular text-sm font-bold text-brand-yellow">{formatMoney(data.d90plus)}</td>
                  <td className="px-4 py-3 text-right tabular text-base font-bold text-brand-yellow">{formatMoney(data.totalOutstanding)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Cell({ value, className, bold }: { value: number; className: string; bold?: boolean }) {
  return (
    <td className={cn("px-3 py-2.5 text-right tabular text-sm", bold && "font-semibold",
      value > 0 ? className : "text-slate-300 dark:text-slate-600")}>
      {value > 0 ? formatMoney(value) : "—"}
    </td>
  );
}

function BucketCard({ label, value, color, loading }: { label: string; value: number; color: string; loading: boolean }) {
  return (
    <Card className="p-3">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      {loading ? <Skeleton className="h-6 w-20 mt-1" />
               : <div className={`text-lg tabular font-bold mt-1 ${color}`}>{formatCompact(value, false)}</div>}
    </Card>
  );
}
