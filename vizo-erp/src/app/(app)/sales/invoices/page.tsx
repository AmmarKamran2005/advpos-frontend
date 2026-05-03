"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Download, FileText, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { invoices, INVOICE_STATUS_VARIANT, type Invoice } from "@/data/sales";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";

export default function InvoicesPage() {
  const [search, setSearch] = React.useState("");

  const filtered = invoices.filter((i) =>
    !search ||
    i.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
    i.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "PAID").length,
    overdue: invoices.filter((i) => i.status === "OVERDUE").length,
    totalOutstanding: invoices.reduce((s, i) => s + i.balance, 0),
  };

  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNo",
      header: "Invoice #",
      sortable: true,
      cell: (i) => (
        <div>
          <div className="tabular text-sm font-medium text-navy-900 dark:text-white">{i.invoiceNo}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{i.orderNo}</div>
        </div>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
      sortable: true,
      cell: (i) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={i.customerInitials} size="sm" />
          <div>
            <div className="font-medium text-navy-900 dark:text-white">{i.customerName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{i.branch}</div>
          </div>
        </div>
      ),
    },
    { key: "invoiceDate", header: "Issued",  sortable: true, cell: (i) => <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(i.invoiceDate)}</span> },
    { key: "dueDate",     header: "Due",     sortable: true, cell: (i) => <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(i.dueDate)}</span> },
    { key: "total",       header: "Total",   align: "right", sortable: true, cell: (i) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(i.total)}</span> },
    { key: "paid",        header: "Paid",    align: "right", cell: (i) => <span className="tabular text-sm text-success">{formatMoney(i.paid)}</span> },
    { key: "balance",     header: "Balance", align: "right", cell: (i) => <span className="tabular text-sm font-semibold text-warning">{formatMoney(i.balance)}</span> },
    { key: "status",      header: "Status",  cell: (i) => <StatusPill variant={INVOICE_STATUS_VARIANT[i.status]}>{i.status}</StatusPill> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Invoices" }]}
        title="Sales Invoices"
        subtitle={`${invoices.length} invoices · ${formatCompact(stats.totalOutstanding)} outstanding`}
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5">
              <Download />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/sales/invoices/new">
                <Plus />
                <span>New Invoice</span>
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Invoices</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{stats.total}</div>
            </div>
            <FileText className="size-5 text-info" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Paid</div>
              <div className="text-2xl tabular font-bold text-success mt-1">{stats.paid}</div>
            </div>
            <CheckCircle2 className="size-5 text-success" />
          </div>
        </Card>
        <Card className="p-4 bg-danger/5 border-danger/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-danger-dark dark:text-danger-light">Overdue</div>
              <div className="text-2xl tabular font-bold text-danger mt-1">{stats.overdue}</div>
            </div>
            <AlertCircle className="size-5 text-danger" />
          </div>
        </Card>
        <Card className="p-4 bg-warning/5 border-warning/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-warning-dark dark:text-warning-light">Outstanding</div>
              <div className="text-2xl tabular font-bold text-warning mt-1">{formatCompact(stats.totalOutstanding)}</div>
            </div>
            <Clock className="size-5 text-warning" />
          </div>
        </Card>
      </div>

      <FilterBar
        searchPlaceholder="Search invoices…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} pageSize={15} rowHref={(i) => `/sales/invoices/${i.id}`} />
      </Card>
    </>
  );
}
