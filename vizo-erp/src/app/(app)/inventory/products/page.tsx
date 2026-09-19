"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  Plus, Download, LayoutGrid, List, Barcode, Package, Loader2, AlertCircle, MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { Card } from "@/components/ui/card";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Pager } from "@/components/ui/pager";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { downloadXlsx, exportError } from "@/lib/export";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /inventory/products -> { total, page, pageSize, stats, items }.
   status and totalStock are computed by the API from StockBalance across every
   location -- stock is never stored on the product row. `stats` covers the
   whole catalogue, not the page, so the counts do not change on Next. */
type Product = {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  categoryId: number;
  categoryName: string;
  brandId: number;
  brandName: string;
  packing: number;
  minQty: number;
  maxQty: number;
  costPrice: number;
  dutyPrice: number;
  marginPrice: number;
  marginPercent: number;
  salePrice: number;
  taxRatePercent: number;
  hideStock: boolean;
  isActive: boolean;
  imageUrl: string | null;
  createdAt: string;
  totalStock: number;
  barcodes: string[];
  status: "active" | "low" | "out" | "inactive";
};

type Stats = { total: number; active: number; low: number; out: number; inactive: number; stockValue: number };
type ProductPage = { total: number; page: number; pageSize: number; stats: Stats; items: Product[] };

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const STATUS_PILL: Record<Product["status"], { label: string; variant: "success" | "warning" | "danger" | "muted" }> = {
  active:   { label: "In stock",     variant: "success" },
  low:      { label: "Low stock",    variant: "warning" },
  out:      { label: "Out of stock", variant: "danger"  },
  inactive: { label: "Inactive",     variant: "muted"   },
};

const PAGE_SIZE = 24;
const VIEW_KEY = "vizo.products.view";

export default function ProductsPage() {
  const [data, setData] = React.useState<ProductPage | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<"" | Product["status"]>("");
  const [page, setPage] = React.useState(1);

  /* Cards by default -- the brief asks for them, and on a phone a table of
     six columns is a sideways scroll. The table is still one click away for
     somebody comparing prices down a column; the choice is remembered on this
     device only. */
  const [view, setView] = React.useState<"grid" | "table">("grid");
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_KEY);
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a per-device preference */
      if (saved === "table" || saved === "grid") setView(saved);
    } catch { /* storage can be blocked; the default stands */ }
  }, []);
  function chooseView(v: "grid" | "table") {
    setView(v);
    try { window.localStorage.setItem(VIEW_KEY, v); } catch { /* not important */ }
  }

  /* Search goes to the server, 300 ms after typing stops. */
  React.useEffect(() => {
    const t = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<ProductPage>(`${API_BASE_URL}/inventory/products`, {
        params: { q: query || undefined, status: status || undefined, page, pageSize: PAGE_SIZE },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the product list."));
    } finally {
      setLoading(false);
    }
  }, [query, status, page]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const rows = data?.items ?? [];
  const stats = data?.stats;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const [exporting, setExporting] = React.useState(false);
  async function exportXlsx() {
    setExporting(true);
    try {
      await downloadXlsx("inventory/products/export", { q: query || undefined, status: status || undefined }, "products.xlsx");
      toast.success("Export ready", { description: "Products downloaded as a spreadsheet." });
    } catch (e) {
      toast.error("Could not export", { description: await exportError(e) });
    } finally {
      setExporting(false);
    }
  }

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      cell: (p) => (
        <div className="flex items-center gap-2.5">
          <Thumb url={p.imageUrl} alt={p.name} className="size-10" />
          <div className="min-w-0">
            <div className="font-medium text-navy-900 dark:text-white truncate">{p.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 tabular">{p.sku}</div>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (p) => (
        <div>
          <div className="text-xs font-medium text-navy-900 dark:text-white">{p.categoryName}</div>
          <div className="text-2xs text-slate-500 dark:text-slate-400">{p.brandName}</div>
        </div>
      ),
    },
    {
      key: "salePrice",
      header: "Sale Price",
      align: "right",
      cell: (p) => (
        <div className="text-right">
          <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(p.salePrice)}</div>
          <div className="text-2xs text-slate-500 dark:text-slate-400">
            Landed {formatMoney(p.costPrice + p.dutyPrice)} · {p.marginPercent.toFixed(1)}%
          </div>
        </div>
      ),
    },
    {
      key: "totalStock",
      header: "Stock",
      align: "right",
      cell: (p) => (
        <div className="text-right">
          <div className={cn("tabular text-sm font-semibold",
            p.status === "out" ? "text-danger" : p.status === "low" ? "text-warning" : "text-navy-900 dark:text-white")}>
            {p.totalStock}
          </div>
          <div className="text-2xs text-slate-500 dark:text-slate-400">RP {p.minQty}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => <StatusPill variant={STATUS_PILL[p.status].variant}>{STATUS_PILL[p.status].label}</StatusPill>,
    },
  ];

  const chips: { key: "" | Product["status"]; label: string; count?: number; tone: string }[] = [
    { key: "", label: "All", count: stats?.total, tone: "" },
    { key: "active", label: "In stock", count: stats?.active, tone: "text-success" },
    { key: "low", label: "Low", count: stats?.low, tone: "text-warning" },
    { key: "out", label: "Out", count: stats?.out, tone: "text-danger" },
    { key: "inactive", label: "Inactive", count: stats?.inactive, tone: "text-slate-500" },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Products" }]}
        title="Products"
        subtitle={stats ? `${stats.total} products · stock worth ${formatCompact(stats.stockValue)} at landed cost` : "VIZO mobile accessories"}
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5" onClick={exportXlsx} disabled={exporting}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download />}
              <span className="hidden sm:inline">{exporting ? "Exporting…" : "Export"}</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/inventory/products/new"><Plus /><span>New Product</span></Link>
            </Button>
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

      {/* Status chips double as the stats, and as the filter. */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {chips.map((c) => (
          <button
            key={c.key || "all"}
            type="button"
            onClick={() => { setStatus(c.key); setPage(1); }}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              status === c.key
                ? "border-navy-900 bg-navy-900 text-brand-yellow dark:border-navy-700 dark:bg-navy-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-300"
            )}
          >
            {c.label}
            {c.count !== undefined && (
              <span className={cn("ml-1.5 tabular font-bold", status === c.key ? "" : c.tone)}>{c.count}</span>
            )}
          </button>
        ))}
      </div>

      <FilterBar
        searchPlaceholder="Search by name, SKU or barcode…"
        searchValue={search}
        onSearchChange={setSearch}
        extraActions={
          <div className="flex items-center bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-lg p-0.5">
            {([["grid", LayoutGrid, "Cards"], ["table", List, "Table"]] as const).map(([v, Icon, label]) => (
              <button
                key={v}
                onClick={() => chooseView(v)}
                className={cn("p-1.5 rounded-md transition-colors",
                  view === v
                    ? "bg-navy-900 text-brand-yellow dark:bg-navy-700 dark:text-brand-yellow"
                    : "text-slate-500 hover:text-navy-900 dark:hover:text-white")}
                title={label}
                aria-label={`${label} view`}
                aria-pressed={view === v}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        }
      />

      {loading && !data ? (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="p-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-6 w-1/3" /></div>
            </Card>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center">
          <Package className="mx-auto size-10 text-slate-300 dark:text-navy-600" />
          <div className="mt-3 text-sm font-medium text-navy-900 dark:text-white">No products match</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try a different search or status.</div>
        </Card>
      ) : view === "table" ? (
        <Card className="p-0 overflow-hidden">
          <DataTable columns={columns} data={rows} pageSize={PAGE_SIZE} rowHref={(p) => `/inventory/products/${p.id}`} />
          <Pager page={page} pageCount={pageCount} total={data?.total ?? 0} noun="products" onPage={setPage} disabled={loading} />
        </Card>
      ) : (
        <>
          <div className={cn("grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 transition-opacity", loading && "opacity-60")}>
            {rows.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
          <Card className="mt-4 p-0 overflow-hidden">
            <Pager page={page} pageCount={pageCount} total={data?.total ?? 0} noun="products" onPage={setPage} disabled={loading} />
          </Card>
        </>
      )}
    </>
  );
}

/* ─────────────────────────── one product ─────────────────────────── */

function ProductCard({ p }: { p: Product }) {
  const pill = STATUS_PILL[p.status];
  const landed = p.costPrice + p.dutyPrice;

  return (
    <Link
      href={`/inventory/products/${p.id}`}
      className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
    >
      <Card className="h-full overflow-hidden transition-all group-hover:border-brand-yellow/50 group-hover:shadow-md">
        {/* The picture, big. White behind it because product shots are cut out
            on white, and contain rather than cover so a tall box is not cropped. */}
        <div className="relative aspect-[4/3] bg-white dark:bg-navy-900 border-b border-slate-100 dark:border-navy-700">
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.imageUrl}
              alt={p.name}
              loading="lazy"
              className="absolute inset-0 size-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-300 dark:text-navy-600">
              <Package className="size-14" />
              <span className="text-2xs">No image yet</span>
            </div>
          )}
          <div className="absolute left-2 top-2">
            <StatusPill variant={pill.variant}>{pill.label}</StatusPill>
          </div>
        </div>

        <div className="p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="muted" className="text-2xs">{p.brandName}</Badge>
            <Badge variant="info" className="text-2xs">{p.categoryName}</Badge>
          </div>

          <div className="mt-2 text-sm font-semibold leading-snug text-navy-900 dark:text-white line-clamp-2 min-h-[2.5rem]">
            {p.name}
          </div>
          <div className="mt-0.5 text-2xs tabular text-slate-500 dark:text-slate-400 truncate">{p.sku}</div>

          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <div className="tabular text-lg font-bold text-navy-900 dark:text-white">{formatMoney(p.salePrice)}</div>
              <div className="text-2xs text-slate-500 dark:text-slate-400 tabular">
                Landed {formatMoney(landed)}
              </div>
            </div>
            <div className={cn("text-right tabular text-xs font-semibold",
              p.marginPercent <= 0 ? "text-danger" : p.marginPercent < 15 ? "text-warning" : "text-success")}>
              {p.marginPercent.toFixed(1)}%
              <div className="text-2xs font-normal text-slate-500 dark:text-slate-400">margin</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center dark:border-navy-700">
            <Fact label="Stock" value={String(p.totalStock)}
              tone={p.status === "out" ? "text-danger" : p.status === "low" ? "text-warning" : undefined} />
            <Fact label="Reorder" value={String(p.minQty)} />
            <Fact label="Pack" value={`${p.packing}`} />
          </div>

          <div className="mt-2 flex items-center gap-3 text-2xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1"><Barcode className="size-3" />{p.barcodes.length} barcode{p.barcodes.length === 1 ? "" : "s"}</span>
            {p.hideStock && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />Stock hidden from reps</span>}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className={cn("tabular text-sm font-bold text-navy-900 dark:text-white", tone)}>{value}</div>
      <div className="text-2xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

function Thumb({ url, alt, className }: { url: string | null; alt: string; className?: string }) {
  return (
    <div className={cn("rounded-lg bg-white dark:bg-navy-700 border border-slate-100 dark:border-navy-700 flex items-center justify-center flex-shrink-0 overflow-hidden", className)}>
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt={alt} loading="lazy" className="size-full object-contain p-0.5" />
        : <Package className="size-4 text-slate-400" />}
    </div>
  );
}
