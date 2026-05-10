"use client";

import * as React from "react";
import { Archive, Package } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { products, brands } from "@/data/products";
import { formatMoney, formatCompact } from "@/lib/format";
import { toast } from "@/components/ui/toaster";

const DEAD = products
  .filter((p) => p.totalStock > 0 && (p.status === "low" || p.totalStock < 50))
  .map((p, i) => ({
    ...p,
    daysSinceLastMovement: 180 + i * 20,
    tiedUpValue: p.totalStock * p.costPrice,
  }))
  .slice(0, 12);

export default function DeadStockPage() {
  const totalTied = DEAD.reduce((s, p) => s + p.tiedUpValue, 0);
  const today = new Date().toISOString().slice(0, 10);
  const [asOf, setAsOf] = React.useState(today);
  const [branchId, setBranchId] = React.useState<number | null>(null);
  const [writeOff, setWriteOff] = React.useState<typeof DEAD[number] | null>(null);
  const [liquidate, setLiquidate] = React.useState<typeof DEAD[number] | null>(null);

  const columns: Column<typeof DEAD[number]>[] = [
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
    { key: "totalStock",             header: "Stuck Stock", align: "right", cell: (p) => <span className="tabular text-sm font-bold text-warning">{p.totalStock}</span> },
    { key: "daysSinceLastMovement",  header: "Last Movement", align: "right", cell: (p) => <span className="tabular text-xs text-danger font-semibold">{p.daysSinceLastMovement} days ago</span> },
    { key: "costPrice",              header: "Cost",        align: "right", cell: (p) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{formatMoney(p.costPrice)}</span> },
    { key: "tiedUpValue",            header: "Tied Value",  align: "right", cell: (p) => <span className="tabular text-sm font-bold text-danger">{formatMoney(p.tiedUpValue)}</span> },
    { key: "action",                 header: "",            cell: (p) => (
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setLiquidate(p); }}>Liquidate</Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setWriteOff(p); }}>Write-off</Button>
        </div>
      )
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Dead Stock" }]}
        title="Dead Stock Report"
        subtitle="No movement in 180+ days — capital tied up"
        actions={
          <ReportToolbar mode="asOf" reportName="Dead Stock" asOfDate={asOf} onAsOfChange={setAsOf} branchId={branchId} onBranchChange={setBranchId} />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-danger/5 border-danger/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-danger-dark dark:text-danger-light">Dead SKUs</div>
              <div className="text-2xl tabular font-bold text-danger mt-1">{DEAD.length}</div>
            </div>
            <Archive className="size-5 text-danger" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Tied-up</div>
          <div className="text-2xl tabular font-bold text-danger mt-1">{formatCompact(totalTied)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Units</div>
          <div className="text-2xl tabular font-bold text-warning mt-1">{DEAD.reduce((s, p) => s + p.totalStock, 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Recommendation</div>
          <Badge variant="danger" className="mt-1">Liquidate or write-off</Badge>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={DEAD} pageSize={15} />
      </Card>

      <ConfirmDialog
        open={!!liquidate}
        onOpenChange={(o) => !o && setLiquidate(null)}
        title={liquidate ? `Liquidate ${liquidate.name}?` : "Liquidate"}
        description={liquidate ? `Mark ${liquidate.totalStock} units for clearance sale at 50% off cost. Tied-up capital: ${formatMoney(liquidate.tiedUpValue)}.` : ""}
        variant="info"
        confirmLabel="Move to Clearance"
        onConfirm={() => { toast.success("Moved to clearance pricing", { description: `${liquidate?.name} now appears in promo pricelist.` }); setLiquidate(null); }}
      />
      <ConfirmDialog
        open={!!writeOff}
        onOpenChange={(o) => !o && setWriteOff(null)}
        title={writeOff ? `Write off ${writeOff.name}?` : "Write off"}
        description={writeOff ? `${writeOff.totalStock} units of ${writeOff.name} will be removed from inventory and ${formatMoney(writeOff.tiedUpValue)} will be charged to Inventory Loss expense. This requires Finance Manager approval.` : ""}
        variant="danger"
        confirmLabel="Submit Write-off"
        requireReason
        onConfirm={(reason) => { toast.success("Write-off submitted for approval", { description: `Reason: ${reason}` }); setWriteOff(null); }}
      />
    </>
  );
}
