"use client";

import * as React from "react";
import axios from "axios";
import { ShoppingCart, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReportStat, ReportError, NumCell, HeadCell, Mini, apiMessage } from "@/components/widgets/report-bits";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact } from "@/lib/format";
import { todayISO } from "@/lib/dates";

/* GET /reports/sales-by-product?from=&to=&categoryId=&q= (SalesReportsController).

   Units, sales, average price and returns per product, and rolled up per
   category. COST AND PROFIT are sent to the Super Admin only -- for everybody
   else the fields are not in the answer at all (`showsCost` false), so this
   page has nothing to hide; it simply renders what arrived. A rep is sent his
   own invoices' products only. */
type ProductRow = {
  id: number;
  sku: string;
  name: string;
  category: string;
  brand: string;
  invoices: number;
  units: number;
  returnedUnits: number;
  netUnits: number;
  grossSales: number;
  returnedValue: number;
  netSales: number;
  averagePrice: number;
  cost?: number;
  profit?: number;
  marginPercent?: number;
};

type CategoryRow = {
  category: string;
  products: number;
  units: number;
  returnedUnits: number;
  netUnits: number;
  grossSales: number;
  returnedValue: number;
  netSales: number;
  cost?: number;
  profit?: number;
};

type Report = {
  from: string;
  to: string;
  scopedToRep: boolean;
  showsCost: boolean;
  count: number;
  units: number;
  returnedUnits: number;
  grossSales: number;
  returnedValue: number;
  netSales: number;
  cost?: number;
  profit?: number;
  categories: { id: number; name: string }[];
  byCategory: CategoryRow[];
  items: ProductRow[];
};

const PAGE = 30;

export default function SalesByProductPage() {
  const [from, setFrom] = React.useState(() => `${todayISO().slice(0, 8)}01`);
  const [to, setTo] = React.useState(() => todayISO());
  const [categoryId, setCategoryId] = React.useState<number | null>(null);
  const [query, setQuery] = React.useState("");
  const [applied, setApplied] = React.useState("");
  const [shown, setShown] = React.useState(PAGE);
  const [data, setData] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => { setApplied(query.trim()); setShown(PAGE); }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Report>(`${API_BASE_URL}/reports/sales-by-product`, {
        params: { from, to, categoryId: categoryId ?? undefined, q: applied || undefined },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not build sales by product."));
    } finally {
      setLoading(false);
    }
  }, [from, to, categoryId, applied]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const cost = Boolean(data?.showsCost);
  const rows = data?.items ?? [];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Sales by Product" }]}
        title="Sales by Product"
        subtitle={`${data?.scopedToRep ? "Your invoices" : "Invoiced sales"} — ${from} to ${to}`}
        actions={
          <ReportToolbar
            mode="range"
            reportName="Sales by Product"
            fromDate={from}
            toDate={to}
            onRangeChange={(f, t) => { setFrom(f); setTo(t); setShown(PAGE); }}
            doc={{ family: "report", key: "sales-by-product" }}
            docParams={{ categoryId, q: applied || undefined }}
            exportPath="reports/sales-by-product/export"
          />
        }
      />

      {error && <ReportError message={error} onRetry={() => void load()} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <ReportStat label="Net sales" loading={loading} value={formatCompact(data?.netSales ?? 0)} sub={`${data?.count ?? 0} items`} />
        <ReportStat label="Units sold" loading={loading} value={(data?.units ?? 0).toLocaleString()} sub={`${data?.returnedUnits ?? 0} returned`} />
        <ReportStat label="Returns" loading={loading} value={formatCompact(data?.returnedValue ?? 0)} tone="text-danger" />
        {cost ? (
          <ReportStat label="Profit" loading={loading} value={formatCompact(data?.profit ?? 0)} tone="text-success"
            sub={`on cost of ${formatCompact(data?.cost ?? 0)}`} />
        ) : (
          <ReportStat label="Average price" loading={loading}
            value={formatMoney(data && data.units ? data.grossSales / data.units : 0)} sub="per unit sold" />
        )}
      </div>

      <Card className="mb-4">
        <CardBody className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Item name or SKU" className="pl-9" />
          </div>
          <SelectNative value={categoryId === null ? "" : String(categoryId)} className="sm:w-56" aria-label="Category"
            onChange={(e) => { setCategoryId(e.target.value ? Number(e.target.value) : null); setShown(PAGE); }}>
            <option value="">All categories</option>
            {(data?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectNative>
        </CardBody>
      </Card>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">By product</TabsTrigger>
          <TabsTrigger value="categories">By category</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card className="p-0 overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
            ) : rows.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="Nothing sold" description="No invoice lines in this range and filter." />
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto scrollbar-thin">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-navy-700/50 border-b border-slate-200 dark:border-navy-700">
                        <HeadCell left>Item</HeadCell>
                        <HeadCell>Units</HeadCell>
                        <HeadCell>Returned</HeadCell>
                        <HeadCell>Avg price</HeadCell>
                        <HeadCell>Sales</HeadCell>
                        <HeadCell>Returns</HeadCell>
                        <HeadCell>Net sales</HeadCell>
                        {cost && <HeadCell>Cost</HeadCell>}
                        {cost && <HeadCell>Profit</HeadCell>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                      {rows.slice(0, shown).map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-navy-800">
                          <td className="px-3 py-2.5 max-w-[280px]">
                            <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{r.name}</div>
                            <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">{r.sku} · {r.category}</div>
                          </td>
                          <NumCell v={r.units} count />
                          <NumCell v={r.returnedUnits} count className="text-danger" />
                          <NumCell v={r.averagePrice} />
                          <NumCell v={r.grossSales} />
                          <NumCell v={r.returnedValue} className="text-danger" />
                          <NumCell v={r.netSales} bold />
                          {cost && <NumCell v={r.cost ?? 0} />}
                          {cost && <NumCell v={r.profit ?? 0} className={(r.profit ?? 0) < 0 ? "text-danger" : "text-success"} />}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-slate-100 dark:divide-navy-700">
                  {rows.slice(0, shown).map((r) => (
                    <div key={r.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-navy-900 dark:text-white truncate">{r.name}</div>
                          <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">{r.sku} · {r.category}</div>
                        </div>
                        <span className="tabular text-sm font-bold text-navy-900 dark:text-white shrink-0">{formatMoney(r.netSales)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <Mini label="Units" value={r.units.toLocaleString()} />
                        <Mini label="Returned" value={String(r.returnedUnits)} tone={r.returnedUnits ? "text-danger" : undefined} />
                        <Mini label="Avg price" value={formatCompact(r.averagePrice)} />
                        {cost && <Mini label="Cost" value={formatCompact(r.cost ?? 0)} />}
                        {cost && <Mini label="Profit" value={formatCompact(r.profit ?? 0)} tone="text-success" />}
                      </div>
                    </div>
                  ))}
                </div>

                {rows.length > shown && (
                  <div className="p-3 border-t border-slate-100 dark:border-navy-700 text-center">
                    <button type="button" className="text-sm font-medium text-brand-yellow-700 dark:text-brand-yellow hover:underline"
                      onClick={() => setShown((n) => n + PAGE)}>
                      Show {Math.min(PAGE, rows.length - shown)} more of {rows.length - shown}
                    </button>
                  </div>
                )}
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card className="p-0 overflow-hidden">
            {loading ? <div className="p-4"><Skeleton className="h-40" /></div> : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-navy-700/50 border-b border-slate-200 dark:border-navy-700">
                      <HeadCell left>Category</HeadCell>
                      <HeadCell>Items</HeadCell>
                      <HeadCell>Units</HeadCell>
                      <HeadCell>Returns</HeadCell>
                      <HeadCell>Net sales</HeadCell>
                      {cost && <HeadCell>Profit</HeadCell>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    {(data?.byCategory ?? []).map((c) => (
                      <tr key={c.category}>
                        <td className="px-3 py-2.5 text-sm font-medium text-navy-900 dark:text-white">{c.category}</td>
                        <NumCell v={c.products} count />
                        <NumCell v={c.units} count />
                        <NumCell v={c.returnedValue} className="text-danger" />
                        <NumCell v={c.netSales} bold />
                        {cost && <NumCell v={c.profit ?? 0} className="text-success" />}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
