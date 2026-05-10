"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { expenses } from "@/data/accounting";
import { formatMoney, formatDate } from "@/lib/format";

type Row = (typeof expenses)[number];

export default function ExpensesPage() {
  const [search, setSearch] = React.useState("");
  const filtered = expenses.filter((e) =>
    !search || e.expenseNo.toLowerCase().includes(search.toLowerCase()) || e.vendor.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<Row>[] = [
    { key: "expenseNo", header: "Expense #", cell: (e) => <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{e.expenseNo}</span> },
    { key: "date",      header: "Date",      cell: (e) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(e.date)}</span> },
    { key: "category",  header: "Category",  cell: (e) => <Badge variant="muted">{e.category}</Badge> },
    { key: "vendor",    header: "Vendor",    cell: (e) => <span className="text-sm text-slate-700 dark:text-slate-200">{e.vendor}</span> },
    { key: "branch",    header: "Branch",    cell: (e) => <span className="text-xs text-slate-600 dark:text-slate-300">{e.branch}</span> },
    { key: "paidVia",   header: "Paid Via",  cell: (e) => <Badge variant="info">{e.paidVia}</Badge> },
    { key: "amount",    header: "Amount",    align: "right", cell: (e) => <span className="tabular text-sm font-semibold text-danger">{formatMoney(e.amount)}</span> },
    { key: "status",    header: "Status",    cell: (e) => <StatusPill variant={e.status === "POSTED" ? "success" : "muted"}>{e.status}</StatusPill> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Expenses" }]}
        title="Expenses"
        subtitle="Operating expenses and overheads"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/accounting/expenses/new"><Plus /><span>New Expense</span></Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">This Month</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(expenses.reduce((s, e) => s + e.amount, 0))}</div>
            </div>
            <Receipt className="size-5 text-danger" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Top Category</div>
          <div className="text-base tabular font-bold text-navy-900 dark:text-white mt-1">Office Rent</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">PKR 1.20L (40%)</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">vs Last Month</div>
          <div className="text-2xl tabular font-bold text-success mt-1">-8%</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Pending Approval</div>
          <div className="text-2xl tabular font-bold text-warning mt-1">1</div>
        </Card>
      </div>

      <FilterBar searchPlaceholder="Search expenses…" searchValue={search} onSearchChange={setSearch} />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} rowHref={(e) => `/accounting/expenses/${e.id}`} />
      </Card>
    </>
  );
}
