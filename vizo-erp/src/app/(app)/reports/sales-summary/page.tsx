"use client";

import * as React from "react";
import axios from "axios";
import { AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesTrendChart } from "@/components/widgets/sales-trend-chart";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact } from "@/lib/format";

/* GET /reports/sales-summary?from=&to=&locationId=

   Every figure on this page used to be a hardcoded constant -- 21,800,000
   revenue, 1,247 orders, 218 customers -- and the chart drew a fixed series
   from @/data/mock regardless of the date range the toolbar was set to. All of
   it now comes from invoiced sales in the range.

   Margin uses the UnitCost captured on each invoice line at the time of sale,
   not today's Product.CostPrice. */
type DayPoint = {
  date: string;
  invoices: number;
  units: number;
  revenue: number;
  cost: number;
  margin: number;
};

type LocationPoint = {
  location: string;
  invoices: number;
  revenue: number;
  cost: number;
  margin: number;
};

type SummaryResponse = {
  from: string;
  to: string;
  invoiceCount: number;
  unitsSold: number;
  subtotal: number;
  discount: number;
  tax: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
  averageInvoice: number;
  byDay: DayPoint[];
  byLocation: LocationPoint[];
};

const EMPTY: SummaryResponse = {
  from: "", to: "", invoiceCount: 0, unitsSold: 0, subtotal: 0, discount: 0,
  tax: 0, revenue: 0, cost: 0, margin: 0, marginPercent: 0, averageInvoice: 0,
  byDay: [], byLocation: [],
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function SalesSummaryPage() {
  const [from, setFrom] = React.useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = React.useState<number | null>(null);
  const [data, setData] = React.useState<SummaryResponse>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<SummaryResponse>(`${API_BASE_URL}/reports/sales-summary`, {
        params: { from, to, locationId: locationId ?? undefined },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not build the sales summary."));
    } finally {
      setLoading(false);
    }
  }, [from, to, locationId]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  /* The chart wants { date, revenue }. Dates come back as yyyy-MM-dd; shorten
     them so a 30-day axis stays readable. */
  const series = React.useMemo(
    () =>
      data.byDay.map((d) => ({
        date: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        revenue: d.revenue,
      })),
    [data.byDay]
  );

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Sales Summary" }]}
        title="Sales Summary"
        subtitle={`Invoiced sales — ${from} to ${to}`}
        actions={
          <ReportToolbar
            mode="range"
            reportName="Sales Summary"
            fromDate={from}
            toDate={to}
            onRangeChange={(f, t) => { setFrom(f); setTo(t); }}
            locationId={locationId}
            onLocationChange={setLocationId}
            doc={{ family: "report", key: "sales-summary" }}
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
        <Stat label="Total Revenue" loading={loading} value={formatCompact(data.revenue)} />
        <Stat label="Invoices" loading={loading} value={String(data.invoiceCount)} />
        <Stat label="Avg Invoice" loading={loading} value={formatMoney(data.averageInvoice)} />
        <Stat
          label="Margin"
          loading={loading}
          value={formatCompact(data.margin)}
          sub={`${data.marginPercent}%`}
          tone={data.margin >= 0 ? "text-success" : "text-danger"}
        />
      </div>

      <Card className="mb-6">
        <CardBody>
          <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Sales Trend</h3>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : series.length === 0 ? (
            <div className="h-64 grid place-items-center text-sm text-slate-500 dark:text-slate-400">
              No invoices in this range.
            </div>
          ) : (
            <SalesTrendChart data={series} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">By Location</h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : data.byLocation.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">Nothing to show.</div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-navy-700">
                    <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 py-2">Location</th>
                    <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 py-2">Invoices</th>
                    <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 py-2">Revenue</th>
                    <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 py-2">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                  {data.byLocation.map((l) => (
                    <tr key={l.location}>
                      <td className="py-2.5 text-sm font-medium text-navy-900 dark:text-white">{l.location}</td>
                      <td className="py-2.5 text-right tabular text-sm text-slate-600 dark:text-slate-300">{l.invoices}</td>
                      <td className="py-2.5 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(l.revenue)}</td>
                      <td className="py-2.5 text-right tabular text-sm font-semibold text-success">{formatMoney(l.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}

function Stat({
  label, value, sub, loading, tone,
}: { label: string; value: string; sub?: string; loading: boolean; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      {loading ? (
        <Skeleton className="h-8 w-24 mt-1" />
      ) : (
        <div className={`text-2xl tabular font-bold mt-1 ${tone ?? "text-navy-900 dark:text-white"}`}>
          {value}
          {sub && <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1.5">{sub}</span>}
        </div>
      )}
    </Card>
  );
}
