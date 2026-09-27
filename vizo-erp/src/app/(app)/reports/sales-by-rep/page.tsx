"use client";

import * as React from "react";
import axios from "axios";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { ReportStat as Stat, ReportError, NumCell, Mini, apiMessage } from "@/components/widgets/report-bits";
import { formatMoney, formatCompact, initials } from "@/lib/format";
import { todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

/* GET /reports/sales-by-rep?from=&to= (SalesReportsController).

   One row per salesperson over the range: orders taken, invoiced, returns,
   net sales, confirmed collections on his orders, and what his assigned
   customers owe at the end of the range (off the ledger). A rep is sent his
   own row only; the back office also gets a "No salesperson" row for counter
   sales, direct invoices and unassigned customers, so the totals are the
   business's totals. */
type RepRow = {
  repId: number | null;
  repName: string;
  repRole: string | null;
  customers: number;
  orders: number;
  orderValue: number;
  invoices: number;
  invoiced: number;
  returns: number;
  netSales: number;
  collected: number;
  outstanding: number;
  visits: number;
};

type Report = {
  from: string;
  to: string;
  scopedToRep: boolean;
  count: number;
  totals: RepRow;
  items: RepRow[];
};

function monthStart() {
  const t = todayISO();
  return `${t.slice(0, 8)}01`;
}

export default function SalesByRepPage() {
  const [from, setFrom] = React.useState(monthStart);
  const [to, setTo] = React.useState(() => todayISO());
  const [data, setData] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Report>(`${API_BASE_URL}/reports/sales-by-rep`, {
        params: { from, to }, headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not build sales by salesperson."));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const t = data?.totals;
  const name = (r: RepRow) => (r.repRole && r.repRole !== "Sales" ? `${r.repName} (${r.repRole})` : r.repName);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Sales by Salesperson" }]}
        title="Sales by Salesperson"
        subtitle={data?.scopedToRep ? `Your own figures — ${from} to ${to}` : `Per rep — ${from} to ${to}`}
        actions={
          <ReportToolbar
            mode="range"
            reportName="Sales by Salesperson"
            fromDate={from}
            toDate={to}
            onRangeChange={(f, tt) => { setFrom(f); setTo(tt); }}
            doc={{ family: "report", key: "sales-by-rep" }}
            exportPath="reports/sales-by-rep/export"
          />
        }
      />

      {error && <ReportError message={error} onRetry={() => void load()} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Net sales" loading={loading} value={formatCompact(t?.netSales ?? 0)} sub={`${t?.invoices ?? 0} invoices`} />
        <Stat label="Orders taken" loading={loading} value={String(t?.orders ?? 0)} sub={formatCompact(t?.orderValue ?? 0)} />
        <Stat label="Collected" loading={loading} value={formatCompact(t?.collected ?? 0)} tone="text-success" sub="confirmed" />
        <Stat label="Customers owe" loading={loading} value={formatCompact(t?.outstanding ?? 0)} tone="text-warning" sub={`at ${to}`} />
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={Users} title="No sales in this range" description="Pick a wider range from the date button." />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-navy-700/50 border-b border-slate-200 dark:border-navy-700">
                    {["Salesperson", "Orders", "Invoiced", "Returns", "Net Sales", "Collected", "Customers owe", "Visits"].map((h, i) => (
                      <th key={h} className={cn("text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5", i === 0 ? "text-left px-4" : "text-right")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                  {data.items.map((r) => (
                    <tr key={r.repId ?? "none"} className="hover:bg-slate-50 dark:hover:bg-navy-800">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar initials={r.repId ? initials(r.repName) : "—"} size="sm" />
                          <div className="min-w-0">
                            <div className={cn("text-sm font-medium truncate", r.repId ? "text-navy-900 dark:text-white" : "text-slate-500 dark:text-slate-400")}>{name(r)}</div>
                            <div className="text-2xs text-slate-500 dark:text-slate-400">{r.customers} customers · {r.invoices} invoices</div>
                          </div>
                        </div>
                      </td>
                      <NumCell v={r.orders} count />
                      <NumCell v={r.invoiced} />
                      <NumCell v={r.returns} className="text-danger" />
                      <NumCell v={r.netSales} bold />
                      <NumCell v={r.collected} className="text-success" />
                      <NumCell v={r.outstanding} className="text-warning" />
                      <NumCell v={r.visits} count />
                    </tr>
                  ))}
                </tbody>
                {!data.scopedToRep && t && (
                  <tfoot>
                    <tr className="bg-navy-900 text-white">
                      <td className="px-4 py-3 text-sm font-bold uppercase tracking-wider">Totals</td>
                      <td className="px-3 py-3 text-right tabular text-sm font-bold">{t.orders}</td>
                      <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(t.invoiced)}</td>
                      <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(t.returns)}</td>
                      <td className="px-3 py-3 text-right tabular text-sm font-bold text-brand-yellow">{formatMoney(t.netSales)}</td>
                      <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(t.collected)}</td>
                      <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(t.outstanding)}</td>
                      <td className="px-3 py-3 text-right tabular text-sm font-bold">{t.visits}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Phones */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-navy-700">
              {data.items.map((r) => (
                <div key={r.repId ?? "none"} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-sm font-semibold truncate", r.repId ? "text-navy-900 dark:text-white" : "text-slate-500")}>{name(r)}</span>
                    <span className="tabular text-sm font-bold text-navy-900 dark:text-white shrink-0">{formatMoney(r.netSales)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-2xs">
                    <Mini label="Orders" value={String(r.orders)} />
                    <Mini label="Collected" value={formatCompact(r.collected)} tone="text-success" />
                    <Mini label="Owed" value={formatCompact(r.outstanding)} tone="text-warning" />
                    <Mini label="Invoiced" value={formatCompact(r.invoiced)} />
                    <Mini label="Returns" value={formatCompact(r.returns)} tone="text-danger" />
                    <Mini label="Visits" value={String(r.visits)} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
      <p className="text-2xs text-slate-500 dark:text-slate-400 mt-3">
        Invoiced = invoices on the rep&apos;s orders. Collected = confirmed collections on his orders. Customers owe =
        his assigned customers&apos; ledger balance at the end of the range.
      </p>
    </>
  );
}
