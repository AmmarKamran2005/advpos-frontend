"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { Plus, Receipt, AlertCircle, FileDown, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { Pager } from "@/components/ui/pager";
import { toast } from "@/components/ui/toaster";
import { formatMoney, formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /accounting/expenses -> { total, count, page, pageSize, pageCount, items }
   `total` is the money over the WHOLE filter and `count` the number of rows in
   it -- neither is limited to the page on screen. */
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

type ExpenseResponse = {
  total: number;
  count: number;
  page: number;
  pageSize: number;
  pageCount: number;
  /* Computed by the API across the whole filter, not by this page across the
     rows it happens to be holding. */
  topCategory: { name: string; amount: number } | null;
  draftCount: number;
  items: Expense[];
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/* The shared statusLabel() speaks shopkeeper -- POSTED reads "Confirmed",
   REVERSED reads "Undone". That is right on the sales screens and wrong on an
   accounting one, where the ledger's own word is the word the accountant is
   looking for. Rows use the statusName the API sends; this is only for the
   filter chip, which has the key and nothing else. */
const STATUS_TEXT: Record<string, string> = {
  DRAFT: "Draft",
  POSTED: "Posted",
  REVERSED: "Reversed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  RECONCILED: "Reconciled",
};

const PAGE_SIZE = 25;

const STATUS_VARIANT: Record<string, "success" | "muted" | "warning" | "danger"> = {
  POSTED: "success",
  DRAFT: "muted",
  REVERSED: "warning",
  REJECTED: "danger",
  CANCELLED: "danger",
};

const EMPTY: ExpenseResponse = { total: 0, count: 0, page: 1, pageSize: PAGE_SIZE, pageCount: 1, topCategory: null, draftCount: 0, items: [] };

export default function ExpensesPage() {
  const [data, setData] = React.useState<ExpenseResponse>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  /* What the user is typing, and what has actually been asked of the API.
     They are separate so a keystroke does not become a request. */
  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const t = setTimeout(() => {
      /* Fires 300ms after typing stops, not on every keystroke -- one
         request per search, not one per letter. */
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<ExpenseResponse>(`${API_BASE_URL}/accounting/expenses`, {
        headers: authHeader(),
        /* Search, filter and paging all happen on the server. Filtering an
           array the browser already holds only ever filters the page it was
           given, which is a different answer to the one asked for. */
        params: {
          q: query || undefined,
          status: status || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the expenses."));
    } finally {
      setLoading(false);
    }
  }, [query, status, from, to, page]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const rows = data.items;

  const chips = [
    status && { key: "status", label: "Status", value: STATUS_TEXT[status] ?? status },
    from && { key: "from", label: "From", value: from },
    to && { key: "to", label: "To", value: to },
    query && { key: "q", label: "Search", value: query },
  ].filter(Boolean) as { key: string; label: string; value: string }[];

  function removeChip(key: string) {
    if (key === "status") setStatus("");
    if (key === "from") setFrom("");
    if (key === "to") setTo("");
    if (key === "q") { setSearch(""); setQuery(""); }
    setPage(1);
  }

  function clearAll() {
    setStatus(""); setFrom(""); setTo(""); setSearch(""); setQuery(""); setPage(1);
  }

  async function exportXlsx() {
    setExporting(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/accounting/expenses/export`, {
        headers: authHeader(),
        responseType: "blob",
        params: { q: query || undefined, status: status || undefined, from: from || undefined, to: to || undefined },
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (e) {
      toast.error(apiMessage(e, "The export could not be built."));
    } finally {
      setExporting(false);
    }
  }

  const columns: Column<Expense>[] = [
    { key: "expenseNo", header: "Expense #", cell: (e) => <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{e.expenseNo}</span> },
    { key: "date",      header: "Date",      cell: (e) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(e.expenseDate)}</span> },
    { key: "category",  header: "Category",  cell: (e) => <Badge variant="muted">{e.categoryName || "—"}</Badge> },
    { key: "vendor",    header: "Vendor",    cell: (e) => <span className="text-sm text-slate-700 dark:text-slate-200">{e.vendorName}</span> },
    { key: "location",  header: "Location",  cell: (e) => <span className="text-xs text-slate-600 dark:text-slate-300">{e.location}</span> },
    { key: "paidVia",   header: "Paid Via",  cell: (e) => <Badge variant="info">{e.paymentMethod}</Badge> },
    { key: "amount",    header: "Amount",    align: "right", cell: (e) => <span className="tabular text-sm font-semibold text-danger">{formatMoney(e.amount)}</span> },
    { key: "status",    header: "Status",    cell: (e) => <StatusPill variant={STATUS_VARIANT[e.status] ?? "muted"}>{e.statusName}</StatusPill> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Expenses" }]}
        title="Expenses"
        subtitle="Operating costs and overheads"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5" onClick={() => void exportXlsx()} disabled={exporting || data.count === 0}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <FileDown />}
              <span>Export</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/accounting/expenses/new"><Plus /><span>New Expense</span></Link>
            </Button>
          </>
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
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
                {chips.length ? "Matching total" : "All expenses"}
              </div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(data.total)}</div>
            </div>
            <Receipt className="size-5 text-danger" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Top Category</div>
          <div className="text-base tabular font-bold text-navy-900 dark:text-white mt-1">{data.topCategory?.name ?? "—"}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {data.topCategory
              ? `${formatMoney(data.topCategory.amount)}${data.total > 0 ? ` (${Math.round((data.topCategory.amount / data.total) * 100)}%)` : ""}`
              : "Nothing to show"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Rows Matching</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{data.count.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Awaiting Approval</div>
          <div className={`text-2xl tabular font-bold mt-1 ${data.draftCount ? "text-warning" : "text-slate-400"}`}>{data.draftCount.toLocaleString()}</div>
        </Card>
      </div>

      <FilterBar
        searchPlaceholder="Search by number, vendor or category…"
        searchValue={search}
        onSearchChange={setSearch}
        chips={chips}
        onRemoveChip={removeChip}
        onClearAll={clearAll}
        extraActions={
          <div className="flex items-center gap-2">
            <SelectNative
              aria-label="Status"
              value={status}
              onChange={(ev) => { setStatus(ev.target.value); setPage(1); }}
              className="w-40"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="POSTED">Posted</option>
              <option value="REVERSED">Reversed</option>
              <option value="REJECTED">Rejected</option>
            </SelectNative>
            <Input
              type="date"
              aria-label="From date"
              value={from}
              onChange={(ev) => { setFrom(ev.target.value); setPage(1); }}
              className="w-40"
            />
            <Input
              type="date"
              aria-label="To date"
              value={to}
              onChange={(ev) => { setTo(ev.target.value); setPage(1); }}
              className="w-40"
            />
          </div>
        }
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={rows}
              rowHref={(e) => `/accounting/expenses/${e.id}`}
              pageSize={PAGE_SIZE}
            />
            <Pager
              page={data.page}
              pageCount={data.pageCount}
              total={data.count}
              noun="expenses"
              onPage={setPage}
              disabled={loading}
            />
          </>
        )}
      </Card>
    </>
  );
}
