"use client";

import * as React from "react";
import axios from "axios";
import { AlertTriangle, Package, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectNative } from "@/components/ui/select-native";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact } from "@/lib/format";

/* GET /reports/slow-moving?days=90&minCoverDays=120

   Still selling, but slowly. The number that matters is DAYS OF COVER, not
   units sold: 5 a month is fine on a 10-unit shelf and terrible on a 500-unit
   one. Cover = onHand / (soldInWindow / days). */
type SlowRow = {
  id: number;
  sku: string;
  name: string;
  category: string;
  brand: string;
  costPrice: number;
  onHand: number;
  soldInWindow: number;
  perDay: number;
  coverDays: number;
  tiedUpValue: number;
};

type SlowResponse = {
  windowDays: number;
  minCoverDays: number;
  count: number;
  tiedUpValue: number;
  items: SlowRow[];
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function SlowMovingPage() {
  const [days, setDays] = React.useState(90);
  const [minCover, setMinCover] = React.useState(120);
  const [locationId, setLocationId] = React.useState<number | null>(null);
  const [data, setData] = React.useState<SlowResponse>({ windowDays: 90, minCoverDays: 120, count: 0, tiedUpValue: 0, items: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<SlowResponse>(`${API_BASE_URL}/reports/slow-moving`, {
        params: { days, minCoverDays: minCover },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not build the slow-moving report."));
    } finally {
      setLoading(false);
    }
  }, [days, minCover]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const columns: Column<SlowRow>[] = [
    { key: "sku", header: "SKU", sortable: true,
      cell: (p) => <span className="tabular text-xs font-medium text-slate-600 dark:text-slate-400">{p.sku}</span> },
    { key: "name", header: "Product", sortable: true,
      cell: (p) => (
        <div className="min-w-0">
          <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{p.name}</div>
          <div className="text-2xs text-slate-500 dark:text-slate-400">{p.category} · {p.brand}</div>
        </div>
      ) },
    { key: "onHand", header: "On Hand", sortable: true, align: "right",
      cell: (p) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{p.onHand}</span> },
    { key: "soldInWindow", header: `Sold / ${days}d`, sortable: true, align: "right",
      cell: (p) => (
        <div className="text-right">
          <div className="tabular text-sm text-slate-600 dark:text-slate-300">{p.soldInWindow}</div>
          <div className="text-2xs text-slate-500 dark:text-slate-400">{p.perDay}/day</div>
        </div>
      ) },
    { key: "coverDays", header: "Cover", sortable: true, align: "right",
      cell: (p) => (
        <Badge variant={p.coverDays > 365 ? "danger" : p.coverDays > 180 ? "warning" : "info"}>
          {p.coverDays > 3650 ? "10y+" : `${p.coverDays}d`}
        </Badge>
      ) },
    { key: "tiedUpValue", header: "Tied Up", sortable: true, align: "right",
      cell: (p) => <span className="tabular text-sm font-bold text-warning">{formatMoney(p.tiedUpValue)}</span> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Slow Moving" }]}
        title="Slow Moving Stock"
        subtitle={`Still selling, but more than ${minCover} days of cover on the shelf`}
        actions={
          <>
            <SelectNative value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="w-36">
              <option value="30">Last 30 days</option>
              <option value="60">Last 60 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 180 days</option>
            </SelectNative>
            <SelectNative value={String(minCover)} onChange={(e) => setMinCover(Number(e.target.value))} className="w-40">
              <option value="60">60+ days cover</option>
              <option value="120">120+ days cover</option>
              <option value="180">180+ days cover</option>
              <option value="365">1 year+ cover</option>
            </SelectNative>
            <ReportToolbar mode="asOf" reportName="Slow Moving" locationId={locationId} onLocationChange={setLocationId} />
          </>
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
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Slow Lines</div>
          {loading ? <Skeleton className="h-8 w-16 mt-1" />
                   : <div className="text-2xl tabular font-bold text-warning mt-1">{data.count}</div>}
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Capital Tied Up</div>
          {loading ? <Skeleton className="h-8 w-24 mt-1" />
                   : <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatCompact(data.tiedUpValue)}</div>}
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Threshold</div>
          <div className="text-2xl tabular font-bold text-slate-600 dark:text-slate-300 mt-1">{minCover}d</div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : data.items.length === 0 ? (
          <div className="p-10 text-center">
            <Package className="size-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Nothing carrying more than {minCover} days of cover. Stock is turning.
            </div>
          </div>
        ) : (
          <DataTable columns={columns} data={data.items} rowHref={(p) => `/inventory/products/${p.id}`} pageSize={15} />
        )}
      </Card>

      {!loading && data.items.length > 0 && (
        <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
          <AlertTriangle className="size-4 shrink-0 mt-0.5 text-warning" />
          <span>
            Cover is on-hand divided by the daily rate over the last {days} days. A line
            selling steadily but stocked ten deep still shows here — that is the point.
          </span>
        </div>
      )}
    </>
  );
}
