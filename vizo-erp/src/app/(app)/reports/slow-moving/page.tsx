"use client";

import * as React from "react";
import { AlertTriangle, Package } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { products, brands } from "@/data/products";
import { formatMoney, formatCompact } from "@/lib/format";
import { toast } from "@/components/ui/toaster";

const SLOW = products
  .filter((p) => p.totalStock > 0)
  .map((p, i) => ({
    ...p,
    soldLast60d: Math.max(0, 50 - i * 5),
    daysSinceLastSale: 30 + i * 8,
    tiedUpValue: p.totalStock * p.costPrice,
  }))
  .filter((p) => p.soldLast60d < 25)
  .slice(0, 15);

export default function SlowMovingPage() {
  const totalTied = SLOW.reduce((s, p) => s + p.tiedUpValue, 0);

  const columns: Column<typeof SLOW[number]>[] = [
    { key: "name", header: "Product", cell: (p) => (
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-lg bg-slate-100 dark:bg-navy-700 flex items-center justify-center"><Package className="size-4 text-slate-400" /></div>
          <div>
            <div className="text-sm font-medium text-navy-900 dark:text-white">{p.name}</div>
            <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{p.sku} · {brands.find((b) => b.id === p.brandId)?.name}</div>
          </div>
        </div>
      )
    },
    { key: "totalStock",        header: "Stock",          align: "right", cell: (p) => <span className="tabular text-sm text-navy-900 dark:text-white">{p.totalStock}</span> },
    { key: "soldLast60d",       header: "Sold (60d)",     align: "right", cell: (p) => <span className="tabular text-sm font-semibold text-warning">{p.soldLast60d}</span> },
    { key: "daysSinceLastSale", header: "Last Sale",       align: "right", cell: (p) => <span className="tabular text-xs text-slate-500 dark:text-slate-400">{p.daysSinceLastSale} days ago</span> },
    { key: "salePrice",         header: "Sale Price",     align: "right", cell: (p) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{formatMoney(p.salePrice)}</span> },
    { key: "tiedUpValue",       header: "Tied-up Value",  align: "right", cell: (p) => <span className="tabular text-sm font-bold text-danger">{formatMoney(p.tiedUpValue)}</span> },
    { key: "action",            header: "",               cell: (p) => <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); toast.success("Discount suggested", { description: `Recommend 15% off on ${p.name} to clear ${p.totalStock} units.` }); }}>Suggest Discount</Button> },
  ];

  const [from, setFrom] = React.useState(() => new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = React.useState<number | null>(null);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Slow Moving Stock" }]}
        title="Slow Moving Stock"
        subtitle="SKUs with low movement in last 60 days"
        actions={
          <ReportToolbar mode="range" reportName="Slow Moving Stock" fromDate={from} toDate={to} onRangeChange={(f, t) => { setFrom(f); setTo(t); }} branchId={branchId} onBranchChange={setBranchId} />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-warning/5 border-warning/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-warning-dark dark:text-warning-light">Slow SKUs</div>
              <div className="text-2xl tabular font-bold text-warning mt-1">{SLOW.length}</div>
            </div>
            <AlertTriangle className="size-5 text-warning" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Tied-up Value</div>
          <div className="text-2xl tabular font-bold text-danger mt-1">{formatCompact(totalTied)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Avg Days Since Sale</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{Math.round(SLOW.reduce((s, p) => s + p.daysSinceLastSale, 0) / SLOW.length)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Recommendation</div>
          <Badge variant="warning" className="mt-1">Plan clearance promotion</Badge>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={SLOW} pageSize={15} />
      </Card>
    </>
  );
}
