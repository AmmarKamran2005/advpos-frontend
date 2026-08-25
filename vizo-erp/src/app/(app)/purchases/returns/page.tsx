"use client";

import * as React from "react";

import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import axios from "axios";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /purchases/returns. */
type PR = {
  id: number; returnNo: string; piId: number; invoiceNo: string;
  supplierId: number; supplierName: string; supplierInitials: string;
  location: string; returnDate: string; reason: string;
  status: string; statusName: string; createdBy: string;
  itemCount: number; totalAmount: number;
};

/* Real "ReturnStatus".StatusKey values. */
const PR_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
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

type Row = PR;

export default function PurchaseReturnsPage() {
  const [rows, setRows] = React.useState<PR[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<PR[]>(`${API_BASE_URL}/purchases/returns`, {
        headers: authHeader(),
      });
      setRows(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the purchase returns."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const columns: Column<Row>[] = [
    { key: "returnNo", header: "Return #", cell: (r) => <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{r.returnNo}</span> },
    { key: "invoiceNo", header: "PI Ref",   cell: (r) => <span className="tabular text-xs text-slate-500 dark:text-slate-400">{r.invoiceNo}</span> },
    { key: "supplier", header: "Supplier",  cell: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={r.supplierInitials} size="sm" />
          <span className="text-sm font-medium text-navy-900 dark:text-white">{r.supplierName}</span>
        </div>
      )
    },
    { key: "date", header: "Date", cell: (r) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(r.returnDate)}</span> },
    { key: "reason", header: "Reason", cell: (r) => <span className="text-sm text-slate-600 dark:text-slate-300">{r.reason}</span> },
    { key: "itemCount", header: "Items", align: "right", cell: (r) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{r.itemCount}</span> },
    { key: "totalAmount", header: "Amount", align: "right", cell: (r) => <span className="tabular text-sm font-semibold text-warning">{formatMoney(r.totalAmount)}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusPill variant={PR_STATUS_VARIANT[r.status]}>{statusLabel(r.status)}</StatusPill> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Purchase Returns" }]}
        title="Purchase Returns"
        subtitle="Debit notes to suppliers"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/purchases/returns/new"><Plus /><span>New Return</span></Link>
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


      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={rows} rowHref={(r) => `/purchases/returns/${r.id}`} />
      </Card>
    </>
  );
}
