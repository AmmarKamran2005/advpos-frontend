"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Truck, CheckCircle2, Clock, Download , Loader2} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import axios from "axios";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { downloadXlsx, exportError } from "@/lib/export";

/* GET /purchases/orders. receivedPercent is computed by the API from the
   GRN lines, because the GRN is what actually moved stock -- not the PO.
   These are the real "PurchaseOrderStatus".StatusKey values. */
type POStatus =
  | "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "PARTIALLY_RECEIVED"
  | "RECEIVED" | "CANCELLED" | "CLOSED";

const PO_STATUS_VARIANT: Record<POStatus, "success" | "warning" | "danger" | "info" | "muted"> = {
  DRAFT:              "muted",
  PENDING_APPROVAL:   "warning",
  APPROVED:           "info",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED:           "success",
  CANCELLED:          "muted",
  CLOSED:             "muted",
};

type PO = {
  id: number;
  poNo: string;
  supplierId: number;
  supplierName: string;
  supplierInitials: string;
  location: string;
  poDate: string;
  expectedDate: string | null;
  status: POStatus;
  statusName: string;
  itemCount: number;
  total: number;
  createdBy: string;
  approvedBy: string | null;
  notes: string | null;
  orderedUnits: number;
  receivedUnits: number;
  receivedPercent: number;
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

export default function PurchaseOrdersPage() {
  const [rows, setRows] = React.useState<PO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<PO[]>(`${API_BASE_URL}/purchases/orders`, {
        headers: authHeader(),
      });
      setRows(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the purchase orders."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. Disabled here rather
       than globally so the rule still catches the cases worth fixing. */
    void load();
  }, [load]);

  const filtered = rows.filter((p) =>
    !search || p.poNo.toLowerCase().includes(search.toLowerCase()) || p.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: rows.length,
    pending: rows.filter((p) => p.status === "PENDING_APPROVAL").length,
    approved: rows.filter((p) => p.status === "APPROVED" || p.status === "PARTIALLY_RECEIVED").length,
    received: rows.filter((p) => p.status === "RECEIVED").length,
    totalValue: rows.filter((p) => p.status !== "CANCELLED").reduce((s, p) => s + p.total, 0),
  };

  const columns: Column<PO>[] = [
    { key: "poNo", header: "PO #", sortable: true, cell: (p) => (
        <div>
          <div className="tabular text-sm font-medium text-navy-900 dark:text-white">{p.poNo}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(p.poDate)}</div>
        </div>
      )
    },
    { key: "supplierName", header: "Supplier", sortable: true, cell: (p) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={p.supplierInitials} size="sm" />
          <div>
            <div className="font-medium text-navy-900 dark:text-white">{p.supplierName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{p.location}</div>
          </div>
        </div>
      )
    },
    { key: "expectedDate", header: "Expected", sortable: true, cell: (p) => <span className="text-xs text-slate-600 dark:text-slate-300">{p.expectedDate ? formatDate(p.expectedDate) : "--"}</span> },
    { key: "itemCount",    header: "Items",    align: "right", cell: (p) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{p.itemCount}</span> },
    { key: "received",     header: "Received", cell: (p) => p.receivedPercent > 0 ? (
        <div className="flex items-center gap-2 w-32">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
            <div className="h-full bg-success" style={{ width: `${p.receivedPercent}%` }} />
          </div>
          <span className="text-2xs tabular text-slate-500 dark:text-slate-400 w-10 text-right">{p.receivedPercent}%</span>
        </div>
      ) : <span className="text-2xs text-slate-400">—</span>
    },
    { key: "total",        header: "Value",   align: "right", sortable: true, cell: (p) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(p.total)}</span> },
    { key: "status",       header: "Status",  cell: (p) => <StatusPill variant={PO_STATUS_VARIANT[p.status]}>{statusLabel(p.status)}</StatusPill> },
  ];

  /* The Export button used to be a toast. The API builds the workbook from the
     same list query this screen ran, so the file is what is on the page. */
  const [exporting, setExporting] = React.useState(false);

  async function exportXlsx() {
    setExporting(true);
    try {
      await downloadXlsx("purchases/orders/export", { q: search || undefined }, "purchase-orders.xlsx");
      toast.success("Export ready", { description: "Purchase orders downloaded as a spreadsheet." });
    } catch (e) {
      toast.error("Could not export", { description: await exportError(e) });
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Purchase Orders" }]}
        title="Purchase Orders"
        subtitle="Manage procurement from suppliers"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5" onClick={exportXlsx} disabled={exporting}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download />}
              <span className="hidden sm:inline">{exporting ? "Exporting…" : "Export"}</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/purchases/orders/new"><Plus /><span>New PO</span></Link>
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


      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="p-4"><Stat label="Total POs" value={stats.total.toString()} /></Card>
        <Card className="p-4 bg-warning/5 border-warning/20">
          <div className="flex items-center justify-between">
            <Stat label="Awaiting Approval" value={stats.pending.toString()} valueColor="text-warning" labelColor="text-warning-dark dark:text-warning-light" />
            <Clock className="size-5 text-warning" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Stat label="Approved" value={stats.approved.toString()} valueColor="text-info" />
            <Truck className="size-5 text-info" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Stat label="Received" value={stats.received.toString()} valueColor="text-success" />
            <CheckCircle2 className="size-5 text-success" />
          </div>
        </Card>
        <Card className="p-4"><Stat label="Total Value" value={formatCompact(stats.totalValue)} /></Card>
      </div>

      <FilterBar searchPlaceholder="Search POs by number or supplier…" searchValue={search} onSearchChange={setSearch} />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <DataTable columns={columns} data={filtered} pageSize={15} rowHref={(p) => `/purchases/orders/${p.id}`} />
        )}
      </Card>
    </>
  );
}

function Stat({ label, value, valueColor, labelColor }: { label: string; value: string; valueColor?: string; labelColor?: string }) {
  return (
    <div>
      <div className={`text-2xs uppercase font-semibold tracking-wider ${labelColor ?? "text-slate-500 dark:text-slate-400"}`}>{label}</div>
      <div className={`text-2xl tabular font-bold mt-1 ${valueColor ?? "text-navy-900 dark:text-white"}`}>{value}</div>
    </div>
  );
}
