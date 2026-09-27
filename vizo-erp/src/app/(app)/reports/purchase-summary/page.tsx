"use client";

import * as React from "react";
import axios from "axios";
import Link from "next/link";
import { Truck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card, CardBody } from "@/components/ui/card";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReportStat, ReportError, NumCell, HeadCell, Mini, apiMessage } from "@/components/widgets/report-bits";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";
import { todayISO } from "@/lib/dates";

/* GET /reports/purchase-summary?from=&to=&supplierId= (PurchaseReportsController).
   SUPER ADMIN ONLY -- every figure on it is a purchase price (the owner, 26 Sep:
   "koi bhi item kitne mein khareeda hai ... kisi bhi role ko nahi dikhni
   chahiye"). proxy.ts sends anybody else to /forbidden before this renders,
   and the API answers them 403.

   Built on migration 26's lot model: every purchase-order line carries its
   unit cost and the four parts on top of it -- duty, Fi Sabilillah, Margin 1,
   Margin 2 -- and those make the selling value the stock went onto the shelf
   at. */
type Parts = { duty: number; fs: number; margin1: number; margin2: number; sellingValue: number };
type SupplierRow = Parts & {
  supplierId: number; supplier: string; orders: number; products: number; units: number;
  goods: number; discount: number; supplierTotal: number;
};
type ProductRow = Parts & {
  productId: number; sku: string; product: string; category: string; orders: number; suppliers: number;
  units: number; goods: number; averageCost: number; averageSellingPrice: number;
};
type OrderRow = Parts & {
  id: number; poNo: string; date: string; supplier: string; location: string; billNo: string | null;
  lines: number; units: number; supplierTotal: number;
};
type Report = Parts & {
  from: string; to: string; orderCount: number; supplierCount: number; productCount: number;
  units: number; goods: number; discount: number; supplierTotal: number;
  suppliers: { id: number; code: string; name: string }[];
  bySupplier: SupplierRow[]; byProduct: ProductRow[]; orders: OrderRow[];
};

function PartCells({ r }: { r: Parts }) {
  return (
    <>
      <NumCell v={r.duty} />
      <NumCell v={r.fs} />
      <NumCell v={r.margin1} />
      <NumCell v={r.margin2} />
      <NumCell v={r.sellingValue} bold />
    </>
  );
}

function PartHeads() {
  return (
    <>
      <HeadCell>Duty</HeadCell>
      <HeadCell>FS</HeadCell>
      <HeadCell>Margin 1</HeadCell>
      <HeadCell>Margin 2</HeadCell>
      <HeadCell>Selling value</HeadCell>
    </>
  );
}

export default function PurchaseSummaryPage() {
  const [from, setFrom] = React.useState(() => `${todayISO().slice(0, 4)}-01-01`);
  const [to, setTo] = React.useState(() => todayISO());
  const [supplierId, setSupplierId] = React.useState<number | null>(null);
  const [data, setData] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Report>(`${API_BASE_URL}/reports/purchase-summary`, {
        params: { from, to, supplierId: supplierId ?? undefined }, headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not build the purchase summary."));
    } finally {
      setLoading(false);
    }
  }, [from, to, supplierId]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const d = data;
  const parts = d ? d.duty + d.fs + d.margin1 + d.margin2 : 0;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Purchase Summary" }]}
        title="Purchase Summary"
        subtitle={`Purchase orders by supplier and item — ${from} to ${to}`}
        actions={
          <ReportToolbar
            mode="range"
            reportName="Purchase Summary"
            fromDate={from}
            toDate={to}
            onRangeChange={(f, t) => { setFrom(f); setTo(t); }}
            doc={{ family: "report", key: "purchase-summary" }}
            docParams={{ supplierId }}
            exportPath="reports/purchase-summary/export"
          />
        }
      />

      {error && <ReportError message={error} onRetry={() => void load()} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <ReportStat label="Supplier total" loading={loading} value={formatCompact(d?.supplierTotal ?? 0)}
          sub={`${d?.orderCount ?? 0} POs · ${d?.supplierCount ?? 0} suppliers`} />
        <ReportStat label="Units bought" loading={loading} value={(d?.units ?? 0).toLocaleString()} sub={`${d?.productCount ?? 0} items`} />
        <ReportStat label="Duty + FS + margins" loading={loading} value={formatCompact(parts)}
          sub={d ? `duty ${formatCompact(d.duty)} · FS ${formatCompact(d.fs)}` : undefined} />
        <ReportStat label="Selling value" loading={loading} value={formatCompact(d?.sellingValue ?? 0)} tone="text-success" sub="what it went on the shelf at" />
      </div>

      <Card className="mb-4">
        <CardBody className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <SelectNative value={supplierId === null ? "" : String(supplierId)} className="sm:w-72" aria-label="Supplier"
            onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">All suppliers</option>
            {(d?.suppliers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </SelectNative>
          {d && d.discount > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Discounts of {formatMoney(d.discount)} are already off the supplier total.
            </span>
          )}
        </CardBody>
      </Card>

      {loading ? (
        <Skeleton className="h-64" />
      ) : !d || d.orderCount === 0 ? (
        <Card><EmptyState icon={Truck} title="No purchase orders" description="Nothing was bought in this range." /></Card>
      ) : (
        <Tabs defaultValue="suppliers">
          <TabsList className="overflow-x-auto scrollbar-thin flex-nowrap">
            <TabsTrigger value="suppliers">By supplier</TabsTrigger>
            <TabsTrigger value="products">By item</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers">
            <Card className="p-0 overflow-hidden">
              <div className="hidden md:block overflow-x-auto scrollbar-thin">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-navy-700/50 border-b border-slate-200 dark:border-navy-700">
                      <HeadCell left>Supplier</HeadCell><HeadCell>POs</HeadCell><HeadCell>Units</HeadCell>
                      <HeadCell>Supplier total</HeadCell><PartHeads />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    {d.bySupplier.map((s) => (
                      <tr key={s.supplierId}>
                        <td className="px-3 py-2.5 text-sm font-medium text-navy-900 dark:text-white">
                          <Link href={`/reports/supplier-ledger?supplierId=${s.supplierId}`} className="hover:text-brand-yellow">{s.supplier}</Link>
                        </td>
                        <NumCell v={s.orders} count /><NumCell v={s.units} count />
                        <NumCell v={s.supplierTotal} bold /><PartCells r={s} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PhoneList rows={d.bySupplier.map((s) => ({
                key: String(s.supplierId), title: s.supplier, sub: `${s.orders} POs · ${s.units.toLocaleString()} units`,
                head: s.supplierTotal, parts: s,
              }))} />
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card className="p-0 overflow-hidden">
              <div className="hidden md:block overflow-x-auto scrollbar-thin">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-navy-700/50 border-b border-slate-200 dark:border-navy-700">
                      <HeadCell left>Item</HeadCell><HeadCell>Units</HeadCell><HeadCell>Avg cost</HeadCell>
                      <HeadCell>Goods</HeadCell><PartHeads />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    {d.byProduct.map((p) => (
                      <tr key={p.productId}>
                        <td className="px-3 py-2.5 max-w-[260px]">
                          <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{p.product}</div>
                          <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">{p.sku} · {p.category} · {p.suppliers} supplier{p.suppliers === 1 ? "" : "s"}</div>
                        </td>
                        <NumCell v={p.units} count /><NumCell v={p.averageCost} />
                        <NumCell v={p.goods} bold /><PartCells r={p} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PhoneList rows={d.byProduct.map((p) => ({
                key: String(p.productId), title: p.product, sub: `${p.units.toLocaleString()} units @ ${formatMoney(p.averageCost)}`,
                head: p.goods, parts: p,
              }))} />
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="p-0 overflow-hidden">
              <div className="hidden md:block overflow-x-auto scrollbar-thin">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-navy-700/50 border-b border-slate-200 dark:border-navy-700">
                      <HeadCell left>PO</HeadCell><HeadCell left>Supplier</HeadCell><HeadCell>Units</HeadCell>
                      <HeadCell>Supplier total</HeadCell><PartHeads />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    {d.orders.map((o) => (
                      <tr key={o.id}>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <Link href={`/purchases/orders/${o.id}`} className="tabular text-sm font-semibold text-navy-900 dark:text-white hover:text-brand-yellow">{o.poNo}</Link>
                          <div className="text-2xs text-slate-500 dark:text-slate-400">{formatDate(o.date)}</div>
                        </td>
                        <td className="px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200">
                          {o.supplier}
                          <div className="text-2xs text-slate-500 dark:text-slate-400">{o.location}{o.billNo ? ` · bill ${o.billNo}` : ""}</div>
                        </td>
                        <NumCell v={o.units} count /><NumCell v={o.supplierTotal} bold /><PartCells r={o} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PhoneList rows={d.orders.map((o) => ({
                key: String(o.id), title: `${o.poNo} · ${o.supplier}`, sub: `${formatDate(o.date)} · ${o.units.toLocaleString()} units`,
                head: o.supplierTotal, parts: o,
              }))} />
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}

/** Phones: one card per row, the five price parts as a grid under the total. */
function PhoneList({ rows }: { rows: { key: string; title: string; sub: string; head: number; parts: Parts }[] }) {
  return (
    <div className="md:hidden divide-y divide-slate-100 dark:divide-navy-700">
      {rows.map((r) => (
        <div key={r.key} className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-navy-900 dark:text-white truncate">{r.title}</div>
              <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">{r.sub}</div>
            </div>
            <span className="tabular text-sm font-bold text-navy-900 dark:text-white shrink-0">{formatMoney(r.head)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Mini label="Duty" value={formatCompact(r.parts.duty)} />
            <Mini label="FS" value={formatCompact(r.parts.fs)} />
            <Mini label="M1 + M2" value={formatCompact(r.parts.margin1 + r.parts.margin2)} />
            <Mini label="Selling" value={formatCompact(r.parts.sellingValue)} tone="text-success" />
          </div>
        </div>
      ))}
    </div>
  );
}
