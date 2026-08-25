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
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /purchases/invoices. isOverdue is derived by the API from the due date
   and what is still unpaid, so it can never go stale. */
type PI = {
  id: number; invoiceNo: string; supplierInvoiceNo: string;
  supplierId: number; supplierName: string; supplierInitials: string;
  poId: number | null; poNo: string | null; invoiceDate: string; dueDate: string;
  subtotal: number; discount: number; tax: number; whtAmount: number; total: number;
  status: string; statusName: string; paymentMethod: string; createdBy: string;
  paid: number; balance: number; isOverdue: boolean;
};

const PI_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
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

import { formatMoney, formatCompact, formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";

export default function PurchaseInvoicesPage() {
  const [rows, setRows] = React.useState<PI[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<PI[]>(`${API_BASE_URL}/purchases/invoices`, {
        headers: authHeader(),
      });
      setRows(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the purchase invoices."));
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
  const filtered = rows.filter((p) =>
    !search || p.invoiceNo.toLowerCase().includes(search.toLowerCase()) || p.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  const totalPayable = rows.reduce((s, p) => s + p.balance, 0);
  const overdue = rows.filter((p) => p.status === "OVERDUE");

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
    { key: "status", header: "Status", cell: (p) => <StatusPill variant={PI_STATUS_VARIANT[p.status]}>{statusLabel(p.status)}</StatusPill> },
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
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Invoices</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{rows.length}</div>
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
