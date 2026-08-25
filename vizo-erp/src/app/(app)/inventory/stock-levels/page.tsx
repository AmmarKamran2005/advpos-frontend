"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /inventory/stock-levels -> one row per (product, location), which is how
   "StockBalance" actually stores it. The per-location columns below are pivoted
   here in the browser; the API deliberately does not invent a wide shape,
   because the set of locations is data and can change.

   GET /inventory/lookups supplies the location list for the column headers.
   The mock used activeLocations() from @/data/settings, which is a hardcoded
   list that would silently disagree with the database. */
type StockRow = {
  productId: number;
  sku: string;
  name: string;
  packing: number;
  minQty: number;
  maxQty: number;
  costPrice: number;
  locationId: number;
  locationCode: string;
  locationName: string;
  qty: number;
  packets: number;
  loose: number;
  value: number;
  status: "out" | "low" | "over" | "ok";
};

type StockResponse = { totalValue: number; totalUnits: number; items: StockRow[] };

type LocationRef = { id: number; code: string; name: string };

/* One line per product, with the per-location quantities folded in. */
type PivotRow = {
  /* DataTable keys its rows on `id`; for a pivoted line that is the product. */
  id: number;
  productId: number;
  sku: string;
  name: string;
  minQty: number;
  costPrice: number;
  totalStock: number;
  value: number;
  status: "out" | "low" | "over" | "ok";
  byLocation: Record<number, number>;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function StockLevelsPage() {
  const [rows, setRows] = React.useState<StockRow[]>([]);
  const [locations, setLocations] = React.useState<LocationRef[]>([]);
  const [totals, setTotals] = React.useState({ totalValue: 0, totalUnits: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "low" | "out">("all");

  const load = React.useCallback(async () => {
    try {
      const [stock, lookups] = await Promise.all([
        axios.get<StockResponse>(`${API_BASE_URL}/inventory/stock-levels`, { headers: authHeader() }),
        axios.get<{ locations: LocationRef[] }>(`${API_BASE_URL}/inventory/lookups`, { headers: authHeader() }),
      ]);
      setRows(stock.data.items);
      setTotals({ totalValue: stock.data.totalValue, totalUnits: stock.data.totalUnits });
      setLocations(lookups.data.locations);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load stock levels."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  /* Pivot: one line per product, quantities keyed by location id. Status is
     recomputed on the TOTAL, because a product can be low overall while one
     shelf still looks healthy. */
  const pivot = React.useMemo<PivotRow[]>(() => {
    const byProduct = new Map<number, PivotRow>();
    for (const r of rows) {
      let p = byProduct.get(r.productId);
      if (!p) {
        p = {
          id: r.productId, productId: r.productId, sku: r.sku, name: r.name,
          minQty: r.minQty, costPrice: r.costPrice,
          totalStock: 0, value: 0, status: "ok", byLocation: {},
        };
        byProduct.set(r.productId, p);
      }
      p.byLocation[r.locationId] = (p.byLocation[r.locationId] ?? 0) + r.qty;
      p.totalStock += r.qty;
      p.value += r.value;
    }
    for (const p of byProduct.values()) {
      p.status = p.totalStock <= 0 ? "out" : p.totalStock <= p.minQty ? "low" : "ok";
    }
    return [...byProduct.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return pivot.filter((r) => {
      if (filter === "low" && r.status !== "low") return false;
      if (filter === "out" && r.status !== "out") return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q);
    });
  }, [pivot, search, filter]);

  const lowCount = pivot.filter((r) => r.status === "low").length;
  const outCount = pivot.filter((r) => r.status === "out").length;

  const columns: Column<PivotRow>[] = [
    {
      key: "name",
      header: "Product",
      sortable: true,
      cell: (r) => (
        <div>
          <Link
            href={`/inventory/products/${r.productId}`}
            className="text-sm font-medium text-navy-900 dark:text-white hover:text-brand-yellow-700 dark:hover:text-brand-yellow"
          >
            {r.name}
          </Link>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular">{r.sku}</div>
        </div>
      ),
    },
    ...locations.map<Column<PivotRow>>((loc) => ({
      key: `loc-${loc.id}`,
      header: (
        <div className="text-right">
          <div>{loc.name}</div>
          <div className="text-2xs font-normal opacity-60 tabular">{loc.code}</div>
        </div>
      ),
      align: "right" as const,
      cell: (r) => {
        const v = r.byLocation[loc.id] ?? 0;
        return (
          <span className={cn("tabular text-sm", v === 0 ? "text-slate-300 dark:text-slate-600" : "text-navy-900 dark:text-white font-medium")}>
            {v}
          </span>
        );
      },
    })),
    {
      key: "totalStock",
      header: "Total",
      align: "right",
      sortable: true,
      cell: (r) => (
        <span className={cn("tabular text-sm font-bold",
          r.status === "out" ? "text-danger" : r.status === "low" ? "text-warning" : "text-navy-900 dark:text-white")}>
          {r.totalStock}
        </span>
      ),
    },
    {
      key: "minQty",
      header: "RP",
      align: "right",
      cell: (r) => <span className="tabular text-xs text-slate-500 dark:text-slate-400">{r.minQty}</span>,
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      sortable: true,
      cell: (r) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{formatMoney(r.value)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Stock Levels" }]}
        title="Stock Levels"
        subtitle="What is on each shelf, and what it is worth"
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
        <Stat label="Products stocked" loading={loading} value={String(pivot.length)} />
        <Stat label="Units on hand" loading={loading} value={totals.totalUnits.toLocaleString()} />
        <Stat label="Stock value" loading={loading} value={formatCompact(totals.totalValue)} />
        <Stat label="Low / Out" loading={loading} value={`${lowCount} / ${outCount}`} tone={outCount > 0 ? "text-danger" : "text-warning"} />
      </div>

      <FilterBar
        searchPlaceholder="Product or SKU…"
        searchValue={search}
        onSearchChange={setSearch}
        chips={filter !== "all" ? [{ key: "status", label: "Status", value: filter === "low" ? "Low stock" : "Out of stock" }] : []}
        onRemoveChip={() => setFilter("all")}
        onClearAll={() => { setFilter("all"); setSearch(""); }}
      />

      <div className="flex items-center gap-1.5 mb-4">
        {([["all", "All"], ["low", `Low (${lowCount})`], ["out", `Out (${outCount})`]] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              filter === k
                ? "bg-navy-900 text-brand-yellow dark:bg-navy-800"
                : "bg-white dark:bg-navy-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-navy-700 hover:border-slate-300"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Nothing matches those filters.
          </div>
        ) : (
          <DataTable columns={columns} data={filtered} pageSize={15} />
        )}
      </Card>
    </>
  );
}

function Stat({ label, value, loading, tone }: { label: string; value: string; loading: boolean; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      {loading ? <Skeleton className="h-8 w-20 mt-1" />
               : <div className={`text-2xl tabular font-bold mt-1 ${tone ?? "text-navy-900 dark:text-white"}`}>{value}</div>}
    </Card>
  );
}
