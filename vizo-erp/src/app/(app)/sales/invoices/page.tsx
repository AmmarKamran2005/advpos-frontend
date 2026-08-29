"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  Plus, Download, FileText, Clock, CheckCircle2, AlertCircle,
  Printer, MessageCircle, Users, RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsAppShareDialog } from "@/components/dialogs/whatsapp-share-dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";

/* GET /sales/invoices -> { total, page, pageSize, items }. `paid` is the sum of
   POSTED voucher allocations; balance is total - paid.

   Walk-in counter bills are NOT in this list. They are cash off the street with
   no account behind them, they never age and nobody chases them, so mixing them
   in buries the shop invoices that do need chasing. They live at
   /sales/direct/walkin. */
type Invoice = {
  id: number; invoiceNo: string; orderId: number | null; orderNo: string | null;
  customerId: number; customerName: string; customerInitials: string;
  customerPhone: string | null; isWalkIn: boolean;
  location: string; invoiceDate: string; dueDate: string;
  subtotal: number; discount: number; tax: number; total: number;
  status: string; statusName: string;
  paymentMethod: string; pdfUrl: string | null; shareUrl: string | null;
  itemCount: number; paid: number; balance: number;
};

type InvoicePage = { total: number; page: number; pageSize: number; items: Invoice[] };

/* Real "InvoiceStatus".StatusKey values. */
const INVOICE_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
  DRAFT: "muted", ISSUED: "info", POSTED: "info",
  PARTIAL: "warning", PAID: "success", OVERDUE: "danger", VOID: "muted",
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function InvoicesPage() {
  const [rows, setRows] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [share, setShare] = React.useState<Invoice | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<InvoicePage>(`${API_BASE_URL}/sales/invoices`, {
        params: { pageSize: 200 },
        headers: authHeader(),
      });
      setRows(res.data.items);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the invoices."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((i) =>
      i.invoiceNo.toLowerCase().includes(term) ||
      i.customerName.toLowerCase().includes(term) ||
      (i.orderNo ?? "").toLowerCase().includes(term)
    );
  }, [rows, search]);

  const stats = React.useMemo(() => ({
    total: rows.length,
    paid: rows.filter((i) => i.status === "PAID").length,
    overdue: rows.filter((i) => i.status === "OVERDUE").length,
    totalOutstanding: rows.reduce((s, i) => s + i.balance, 0),
  }), [rows]);

  function openBill(id: number) {
    window.open(`${API_BASE_URL}/sales/invoices/${id}/pdf`, "_blank", "noopener,noreferrer");
  }

  /* Exports what is on screen, filters and all. Built in the browser from data
     already fetched -- no round trip, and what lands in Excel is exactly the
     list the user is looking at. */
  function exportCsv() {
    if (filtered.length === 0) {
      toast.error("Nothing to export", { description: "No invoices match the current search." });
      return;
    }
    const header = ["Invoice No", "Order No", "Customer", "Location", "Invoice Date", "Due Date",
      "Subtotal", "Discount", "Tax", "Total", "Paid", "Balance", "Status", "Payment Method"];
    const esc = (v: string | number | null) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const body = filtered.map((i) => [
      i.invoiceNo, i.orderNo ?? "", i.customerName, i.location, i.invoiceDate, i.dueDate,
      i.subtotal, i.discount, i.tax, i.total, i.paid, i.balance, i.statusName, i.paymentMethod,
    ].map(esc).join(","));

    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sale-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} invoices exported`);
  }

  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNo",
      header: "Invoice #",
      sortable: true,
      cell: (i) => (
        <div>
          <div className="tabular text-sm font-medium text-navy-900 dark:text-white">{i.invoiceNo}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{i.orderNo ?? "Direct invoice"}</div>
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
            <div className="text-xs text-slate-500 dark:text-slate-400">{i.location}</div>
          </div>
        </div>
      ),
    },
    { key: "invoiceDate", header: "Issued",  sortable: true, cell: (i) => <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(i.invoiceDate)}</span> },
    { key: "dueDate",     header: "Due",     sortable: true, cell: (i) => <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(i.dueDate)}</span> },
    { key: "total",       header: "Total",   align: "right", sortable: true, cell: (i) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(i.total)}</span> },
    { key: "paid",        header: "Paid",    align: "right", cell: (i) => <span className="tabular text-sm text-success">{formatMoney(i.paid)}</span> },
    { key: "balance",     header: "Balance", align: "right", cell: (i) => <span className="tabular text-sm font-semibold text-warning">{formatMoney(i.balance)}</span> },
    { key: "status",      header: "Status",  cell: (i) => <StatusPill variant={INVOICE_STATUS_VARIANT[i.status] ?? "muted"}>{statusLabel(i.status)}</StatusPill> },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (i) => (
        /* stopPropagation so tapping Print does not also follow the row link. */
        <div className="flex items-center justify-end gap-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <Button variant="ghost" size="icon-sm" aria-label={`Print ${i.invoiceNo}`} onClick={() => openBill(i.id)}>
            <Printer />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Send ${i.invoiceNo} on WhatsApp`} onClick={() => setShare(i)}>
            <MessageCircle />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Invoices" }]}
        title="Sales Invoices"
        subtitle={`${rows.length} invoices · ${formatCompact(stats.totalOutstanding)} outstanding · walk-in counter bills are listed separately`}
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href="/sales/direct/walkin"><Users /><span className="hidden sm:inline">Walk-in bills</span></Link>
            </Button>
            <Button variant="secondary" size="md" className="gap-1.5" onClick={exportCsv}>
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

      {error && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" />Try again
            </Button>
          </div>
        </Card>
      )}

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
        searchPlaceholder="Search by invoice number, customer or order…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <DataTable columns={columns} data={filtered} pageSize={15} rowHref={(i) => `/sales/invoices/${i.id}`} />
        )}
      </Card>

      {share && (
        <WhatsAppShareDialog
          open={!!share}
          onOpenChange={(o) => !o && setShare(null)}
          docNo={share.invoiceNo}
          docLabel="Invoice"
          customerName={share.customerName}
          customerPhone={share.customerPhone ?? ""}
          total={share.total}
          balance={share.balance}
          billLink={share.shareUrl ?? share.pdfUrl}
        />
      )}
    </>
  );
}
