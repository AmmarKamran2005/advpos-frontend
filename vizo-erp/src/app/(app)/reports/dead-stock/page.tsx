"use client";

import * as React from "react";
import axios from "axios";
import { Archive, Package, AlertCircle } from "lucide-react";
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
import { toast } from "@/components/ui/toaster";

/* GET /reports/dead-stock?days=90

   "Dead" means NOTHING went out in the window -- the API looks at outbound
   StockMovement rows, not at a guessed date on the product. Items with zero
   stock are excluded: there is nothing to clear. */
type DeadRow = {
  id: number;
  sku: string;
  name: string;
  category: string;
  brand: string;
  costPrice: number;
  salePrice: number;
  onHand: number;
  lastOut: string | null;
  daysSinceLastOut: number | null;
  tiedUpValue: number;
};

type DeadResponse = {
  windowDays: number;
  count: number;
  tiedUpValue: number;
  items: DeadRow[];
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function DeadStockPage() {
  const [days, setDays] = React.useState(90);
  const [locationId, setLocationId] = React.useState<number | null>(null);
  const [data, setData] = React.useState<DeadResponse>({ windowDays: 90, count: 0, tiedUpValue: 0, items: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<DeadResponse>(`${API_BASE_URL}/reports/dead-stock`, {
        params: { days },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not build the dead-stock report."));
    } finally {
      setLoading(false);
    }
  }, [days]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const columns: Column<DeadRow>[] = [
    {
      key: "sku",
      header: "SKU",
      sortable: true,
      cell: (p) => <span className="tabular text-xs font-medium text-slate-600 dark:text-slate-400">{p.sku}</span>,
    },
    {
      key: "name",
      header: "Product",
      sortable: true,
      cell: (p) => (
        <div className="min-w-0">
          <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{p.name}</div>
          <div className="text-2xs text-slate-500 dark:text-slate-400">{p.category} · {p.brand}</div>
        </div>
      ),
    },
    {
      key: "onHand",
      header: "On Hand",
      sortable: true,
      align: "right",
      cell: (p) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{p.onHand}</span>,
    },
    {
      key: "daysSinceLastOut",
      header: "Last Sold",
      sortable: true,
      align: "right",
      cell: (p) => (
        <Badge variant={p.daysSinceLastOut === null ? "danger" : p.daysSinceLastOut > 180 ? "danger" : "warning"}>
          {p.daysSinceLastOut === null ? "never" : `${p.daysSinceLastOut}d ago`}
        </Badge>
      ),
    },
    {
      key: "costPrice",
      header: "Cost",
      align: "right",
      cell: (p) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{formatMoney(p.costPrice)}</span>,
    },
    {
      key: "tiedUpValue",
      header: "Tied Up",
      sortable: true,
      align: "right",
      cell: (p) => <span className="tabular text-sm font-bold text-danger">{formatMoney(p.tiedUpValue)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Dead Stock" }]}
        title="Dead Stock"
        subtitle={`Nothing sold in ${days} days — capital sitting on a shelf`}
        actions={
          <>
            <SelectNative
              value={String(days)}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-36"
            >
              <option value="30">Last 30 days</option>
              <option value="60">Last 60 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 180 days</option>
              <option value="365">Last year</option>
            </SelectNative>
            <Button
              variant="secondary"
              size="md"
              className="gap-1.5"
              disabled={data.items.length === 0}
              onClick={() =>
                toast.info("Clearance is not wired up yet", {
                  description: `${data.count} lines worth ${formatCompact(data.tiedUpValue)} would need a price change or a write-off.`,
                })
              }
            >
              <Archive />
              <span className="hidden sm:inline">Plan Clearance</span>
            </Button>
            <ReportToolbar mode="asOf" reportName="Dead Stock" locationId={locationId} onLocationChange={setLocationId} />
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
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Dead Lines</div>
          {loading ? <Skeleton className="h-8 w-16 mt-1" />
                   : <div className="text-2xl tabular font-bold text-danger mt-1">{data.count}</div>}
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Capital Tied Up</div>
          {loading ? <Skeleton className="h-8 w-24 mt-1" />
                   : <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatCompact(data.tiedUpValue)}</div>}
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Window</div>
          <div className="text-2xl tabular font-bold text-slate-600 dark:text-slate-300 mt-1">{days} days</div>
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
              Nothing dead in the last {days} days. Every line with stock has moved.
            </div>
          </div>
        ) : (
          <DataTable columns={columns} data={data.items} rowHref={(p) => `/inventory/products/${p.id}`} pageSize={15} />
        )}
      </Card>
    </>
  );
}
