"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Package, Truck, AlertTriangle } from "lucide-react";
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

/* GET /purchases/rows. STOCK RISES AT THE GRN, not at the invoice.
   Status is a "PostingStatus" here, not an InvoiceStatus. */
type GRN = {
  id: number; grnNo: string; poId: number | null; poNo: string | null;
  supplierId: number; supplierName: string; supplierInitials: string;
  location: string; receiptDate: string; deliveryNoteNo: string;
  vehicleNo: string | null; totalValue: number; status: string; statusName: string;
  receivedBy: string; itemCount: number; unitsReceived: number;
  unitsDamaged: number; unitsAccepted: number;
};

const GRN_STATUS_VARIANT: Record<string, "success" | "muted" | "danger" | "warning" | "info"> = {
  DRAFT: "muted", POSTED: "success", REVERSED: "warning",
  REJECTED: "danger", CANCELLED: "muted", RECONCILED: "success",
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

export default function GRNsPage() {
  const [rows, setRows] = React.useState<GRN[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<GRN[]>(`${API_BASE_URL}/purchases/rows`, {
        headers: authHeader(),
      });
      setRows(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the goods receipts."));
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
  const filtered = rows.filter((g) =>
    !search || g.grnNo.toLowerCase().includes(search.toLowerCase()) || g.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<GRN>[] = [
    { key: "grnNo", header: "GRN #", cell: (g) => (
        <div>
          <div className="tabular text-sm font-medium text-navy-900 dark:text-white">{g.grnNo}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(g.receiptDate)}</div>
        </div>
      )
    },
    { key: "poNo", header: "PO Ref", cell: (g) => <Link href={`/purchases/orders/${g.poId}`} className="tabular text-xs font-medium text-brand-yellow-700 dark:text-brand-yellow hover:underline">{g.poNo}</Link> },
    { key: "supplier", header: "Supplier", cell: (g) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={g.supplierInitials} size="sm" />
          <span className="text-sm font-medium text-navy-900 dark:text-white">{g.supplierName}</span>
        </div>
      )
    },
    { key: "deliveryNoteNo", header: "DN #", cell: (g) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{g.deliveryNoteNo}</span> },
    { key: "vehicleNo", header: "Vehicle", cell: (g) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{g.vehicleNo}</span> },
    { key: "location", header: "Location", cell: (g) => <span className="text-xs text-slate-600 dark:text-slate-300">{g.location}</span> },
    { key: "units", header: "Units", align: "right", cell: (g) => (
        <div className="text-right">
          <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">{g.unitsAccepted}</div>
          {g.unitsDamaged > 0 && (
            <div className="text-2xs text-danger inline-flex items-center gap-0.5"><AlertTriangle className="size-2.5" />{g.unitsDamaged} damaged</div>
          )}
        </div>
      )
    },
    { key: "totalValue", header: "Value", align: "right", cell: (g) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(g.totalValue)}</span> },
    { key: "status", header: "Status", cell: (g) => <StatusPill variant={GRN_STATUS_VARIANT[g.status]}>{statusLabel(g.status)}</StatusPill> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Goods Receipts (GRN)" }]}
        title="Goods Receipts"
        subtitle="Record stock arrivals from suppliers"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/purchases/rows/new"><Plus /><span>New GRN</span></Link>
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
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">GRNs This Week</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">5</div>
            </div>
            <Package className="size-5 text-info" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">In Transit (POs)</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">2</div>
            </div>
            <Truck className="size-5 text-warning" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Units Received</div>
          <div className="text-2xl tabular font-bold text-success mt-1">1,000</div>
        </Card>
        <Card className="p-4 bg-danger/5 border-danger/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-danger-dark dark:text-danger-light">Damaged Units</div>
              <div className="text-2xl tabular font-bold text-danger mt-1">9</div>
            </div>
            <AlertTriangle className="size-5 text-danger" />
          </div>
        </Card>
      </div>

      <FilterBar searchPlaceholder="Search GRNs…" searchValue={search} onSearchChange={setSearch} />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <DataTable columns={columns} data={filtered} />
        )}
      </Card>
    </>
  );
}
