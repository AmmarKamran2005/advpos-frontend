"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Package, Truck, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { grns, GRN_STATUS_VARIANT, type GRN } from "@/data/purchases";
import { formatMoney, formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";

export default function GRNsPage() {
  const [search, setSearch] = React.useState("");
  const filtered = grns.filter((g) =>
    !search || g.grnNo.toLowerCase().includes(search.toLowerCase()) || g.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<GRN>[] = [
    { key: "grnNo", header: "GRN #", cell: (g) => (
        <div>
          <div className="tabular text-sm font-medium text-navy-900 dark:text-white">{g.grnNo}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(g.receiptDate)}</div>
        </div>
      )
    },
    { key: "poNo", header: "PO Ref", cell: (g) => <Link href={`/purchases/orders/${g.poId}`} className="tabular text-xs font-medium text-brand-yellow-700 dark:text-brand-yellow hover:underline">{g.poNo}</Link> },
    { key: "supplier", header: "Supplier", cell: (g) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={g.supplierInitials} size="sm" />
          <span className="text-sm font-medium text-navy-900 dark:text-white">{g.supplierName}</span>
        </div>
      )
    },
    { key: "deliveryNoteNo", header: "DN #", cell: (g) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{g.deliveryNoteNo}</span> },
    { key: "vehicleNo", header: "Vehicle", cell: (g) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{g.vehicleNo}</span> },
    { key: "location", header: "Location", cell: (g) => <span className="text-xs text-slate-600 dark:text-slate-300">{g.location}</span> },
    { key: "units", header: "Units", align: "right", cell: (g) => (
        <div className="text-right">
          <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">{g.unitsAccepted}</div>
          {g.unitsDamaged > 0 && (
            <div className="text-2xs text-danger inline-flex items-center gap-0.5"><AlertTriangle className="size-2.5" />{g.unitsDamaged} damaged</div>
          )}
        </div>
      )
    },
    { key: "totalValue", header: "Value", align: "right", cell: (g) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(g.totalValue)}</span> },
    { key: "status", header: "Status", cell: (g) => <StatusPill variant={GRN_STATUS_VARIANT[g.status]}>{statusLabel(g.status)}</StatusPill> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Goods Receipts (GRN)" }]}
        title="Goods Receipts"
        subtitle="Record stock arrivals from suppliers"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/purchases/grns/new"><Plus /><span>New GRN</span></Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">GRNs This Week</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">5</div>
            </div>
            <Package className="size-5 text-info" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">In Transit (POs)</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">2</div>
            </div>
            <Truck className="size-5 text-warning" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Units Received</div>
          <div className="text-2xl tabular font-bold text-success mt-1">1,000</div>
        </Card>
        <Card className="p-4 bg-danger/5 border-danger/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-danger-dark dark:text-danger-light">Damaged Units</div>
              <div className="text-2xl tabular font-bold text-danger mt-1">9</div>
            </div>
            <AlertTriangle className="size-5 text-danger" />
          </div>
        </Card>
      </div>

      <FilterBar searchPlaceholder="Search GRNs…" searchValue={search} onSearchChange={setSearch} />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} />
      </Card>
    </>
  );
}
