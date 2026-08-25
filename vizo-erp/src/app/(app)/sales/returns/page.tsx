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
import axios from "axios";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /sales/returns. resalableQty / damagedQty come from the line
   ReturnCondition -- only resalable stock goes back on the shelf. */
type Return = {
  id: number; returnNo: string; invoiceId: number; invoiceNo: string;
  customerId: number; customerName: string; customerInitials: string;
  location: string; returnDate: string; reason: string; refundMethod: string;
  status: string; statusName: string; itemCount: number; totalAmount: number;
  resalableQty: number; damagedQty: number;
};

/* Real "ReturnStatus".StatusKey values. */
const RETURN_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
  DRAFT: "muted", APPROVED: "info", POSTED: "success", REJECTED: "danger",
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

import { formatMoney, formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";

export default function SalesReturnsPage() {
  const [rows, setRows] = React.useState<Return[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Return[]>(`${API_BASE_URL}/sales/returns`, {
        headers: authHeader(),
      });
      setRows(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the sales returns."));
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
  const filtered = rows.filter((r) =>
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
            <div className="text-xs text-slate-500 dark:text-slate-400">{r.location}</div>
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
    { key: "status", header: "Status", cell: (r) => <StatusPill variant={RETURN_STATUS_VARIANT[r.status]}>{statusLabel(r.status)}</StatusPill> },
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
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Returns</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Value</div>
          <div className="text-2xl tabular font-bold text-warning mt-1">{formatMoney(rows.reduce((s, r) => s + r.totalAmount, 0))}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Resalable Items</div>
          <div className="text-2xl tabular font-bold text-success mt-1">{rows.reduce((s, r) => s + r.resalableQty, 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Damaged Items</div>
          <div className="text-2xl tabular font-bold text-danger mt-1">{rows.reduce((s, r) => s + r.damagedQty, 0)}</div>
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
