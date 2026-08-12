"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Calendar } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";

type Adjustment = {
  id: number;
  adjustmentNo: string;
  date: string;
  location: string;
  reason: string;
  itemCount: number;
  netImpact: number;
  status: "Posted" | "Draft";
  user: string;
};

const ADJUSTMENTS: Adjustment[] = [
  { id: 1, adjustmentNo: "ADJ-26-0034", date: "2026-04-28", location: "LOC-01", reason: "Physical count discrepancy", itemCount: 3, netImpact: -8,  status: "Posted", user: "Hassan Raza" },
  { id: 2, adjustmentNo: "ADJ-26-0012", date: "2026-04-25", location: "LOC-03", reason: "Damaged in handling",         itemCount: 2, netImpact: -5,  status: "Posted", user: "Sara Khan" },
  { id: 3, adjustmentNo: "ADJ-26-0033", date: "2026-04-24", location: "LOC-01", reason: "Found extra stock",            itemCount: 1, netImpact: 4,   status: "Posted", user: "Hassan Raza" },
  { id: 4, adjustmentNo: "ADJ-26-0008", date: "2026-04-22", location: "LOC-02", reason: "Expired stock write-off",      itemCount: 4, netImpact: -12, status: "Posted", user: "Bilal Ahmed" },
  { id: 5, adjustmentNo: "ADJ-26-0035", date: "2026-04-30", location: "LOC-01", reason: "Stock count adjustment",       itemCount: 2, netImpact: 0,   status: "Draft",  user: "Hassan Raza" },
];

export default function AdjustmentsPage() {
  const columns: Column<Adjustment>[] = [
    { key: "adjustmentNo", header: "Adjustment #", cell: (a) => <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{a.adjustmentNo}</span> },
    { key: "date",         header: "Date",         cell: (a) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(a.date)}</span> },
    { key: "location",    header: "Location",    cell: (a) => <span className="text-sm text-slate-700 dark:text-slate-200">{a.location}</span> },
    { key: "reason",       header: "Reason",       cell: (a) => <span className="text-sm text-slate-600 dark:text-slate-300">{a.reason}</span> },
    { key: "itemCount",    header: "Items",        align: "right", cell: (a) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{a.itemCount}</span> },
    { key: "netImpact",    header: "Net",          align: "right", cell: (a) => (
        <span className={`tabular text-sm font-bold ${a.netImpact > 0 ? "text-success" : a.netImpact < 0 ? "text-danger" : "text-slate-600"}`}>
          {a.netImpact > 0 ? "+" : ""}{a.netImpact}
        </span>
      )
    },
    { key: "status",       header: "Status",       cell: (a) => <StatusPill variant={a.status === "Posted" ? "success" : "muted"}>{statusLabel(a.status)}</StatusPill> },
    { key: "user",         header: "By",           cell: (a) => <span className="text-xs text-slate-600 dark:text-slate-300">{a.user}</span> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Stock Adjustments" }]}
        title="Stock Adjustments"
        subtitle="Manual corrections to stock levels"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/inventory/adjustments/new">
              <Plus />
              <span>New Adjustment</span>
            </Link>
          </Button>
        }
      />

      <FilterBar
        searchPlaceholder="Search by adjustment number, reason…"
        extraActions={
          <Button variant="secondary" size="md" className="gap-1.5">
            <Calendar />
            <span className="hidden sm:inline">Last 30 days</span>
          </Button>
        }
      />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={ADJUSTMENTS} rowHref={(a) => `/inventory/adjustments/${a.id}`} />
      </Card>
    </>
  );
}
