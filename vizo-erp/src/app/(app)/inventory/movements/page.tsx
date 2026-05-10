"use client";

import * as React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Movement = {
  id: number;
  date: string;
  time: string;
  product: string;
  sku: string;
  type: "PURCHASE" | "SALE" | "TRANSFER_OUT" | "TRANSFER_IN" | "ADJUSTMENT" | "SALE_RETURN" | "PURCHASE_RETURN";
  reference: string;
  warehouse: string;
  qty: number;
  balance: number;
  user: string;
};

const TYPE_VARIANT: Record<Movement["type"], "success" | "danger" | "info" | "warning" | "muted"> = {
  PURCHASE:        "success",
  SALE:            "danger",
  TRANSFER_OUT:    "warning",
  TRANSFER_IN:     "info",
  ADJUSTMENT:      "muted",
  SALE_RETURN:     "info",
  PURCHASE_RETURN: "warning",
};

const MOVEMENTS: Movement[] = [
  { id: 1,  date: "2026-04-30", time: "11:42 AM", product: "VIZO Titan T9 Wireless Earbuds — Black", sku: "VZ-TIT-T9-BLK",  type: "SALE",         reference: "ORD-KHI-26-0142", warehouse: "KHI-WH-01", qty: -12, balance: 1240, user: "Sara Khan" },
  { id: 2,  date: "2026-04-30", time: "10:15 AM", product: "VIZO PowerX 20000mAh Power Bank",         sku: "VZ-PWX-20K-BLK", type: "SALE",         reference: "ORD-LHR-26-0089", warehouse: "LHR-WH-01", qty: -5,  balance: 340,  user: "Sara Khan" },
  { id: 3,  date: "2026-04-29", time: "04:20 PM", product: "VIZO VOLT 65W GaN Charger",               sku: "VZ-VLT-65W-PD",  type: "PURCHASE",     reference: "GRN-KHI-26-0089", warehouse: "KHI-WH-01", qty: 240, balance: 410,  user: "Bilal Ahmed" },
  { id: 4,  date: "2026-04-29", time: "02:00 PM", product: "VIZO VR Type-C Cable 1.5m",               sku: "VZ-VR-TC-1.5M",  type: "TRANSFER_OUT", reference: "TRF-KHI-26-0012", warehouse: "KHI-WH-01", qty: -100,balance: 1840, user: "Bilal Ahmed" },
  { id: 5,  date: "2026-04-29", time: "02:00 PM", product: "VIZO VR Type-C Cable 1.5m",               sku: "VZ-VR-TC-1.5M",  type: "TRANSFER_IN",  reference: "TRF-KHI-26-0012", warehouse: "LHR-WH-01", qty: 100, balance: 1940, user: "Bilal Ahmed" },
  { id: 6,  date: "2026-04-28", time: "05:30 PM", product: "VIZO VSP Bluetooth Speaker Mini — Red",   sku: "VZ-VSP-MINI-RED", type: "ADJUSTMENT",   reference: "ADJ-KHI-26-0034", warehouse: "KHI-WH-01", qty: -3,  balance: 840,  user: "Hassan Raza" },
  { id: 7,  date: "2026-04-28", time: "11:00 AM", product: "VIZO Titan T15 Pro ANC Earbuds",          sku: "VZ-TIT-T15-PRO", type: "SALE",         reference: "ORD-ISB-26-0034", warehouse: "ISB-WH-01", qty: -8,  balance: 340,  user: "Bilal Ahmed" },
  { id: 8,  date: "2026-04-27", time: "03:15 PM", product: "VIZO PowerX MagSafe 5000mAh",             sku: "VZ-PWX-MAGSAFE", type: "SALE_RETURN",  reference: "RET-KHI-26-0008", warehouse: "KHI-WH-01", qty: 2,   balance: 120,  user: "Hassan Raza" },
];

export default function MovementsPage() {
  const [search, setSearch] = React.useState("");
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = React.useState(monthAgo);
  const [to, setTo] = React.useState(today);
  const [branchId, setBranchId] = React.useState<number | null>(null);

  const filtered = MOVEMENTS.filter((m) =>
    !search ||
    m.product.toLowerCase().includes(search.toLowerCase()) ||
    m.sku.toLowerCase().includes(search.toLowerCase()) ||
    m.reference.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<Movement>[] = [
    { key: "date", header: "Date / Time", cell: (m) => (
        <div>
          <div className="text-xs font-medium text-navy-900 dark:text-white">{formatDate(m.date)}</div>
          <div className="text-2xs text-slate-500 dark:text-slate-400">{m.time}</div>
        </div>
      )
    },
    { key: "product", header: "Product", cell: (m) => (
        <div>
          <div className="text-sm font-medium text-navy-900 dark:text-white">{m.product}</div>
          <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{m.sku}</div>
        </div>
      )
    },
    { key: "type", header: "Type", cell: (m) => <Badge variant={TYPE_VARIANT[m.type]}>{m.type.replace("_", " ")}</Badge> },
    { key: "reference", header: "Reference", cell: (m) => <span className="tabular text-xs font-medium text-navy-900 dark:text-white">{m.reference}</span> },
    { key: "warehouse", header: "Warehouse", cell: (m) => <span className="text-xs text-slate-600 dark:text-slate-300">{m.warehouse}</span> },
    { key: "qty", header: "Qty", align: "right", cell: (m) => (
        <span className={cn("inline-flex items-center gap-1 tabular text-sm font-bold",
          m.qty > 0 ? "text-success" : "text-danger"
        )}>
          {m.qty > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {Math.abs(m.qty)}
        </span>
      )
    },
    { key: "balance", header: "Balance", align: "right", cell: (m) => <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{m.balance}</span> },
    { key: "user", header: "By", cell: (m) => <span className="text-xs text-slate-600 dark:text-slate-300">{m.user}</span> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Stock Movements" }]}
        title="Stock Movements"
        subtitle="Append-only ledger of all inventory changes"
        actions={
          <ReportToolbar mode="range" reportName="Stock Movements" fromDate={from} toDate={to} onRangeChange={(f, t) => { setFrom(f); setTo(t); }} branchId={branchId} onBranchChange={setBranchId} />
        }
      />

      <FilterBar
        searchPlaceholder="Search by product, SKU, reference…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} pageSize={15} />
      </Card>
    </>
  );
}
