"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, FileText, Clock, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { purchaseInvoices, PI_STATUS_VARIANT, type PI } from "@/data/purchases";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";

export default function PurchaseInvoicesPage() {
  const [search, setSearch] = React.useState("");
  const filtered = purchaseInvoices.filter((p) =>
    !search || p.invoiceNo.toLowerCase().includes(search.toLowerCase()) || p.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  const totalPayable = purchaseInvoices.reduce((s, p) => s + p.balance, 0);
  const overdue = purchaseInvoices.filter((p) => p.status === "OVERDUE");

  const columns: Column<PI>[] = [
    { key: "invoiceNo", header: "Invoice #", cell: (p) => (
        <div>
          <div className="tabular text-sm font-medium text-navy-900 dark:text-white">{p.invoiceNo}</div>
          <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">Supplier: {p.supplierInvoiceNo}</div>
        </div>
      )
    },
    { key: "supplierName", header: "Supplier", cell: (p) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={p.supplierInitials} size="sm" />
          <span className="text-sm font-medium text-navy-900 dark:text-white">{p.supplierName}</span>
        </div>
      )
    },
    { key: "poNo", header: "PO Ref", cell: (p) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{p.poNo}</span> },
    { key: "invoiceDate", header: "Issued", cell: (p) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(p.invoiceDate)}</span> },
    { key: "dueDate", header: "Due", cell: (p) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(p.dueDate)}</span> },
    { key: "total", header: "Total", align: "right", cell: (p) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(p.total)}</span> },
    { key: "balance", header: "Balance", align: "right", cell: (p) => <span className="tabular text-sm font-semibold text-warning">{formatMoney(p.balance)}</span> },
    { key: "paymentMethod", header: "Method", cell: (p) => <Badge variant="muted">{p.paymentMethod}</Badge> },
    { key: "status", header: "Status", cell: (p) => <StatusPill variant={PI_STATUS_VARIANT[p.status]}>{p.status}</StatusPill> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Purchase Invoices" }]}
        title="Purchase Invoices"
        subtitle="Supplier bills and payments"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/purchases/invoices/new"><Plus /><span>New Invoice</span></Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Invoices</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{purchaseInvoices.length}</div>
            </div>
            <FileText className="size-5 text-info" />
          </div>
        </Card>
        <Card className="p-4 bg-warning/5 border-warning/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-warning-dark dark:text-warning-light">Total Payable</div>
              <div className="text-2xl tabular font-bold text-warning mt-1">{formatCompact(totalPayable)}</div>
            </div>
            <Clock className="size-5 text-warning" />
          </div>
        </Card>
        <Card className="p-4 bg-danger/5 border-danger/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-danger-dark dark:text-danger-light">Overdue</div>
              <div className="text-2xl tabular font-bold text-danger mt-1">{overdue.length}</div>
            </div>
            <AlertCircle className="size-5 text-danger" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Due in 7 days</div>
          <div className="text-2xl tabular font-bold text-warning mt-1">PKR 8.4L</div>
        </Card>
      </div>

      <FilterBar searchPlaceholder="Search purchase invoices…" searchValue={search} onSearchChange={setSearch} />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} />
      </Card>
    </>
  );
}
