"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Truck, CheckCircle2, Clock, Download } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { purchaseOrders, PO_STATUS_VARIANT, type PO } from "@/data/purchases";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";

export default function PurchaseOrdersPage() {
  const [search, setSearch] = React.useState("");
  const filtered = purchaseOrders.filter((p) =>
    !search || p.poNo.toLowerCase().includes(search.toLowerCase()) || p.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: purchaseOrders.length,
    pending: purchaseOrders.filter((p) => p.status === "PENDING_APPROVAL").length,
    approved: purchaseOrders.filter((p) => p.status === "APPROVED" || p.status === "PARTIALLY_RECEIVED").length,
    received: purchaseOrders.filter((p) => p.status === "RECEIVED").length,
    totalValue: purchaseOrders.filter((p) => p.status !== "CANCELLED").reduce((s, p) => s + p.total, 0),
  };

  const columns: Column<PO>[] = [
    { key: "poNo", header: "PO #", sortable: true, cell: (p) => (
        <div>
          <div className="tabular text-sm font-medium text-navy-900 dark:text-white">{p.poNo}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(p.poDate)}</div>
        </div>
      )
    },
    { key: "supplierName", header: "Supplier", sortable: true, cell: (p) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={p.supplierInitials} size="sm" />
          <div>
            <div className="font-medium text-navy-900 dark:text-white">{p.supplierName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{p.branch}</div>
          </div>
        </div>
      )
    },
    { key: "expectedDate", header: "Expected", sortable: true, cell: (p) => <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(p.expectedDate)}</span> },
    { key: "itemCount",    header: "Items",    align: "right", cell: (p) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{p.itemCount}</span> },
    { key: "received",     header: "Received", cell: (p) => p.receivedPercent > 0 ? (
        <div className="flex items-center gap-2 w-32">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
            <div className="h-full bg-success" style={{ width: `${p.receivedPercent}%` }} />
          </div>
          <span className="text-2xs tabular text-slate-500 dark:text-slate-400 w-10 text-right">{p.receivedPercent}%</span>
        </div>
      ) : <span className="text-2xs text-slate-400">—</span>
    },
    { key: "total",        header: "Value",   align: "right", sortable: true, cell: (p) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(p.total)}</span> },
    { key: "status",       header: "Status",  cell: (p) => <StatusPill variant={PO_STATUS_VARIANT[p.status]}>{p.status.replace("_", " ")}</StatusPill> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Purchase Orders" }]}
        title="Purchase Orders"
        subtitle="Manage procurement from suppliers"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5"><Download /><span className="hidden sm:inline">Export</span></Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/purchases/orders/new"><Plus /><span>New PO</span></Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="p-4"><Stat label="Total POs" value={stats.total.toString()} /></Card>
        <Card className="p-4 bg-warning/5 border-warning/20">
          <div className="flex items-center justify-between">
            <Stat label="Awaiting Approval" value={stats.pending.toString()} valueColor="text-warning" labelColor="text-warning-dark dark:text-warning-light" />
            <Clock className="size-5 text-warning" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Stat label="Approved" value={stats.approved.toString()} valueColor="text-info" />
            <Truck className="size-5 text-info" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Stat label="Received" value={stats.received.toString()} valueColor="text-success" />
            <CheckCircle2 className="size-5 text-success" />
          </div>
        </Card>
        <Card className="p-4"><Stat label="Total Value" value={formatCompact(stats.totalValue)} /></Card>
      </div>

      <FilterBar searchPlaceholder="Search POs by number or supplier…" searchValue={search} onSearchChange={setSearch} />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} pageSize={15} rowHref={(p) => `/purchases/orders/${p.id}`} />
      </Card>
    </>
  );
}

function Stat({ label, value, valueColor, labelColor }: { label: string; value: string; valueColor?: string; labelColor?: string }) {
  return (
    <div>
      <div className={`text-2xs uppercase font-semibold tracking-wider ${labelColor ?? "text-slate-500 dark:text-slate-400"}`}>{label}</div>
      <div className={`text-2xl tabular font-bold mt-1 ${valueColor ?? "text-navy-900 dark:text-white"}`}>{value}</div>
    </div>
  );
}
