"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { salesReturns, RETURN_STATUS_VARIANT, type Return } from "@/data/sales";
import { formatMoney, formatDate } from "@/lib/format";

export default function SalesReturnsPage() {
  const [search, setSearch] = React.useState("");
  const filtered = salesReturns.filter((r) =>
    !search ||
    r.returnNo.toLowerCase().includes(search.toLowerCase()) ||
    r.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<Return>[] = [
    { key: "returnNo", header: "Return #", cell: (r) => <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{r.returnNo}</span> },
    { key: "invoiceNo", header: "Invoice", cell: (r) => <span className="tabular text-xs text-slate-500 dark:text-slate-400">{r.invoiceNo}</span> },
    {
      key: "customerName",
      header: "Customer",
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={r.customerInitials} size="sm" />
          <div>
            <div className="font-medium text-navy-900 dark:text-white">{r.customerName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{r.branch}</div>
          </div>
        </div>
      )
    },
    { key: "returnDate", header: "Return Date", cell: (r) => <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(r.returnDate)}</span> },
    { key: "reason", header: "Reason", cell: (r) => <span className="text-sm text-slate-600 dark:text-slate-300">{r.reason}</span> },
    {
      key: "condition",
      header: "Condition",
      cell: (r) => (
        <div className="flex items-center gap-1.5">
          {r.resalableQty > 0 && <Badge variant="success" className="text-2xs">Resalable: {r.resalableQty}</Badge>}
          {r.damagedQty > 0 && <Badge variant="danger" className="text-2xs">Damaged: {r.damagedQty}</Badge>}
        </div>
      )
    },
    { key: "totalAmount", header: "Amount", align: "right", cell: (r) => <span className="tabular text-sm font-semibold text-warning">{formatMoney(r.totalAmount)}</span> },
    { key: "refundMethod", header: "Refund Via", cell: (r) => <Badge variant="info">{r.refundMethod}</Badge> },
    { key: "status", header: "Status", cell: (r) => <StatusPill variant={RETURN_STATUS_VARIANT[r.status]}>{r.status}</StatusPill> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Sales Returns" }]}
        title="Sales Returns"
        subtitle="Partial returns with condition tracking"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/sales/returns/new">
              <Plus />
              <span>New Return</span>
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Returns</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{salesReturns.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Value</div>
          <div className="text-2xl tabular font-bold text-warning mt-1">{formatMoney(salesReturns.reduce((s, r) => s + r.totalAmount, 0))}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Resalable Items</div>
          <div className="text-2xl tabular font-bold text-success mt-1">{salesReturns.reduce((s, r) => s + r.resalableQty, 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Damaged Items</div>
          <div className="text-2xl tabular font-bold text-danger mt-1">{salesReturns.reduce((s, r) => s + r.damagedQty, 0)}</div>
        </Card>
      </div>

      <FilterBar
        searchPlaceholder="Search returns…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} pageSize={10} rowHref={(r) => `/sales/returns/${r.id}`} />
      </Card>
    </>
  );
}
