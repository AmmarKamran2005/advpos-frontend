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
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader, useSession } from "@/components/providers/session-provider";
import { itemHref } from "@/lib/item-links";
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
  locationKind: string;
  cityId: number;
  cityName: string;
  qty: number;
  packets: number;
  loose: number;
  value: number;
  status: "out" | "low" | "over" | "ok";
};

type CityStock = { cityId: number; city: string; units: number; value: number; locations: number };

type StockResponse = {
  totalValue: number;
  totalUnits: number;
  byCity: CityStock[];
  items: StockRow[];
};

type LocationRef = {
  id: number; code: string; name: string;
  kind: string; kindLabel: string; cityId: number; city: string;
};

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

/* WHERE THE STOCK IS, AS THE BUSINESS THINKS OF IT.

   The business keeps goods by CITY, not by shelf: Karachi has a warehouse and
   an order department, Lahore has its own pair, and "how much do we hold in
   Lahore" means both of them added together. This screen could only ever show
   every location side by side, which answers a different question and gets
   harder to read with every city added.

   So the filter is the city, with "Whole system" as the default -- the
   combined figure, which is the other half of what the owner needs. The
   per-location columns stay, because inside a city it still matters whether
   something is on the warehouse shelf or already at the order desk; there are
   simply fewer of them once a city is chosen. */
const WHOLE_SYSTEM = 0;

export default function StockLevelsPage() {
  const { can } = useSession();
  const [rows, setRows] = React.useState<StockRow[]>([]);
  const [locations, setLocations] = React.useState<LocationRef[]>([]);
  const [byCity, setByCity] = React.useState<CityStock[]>([]);
  const [totals, setTotals] = React.useState({ totalValue: 0, totalUnits: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "low" | "out">("all");
  const [cityId, setCityId] = React.useState<number>(WHOLE_SYSTEM);

  const load = React.useCallback(async () => {
    try {
      /* The CITY is a server-side filter, not a client one. Rule 3 of
         AGENTS.md: this business has 957 items across five locations today and
         will have more of both -- pulling every balance and hiding most of them
         in the browser is the shape that stops working quietly. */
      const [stock, lookups] = await Promise.all([
        axios.get<StockResponse>(`${API_BASE_URL}/inventory/stock-levels`, {
          params: cityId === WHOLE_SYSTEM ? undefined : { cityId },
          headers: authHeader(),
        }),
        axios.get<{ locations: LocationRef[] }>(`${API_BASE_URL}/inventory/lookups`, { headers: authHeader() }),
      ]);
      setRows(stock.data.items);
      setTotals({ totalValue: stock.data.totalValue, totalUnits: stock.data.totalUnits });
      setByCity(stock.data.byCity ?? []);
      setLocations(lookups.data.locations);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load stock levels."));
    } finally {
      setLoading(false);
    }
  }, [cityId]);

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

  /* One column per shelf IN THE CHOSEN CITY. Showing Lahore's warehouse beside
     Karachi's while the figures are Karachi-only would print a column of
     zeroes and invite somebody to read it as "Lahore is empty". */
  const shownLocations = React.useMemo(
    () => (cityId === WHOLE_SYSTEM ? locations : locations.filter((l) => l.cityId === cityId)),
    [locations, cityId]
  );

  const cityLabel =
    cityId === WHOLE_SYSTEM
      ? "the whole system"
      : byCity.find((c) => c.cityId === cityId)?.city
        ?? locations.find((l) => l.cityId === cityId)?.city
        ?? "this city";

  const columns: Column<PivotRow>[] = [
    {
      key: "name",
      header: "Product",
      sortable: true,
      cell: (r) => (
        <div>
          <Link
            href={itemHref(can, r.productId)}
            className="text-sm font-medium text-navy-900 dark:text-white hover:text-brand-yellow-700 dark:hover:text-brand-yellow"
          >
            {r.name}
          </Link>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular">{r.sku}</div>
        </div>
      ),
    },
    ...shownLocations.map<Column<PivotRow>>((loc) => ({
      key: `loc-${loc.id}`,
      header: (
        <div className="text-right">
          <div>{loc.name}</div>
          <div className="text-2xs font-normal opacity-60 tabular">
            {cityId === WHOLE_SYSTEM ? loc.city : loc.kindLabel}
          </div>
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
        breadcrumbs={[{ label: "Inventory" }, { label: "Stock in Hand" }]}
        title="Stock in Hand"
        subtitle={`What is on each shelf in ${cityLabel}, and what it is worth`}
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="stock-city" className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              Show
            </label>
            <SelectNative
              id="stock-city"
              className="min-w-52"
              value={String(cityId)}
              onChange={(e) => { setLoading(true); setCityId(Number(e.target.value)); }}
            >
              <option value={WHOLE_SYSTEM}>
                Whole system &mdash; every city combined
              </option>
              {byCity.map((c) => (
                <option key={c.cityId} value={c.cityId}>
                  {c.city} &mdash; {c.units.toLocaleString()} units
                  {c.locations > 1 ? ` across ${c.locations} places` : ""}
                </option>
              ))}
            </SelectNative>
          </div>
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
        <Stat label="Products stocked" loading={loading} value={String(pivot.length)} />
        <Stat
          label={cityId === WHOLE_SYSTEM ? "Units on hand \u2014 all cities" : `Units on hand \u2014 ${cityLabel}`}
          loading={loading}
          value={totals.totalUnits.toLocaleString()}
        />
        <Stat label="Stock value" loading={loading} value={formatCompact(totals.totalValue)} />
        <Stat label="Low / Out" loading={loading} value={`${lowCount} / ${outCount}`} tone={outCount > 0 ? "text-danger" : "text-warning"} />
      </div>

      {/* Every city, always, whatever the filter is set to. A breakdown that
          moves when you pick one of its own rows is a breakdown nobody can
          read -- and comparing two towns is most of why anybody opens this. */}
      {byCity.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {byCity.map((c) => (
            <button
              key={c.cityId}
              type="button"
              onClick={() => { setLoading(true); setCityId(cityId === c.cityId ? WHOLE_SYSTEM : c.cityId); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs transition-colors border",
                cityId === c.cityId
                  ? "bg-navy-900 text-brand-yellow border-navy-900 dark:bg-navy-800 dark:border-navy-700"
                  : "bg-white dark:bg-navy-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-navy-700 hover:border-slate-300"
              )}
            >
              <span className="font-semibold">{c.city}</span>
              <span className="tabular opacity-70"> &middot; {c.units.toLocaleString()} units</span>
              <span className="tabular opacity-70"> &middot; {formatCompact(c.value)}</span>
            </button>
          ))}
        </div>
      )}

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
            {cityId === WHOLE_SYSTEM
              ? "Nothing matches those filters."
              : `Nothing matches those filters in ${cityLabel}.`}
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
