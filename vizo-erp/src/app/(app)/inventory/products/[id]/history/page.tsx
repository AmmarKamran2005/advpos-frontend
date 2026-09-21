"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Download, Loader2, AlertCircle, RefreshCw, MapPin, BookOpen, ListTree } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader, useSession } from "@/components/providers/session-provider";
import { ProductImage } from "@/components/products/product-image";
import { itemHref, itemsCrumb } from "@/lib/item-links";
import { downloadXlsx, exportError } from "@/lib/export";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  HistoryTimeline, HistorySummaryTiles,
  type HistoryEvent, type HistoryGroup, type HistorySummary,
} from "@/components/inventory/product-history";

/* ───────────────────────────────────────────────────────────────────────────
   THE WHOLE LIFE OF ONE PRODUCT

   Two readings of the same facts, one tab each:

     Timeline      what happened, in words -- ordered from the supplier,
                   received, customer ordered, confirmed, picked up by the
                   warehouse, packed, dispatched, delivered, returned, moved,
                   corrected. Filterable by kind.

     Stock ledger  the accounting reading: opening balance, every unit in and
                   out, and the running total, so on-hand can be proved rather
                   than taken on trust.

   Both page on the server (AGENTS.md rule 3): a product that has been sold for
   five years has thousands of lines, and "Show more" asks for the next thirty
   rather than holding them all. The export is everything, on seven tabs.
   ─────────────────────────────────────────────────────────────────────────── */

type Head = {
  id: number; sku: string; name: string; imageUrl: string | null;
  category: string; brand: string; packing: number;
  costPrice: number; dutyPrice: number; marginPrice: number; salePrice: number;
  createdAt: string; isActive: boolean;
};

type HistoryPage = {
  product: Head; summary: HistorySummary; groups: HistoryGroup[];
  total: number; page: number; pageSize: number; items: HistoryEvent[];
};

type LedgerRow = {
  movementId: number; at: string; type: string; typeName: string;
  reference: string | null; url: string | null; location: string;
  qtyIn: number; qtyOut: number; balanceAtLocation: number; runningTotal: number;
  rate: number | null; value: number | null; by: string | null;
};

type LedgerPage = {
  opening: number; totalIn: number; totalOut: number; onHand: number;
  total: number; page: number; pageSize: number; items: LedgerRow[];
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const PAGE = 30;

export default function ProductHistoryPage() {
  const { can } = useSession();
  const params = useParams<{ id: string }>();
  const productId = parseInt(params.id ?? "0", 10);

  const [head, setHead] = React.useState<Head | null>(null);
  const [summary, setSummary] = React.useState<HistorySummary | null>(null);
  const [groups, setGroups] = React.useState<HistoryGroup[]>([]);
  const [events, setEvents] = React.useState<HistoryEvent[]>([]);
  const [total, setTotal] = React.useState(0);
  const [group, setGroup] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const load = React.useCallback(async (g: string, p: number) => {
    setLoading(true);
    try {
      const res = await axios.get<HistoryPage>(`${API_BASE_URL}/inventory/products/${productId}/history`, {
        params: { group: g || undefined, page: p, pageSize: PAGE }, headers: authHeader(),
      });
      setHead(res.data.product);
      setSummary(res.data.summary);
      if (!g) setGroups(res.data.groups);
      setEvents((prev) => (p === 1 ? res.data.items : [...prev, ...res.data.items]));
      setTotal(res.data.total);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the history."));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- axios inside the page is the brief */
    void load(group, 1);
  }, [load, group]);

  async function exportAll() {
    setExporting(true);
    try {
      await downloadXlsx(`inventory/products/${productId}/history/export`, {}, `product-${productId}-history.xlsx`);
      toast.success("History exported", { description: "Summary, timeline, stock ledger, purchases, sales and transfers — one tab each." });
    } catch (e) {
      toast.error("Could not export", { description: await exportError(e) });
    } finally {
      setExporting(false);
    }
  }

  if (loading && !head) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error && !head) {
    return (
      <EmptyState icon={AlertCircle} title="Could not load the history" description={error}
        action={<Button variant="accent" onClick={() => void load(group, 1)}><RefreshCw />Try again</Button>} />
    );
  }

  if (!head || !summary) return null;

  const all = groups.reduce((s, g) => s + g.count, 0);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Inventory" },
          itemsCrumb(can),
          { label: head.name, href: itemHref(can, productId) },
          { label: "History" },
        ]}
        title={
          <div className="flex items-center gap-3 min-w-0">
            <ProductImage url={head.imageUrl} name={head.name} size="lg" />
            <div className="min-w-0">
              <div className="truncate">History</div>
              <div className="text-xs font-normal text-slate-500 dark:text-slate-400 truncate">
                {head.name} · <span className="tabular">{head.sku}</span>
              </div>
            </div>
          </div>
        }
        subtitle={`In the catalogue since ${formatDate(head.createdAt)} · ${head.category} · ${head.brand}`}
        actions={
          <>
            <Button variant="ghost" asChild><Link href={itemHref(can, productId)}><ArrowLeft /><span className="hidden sm:inline">{can("products.view") ? "Product" : "Stock History"}</span></Link></Button>
            <Button variant="accent" className="gap-1.5" onClick={exportAll} disabled={exporting}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download />}
              <span>Export Excel</span>
            </Button>
          </>
        }
      />

      <HistorySummaryTiles s={summary} />

      {summary.byLocation.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.byLocation.map((l) => (
            <span key={l.location} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs dark:border-navy-700 dark:bg-navy-800">
              <MapPin className="size-3 text-slate-400" />
              <span className="text-navy-900 dark:text-white">{l.location}</span>
              <span className="tabular font-bold text-navy-900 dark:text-white">{l.qty}</span>
            </span>
          ))}
        </div>
      )}

      <Tabs defaultValue="timeline" className="mt-6 w-full">
        <TabsList className="overflow-x-auto scrollbar-thin flex-nowrap">
          <TabsTrigger value="timeline" className="gap-1.5"><ListTree className="size-4" /> Timeline</TabsTrigger>
          <TabsTrigger value="ledger" className="gap-1.5"><BookOpen className="size-4" /> Stock ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          {groups.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
              <GroupChip active={!group} label="Everything" count={all} onClick={() => { setGroup(""); setPage(1); }} />
              {groups.map((g) => (
                <GroupChip key={g.key} active={group === g.key} label={g.label} count={g.count}
                  onClick={() => { setGroup(g.key); setPage(1); }} />
              ))}
            </div>
          )}

          <div className={cn(loading && "opacity-60 transition-opacity")}>
            <HistoryTimeline events={events} />
          </div>

          {events.length < total && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" className="gap-1.5" disabled={loading}
                onClick={() => { const next = page + 1; setPage(next); void load(group, next); }}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Show more ({total - events.length} older)
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ledger">
          <StockLedger productId={productId} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function GroupChip({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-navy-900 bg-navy-900 text-brand-yellow dark:border-navy-700 dark:bg-navy-800"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-300"
      )}>
      {label}<span className="ml-1.5 tabular font-bold">{count}</span>
    </button>
  );
}

/* ─────────────────────────── the stock ledger ─────────────────────────── */

/**
 * Opening + in − out = on hand, shown as the equation first and then line by
 * line. A table on a desk, cards on a phone -- the same rows either way.
 */
function StockLedger({ productId }: { productId: number }) {
  const [data, setData] = React.useState<LedgerPage | null>(null);
  const [rows, setRows] = React.useState<LedgerRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await axios.get<LedgerPage>(`${API_BASE_URL}/inventory/products/${productId}/ledger`, {
        params: { page: p, pageSize: PAGE }, headers: authHeader(),
      });
      setData(res.data);
      setRows((prev) => (p === 1 ? res.data.items : [...prev, ...res.data.items]));
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the stock ledger."));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- axios inside the page is the brief */
    void load(1);
  }, [load]);

  if (error) {
    return (
      <Card className="p-4 border-danger/40 flex items-center gap-3">
        <AlertCircle className="size-5 text-danger shrink-0" />
        <div className="flex-1 text-sm font-medium text-navy-900 dark:text-white">{error}</div>
        <Button variant="secondary" size="sm" onClick={() => void load(1)}>Try again</Button>
      </Card>
    );
  }

  if (!data) return <Skeleton className="h-72" />;

  const balanced = data.opening + data.totalIn - data.totalOut === data.onHand;

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <Eq label="Opening" hint="before records began" value={data.opening} />
            <Eq label="In" value={data.totalIn} tone="text-success" sign="+" />
            <Eq label="Out" value={data.totalOut} tone="text-danger" sign="−" />
            <Eq label="On hand" value={data.onHand} strong />
          </div>
          <p className={cn("mt-3 text-center text-xs", balanced ? "text-success" : "text-danger")}>
            {balanced
              ? `${data.opening} + ${data.totalIn} − ${data.totalOut} = ${data.onHand}. The ledger balances.`
              : "The ledger does not balance against the shelves — a stock count is worth doing."}
          </p>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">No stock has moved yet.</Card>
      ) : (
        <>
          {/* desk */}
          <Card className="hidden md:block p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-navy-700/50 text-left text-2xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-2 font-semibold">Date</th>
                    <th className="px-4 py-2 font-semibold">Movement</th>
                    <th className="px-4 py-2 font-semibold">Reference</th>
                    <th className="px-4 py-2 font-semibold">Location</th>
                    <th className="px-4 py-2 font-semibold text-right">In</th>
                    <th className="px-4 py-2 font-semibold text-right">Out</th>
                    <th className="px-4 py-2 font-semibold text-right">At location</th>
                    <th className="px-4 py-2 font-semibold text-right">Total</th>
                    <th className="px-4 py-2 font-semibold text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                  {rows.map((r) => (
                    <tr key={r.movementId} className="hover:bg-slate-50 dark:hover:bg-navy-700/40">
                      <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatDate(r.at)}<div className="text-2xs text-slate-400">{formatTime(r.at)}</div>
                      </td>
                      <td className="px-4 py-2.5 text-navy-900 dark:text-white">
                        <Link href={`/inventory/products/${productId}/movements/${r.movementId}`} className="hover:underline">{r.typeName}</Link>
                        {r.by && <div className="text-2xs text-slate-400">{r.by}</div>}
                      </td>
                      <td className="px-4 py-2.5 tabular text-xs">
                        {r.url ? <Link href={r.url} className="font-medium text-navy-900 dark:text-white hover:underline">{r.reference}</Link> : r.reference ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300">{r.location}</td>
                      <td className="px-4 py-2.5 text-right tabular font-semibold text-success">{r.qtyIn || ""}</td>
                      <td className="px-4 py-2.5 text-right tabular font-semibold text-danger">{r.qtyOut || ""}</td>
                      <td className="px-4 py-2.5 text-right tabular text-slate-600 dark:text-slate-300">{r.balanceAtLocation}</td>
                      <td className="px-4 py-2.5 text-right tabular font-bold text-navy-900 dark:text-white">{r.runningTotal}</td>
                      <td className="px-4 py-2.5 text-right tabular text-xs text-slate-500 dark:text-slate-400">{r.rate !== null ? formatMoney(r.rate) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* phone */}
          <div className="md:hidden space-y-2">
            {rows.map((r) => (
              <Link key={r.movementId} href={`/inventory/products/${productId}/movements/${r.movementId}`} className="block">
                <Card className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-navy-900 dark:text-white">{r.typeName}</div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400">
                        {formatDate(r.at)} · {formatTime(r.at)} · <span className="tabular">{r.reference ?? "—"}</span>
                      </div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">{r.location}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={cn("tabular font-bold", r.qtyIn ? "text-success" : "text-danger")}>
                        {r.qtyIn ? `+${r.qtyIn}` : `−${r.qtyOut}`}
                      </div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400">total <b className="tabular text-navy-900 dark:text-white">{r.runningTotal}</b></div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {rows.length < data.total && (
            <div className="flex justify-center">
              <Button variant="secondary" className="gap-1.5" disabled={loading}
                onClick={() => { const next = page + 1; setPage(next); void load(next); }}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Show more ({data.total - rows.length} older)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Eq({ label, value, hint, tone, sign, strong }: {
  label: string; value: number; hint?: string; tone?: string; sign?: string; strong?: boolean;
}) {
  return (
    <div className="rounded-lg bg-slate-50 dark:bg-navy-900 px-2 py-3">
      <div className="text-2xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cn("tabular font-bold", strong ? "text-2xl" : "text-xl", tone ?? "text-navy-900 dark:text-white")}>
        {sign && value ? sign : ""}{value.toLocaleString()}
      </div>
      {hint && <div className="text-2xs text-slate-400">{hint}</div>}
    </div>
  );
}
