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
import axios from "axios";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /accounting/rows -> { total, count, items }. */
type Expense = {
  id: number;
  expenseNo: string;
  expenseDate: string;
  location: string;
  categoryName: string;
  expenseAccount: string;
  paidFromAccount: string;
  amount: number;
  vendorName: string;
  paymentMethod: string;
  description: string | null;
  status: string;
  statusName: string;
  createdBy: string;
};

type ExpenseResponse = { total: number; count: number; items: Expense[] };

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

import { formatMoney, formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";

type Row = Expense;

export default function ExpensesPage() {
  const [rows, setRows] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<ExpenseResponse>(`${API_BASE_URL}/accounting/rows`, {
        headers: authHeader(),
      });
      setRows(res.data.items);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the rows."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const [search, setSearch] = React.useState("");
  const filtered = rows.filter((e) =>
    !search || e.expenseNo.toLowerCase().includes(search.toLowerCase()) || e.vendorName.toLowerCase().includes(search.toLowerCase()) || e.categoryName.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<Row>[] = [
    { key: "expenseNo", header: "Expense #", cell: (e) => <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{e.expenseNo}</span> },
    { key: "date",      header: "Date",      cell: (e) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(e.expenseDate)}</span> },
    { key: "category",  header: "Category",  cell: (e) => <Badge variant="muted">{e.categoryName}</Badge> },
    { key: "vendor",    header: "Vendor",    cell: (e) => <span className="text-sm text-slate-700 dark:text-slate-200">{e.vendorName}</span> },
    { key: "location",    header: "Location",    cell: (e) => <span className="text-xs text-slate-600 dark:text-slate-300">{e.location}</span> },
    { key: "paidVia",   header: "Paid Via",  cell: (e) => <Badge variant="info">{e.paymentMethod}</Badge> },
    { key: "amount",    header: "Amount",    align: "right", cell: (e) => <span className="tabular text-sm font-semibold text-danger">{formatMoney(e.amount)}</span> },
    { key: "status",    header: "Status",    cell: (e) => <StatusPill variant={e.status === "POSTED" ? "success" : "muted"}>{statusLabel(e.status)}</StatusPill> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Expenses" }]}
        title="Expenses"
        subtitle="Operating rows and overheads"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/accounting/expenses/new"><Plus /><span>New Expense</span></Link>
          </Button>
        }
      />

      {error && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        </Card>
      )}


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">This Month</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(rows.reduce((s, e) => s + e.amount, 0))}</div>
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

      <FilterBar searchPlaceholder="Search rows…" searchValue={search} onSearchChange={setSearch} />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <DataTable columns={columns} data={filtered} rowHref={(e) => `/accounting/expenses/${e.id}`} />
        )}
      </Card>
    </>
  );
}
