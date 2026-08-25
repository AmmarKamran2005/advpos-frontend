"use client";

import * as React from "react";
import axios from "axios";
import { Trophy, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /reports/top-customers?from=&to=&limit=

   Ranked on real invoiced revenue over the range, with margin worked out from
   the UnitCost captured on each invoice line at the time of sale -- not from
   today's Product.CostPrice, which has moved since. */
type TopRow = {
  customerId: number;
  customerName: string;
  customerInitials: string;
  city: string;
  invoiceCount: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
  averageInvoice: number;
  lastInvoice: string;
  daysSinceLastInvoice: number;
};

type TopResponse = {
  from: string;
  to: string;
  count: number;
  totalRevenue: number;
  totalMargin: number;
  items: TopRow[];
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const MEDAL = ["text-brand-yellow", "text-slate-400", "text-amber-700"];

export default function TopCustomersPage() {
  const [from, setFrom] = React.useState(() => new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = React.useState<number | null>(null);
  const [data, setData] = React.useState<TopResponse>({ from: "", to: "", count: 0, totalRevenue: 0, totalMargin: 0, items: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<TopResponse>(`${API_BASE_URL}/reports/top-customers`, {
        params: { from, to, limit: 20 },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not build the top-customers report."));
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
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Top Customers" }]}
        title="Top Customers"
        subtitle={`Ranked by invoiced revenue — ${from} to ${to}`}
        actions={
          <ReportToolbar
            mode="range"
            reportName="Top Customers"
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Customers</div>
          {loading ? <Skeleton className="h-8 w-16 mt-1" />
                   : <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{data.count}</div>}
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Revenue</div>
          {loading ? <Skeleton className="h-8 w-24 mt-1" />
                   : <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatCompact(data.totalRevenue)}</div>}
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Margin</div>
          {loading ? <Skeleton className="h-8 w-24 mt-1" />
                   : <div className="text-2xl tabular font-bold text-success mt-1">{formatCompact(data.totalMargin)}</div>}
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : data.items.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No invoices in this range.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-navy-700">
            {data.items.map((c, i) => (
              <div key={c.customerId} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-navy-800">
                <div className={cn("w-7 text-center font-bold tabular", i < 3 ? MEDAL[i] : "text-slate-400")}>
                  {i < 3 ? <Trophy className="size-4 mx-auto" /> : i + 1}
                </div>
                <Avatar initials={c.customerInitials} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{c.customerName}</div>
                  <div className="text-2xs text-slate-500 dark:text-slate-400">
                    {c.city} · {c.invoiceCount} invoices · avg {formatMoney(c.averageInvoice)}
                    {c.daysSinceLastInvoice > 60 && (
                      <span className="text-warning font-semibold"> · quiet {c.daysSinceLastInvoice}d</span>
                    )}
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <Badge variant={c.marginPercent >= 20 ? "success" : c.marginPercent >= 10 ? "info" : "warning"}>
                    {c.marginPercent}%
                  </Badge>
                  <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">{formatCompact(c.margin, false)} margin</div>
                </div>
                <div className="text-right w-28">
                  <div className="tabular text-sm font-bold text-navy-900 dark:text-white">{formatCompact(c.revenue, false)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
