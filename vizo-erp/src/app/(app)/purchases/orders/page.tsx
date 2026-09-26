"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { Plus, Download, Loader2, AlertCircle, Package, Receipt, Truck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { Avatar } from "@/components/ui/avatar";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { downloadXlsx, exportError } from "@/lib/export";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";

/* GET /purchases/orders.

   NO STATUS since 26 Sep 2026 — the owner: "hamein kisi bhi status ki koi
   need nahi hai purchase order mein". A purchase order is received the moment
   it is written, so the old Awaiting Approval / Approved / Received counters,
   the received-% bar and the Expected column have nothing left to say. What a
   row shows instead: what was bought, where it landed, what we owe for it and
   what it will sell for, and the bill it raised. */
type PO = {
  id: number;
  poNo: string;
  supplierId: number;
  supplierName: string;
  supplierInitials: string;
  location: string;
  poDate: string;
  itemCount: number;
  units: number;
  total: number;
  saleValue: number;
  invoiceId: number | null;
  invoiceNo: string | null;
  createdBy: string;
  notes: string | null;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) return (e.response.data as { message?: string })?.message ?? fallback;
  return "Cannot reach the server.";
}

export default function PurchaseOrdersPage() {
  const [rows, setRows] = React.useState<PO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [exporting, setExporting] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<PO[]>(`${API_BASE_URL}/purchases/orders`, { headers: authHeader() });
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
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  const term = search.trim().toLowerCase();
  const filtered = React.useMemo(() => rows.filter((p) =>
    !term || p.poNo.toLowerCase().includes(term) || p.supplierName.toLowerCase().includes(term)
      || p.location.toLowerCase().includes(term)), [rows, term]);

  const monthStart = new Date().toISOString().slice(0, 7);
  const stats = {
    total: rows.length,
    thisMonth: rows.filter((p) => p.poDate.slice(0, 7) === monthStart).length,
    units: rows.reduce((s, p) => s + p.units, 0),
    owed: rows.reduce((s, p) => s + p.total, 0),
    saleValue: rows.reduce((s, p) => s + p.saleValue, 0),
  };

  const columns: Column<PO>[] = [
    { key: "poNo", header: "PO #", sortable: true, cell: (p) => (
      <div>
        <div className="tabular text-sm font-medium text-navy-900 dark:text-white">{p.poNo}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(p.poDate)}</div>
      </div>
    ) },
    { key: "supplierName", header: "Supplier", sortable: true, cell: (p) => (
      <div className="flex items-center gap-2.5">
        <Avatar initials={p.supplierInitials} size="sm" />
        <div className="min-w-0">
          <div className="font-medium text-navy-900 dark:text-white truncate">{p.supplierName}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Received at {p.location}</div>
        </div>
      </div>
    ) },
    { key: "units", header: "Items", align: "right", cell: (p) => (
      <span className="tabular text-sm text-slate-600 dark:text-slate-300">{p.itemCount} · {p.units} units</span>
    ) },
    { key: "total", header: "Owed to supplier", align: "right", sortable: true, cell: (p) => (
      <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(p.total)}</span>
    ) },
    { key: "saleValue", header: "Selling value", align: "right", sortable: true, cell: (p) => (
      <span className="tabular text-sm text-slate-600 dark:text-slate-300">{formatMoney(p.saleValue)}</span>
    ) },
    { key: "invoiceNo", header: "Bill", cell: (p) => p.invoiceNo
      ? <span className="tabular text-xs text-slate-600 dark:text-slate-300">{p.invoiceNo}</span>
      : <span className="text-2xs text-slate-400">—</span> },
  ];

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
        breadcrumbs={[{ label: "Purchases" }, { label: "Orders to Supplier" }]}
        title="Orders to Supplier"
        subtitle="Every purchase: saved once, received at once, billed and posted at once"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5" onClick={exportXlsx} disabled={exporting}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download />}
              <span className="hidden sm:inline">{exporting ? "Exporting…" : "Export"}</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/purchases/orders/new"><Plus /><span>New purchase order</span></Link>
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
        <Card className="p-4"><Stat icon={<Truck className="size-5 text-slate-400" />} label="Purchase orders" value={stats.total.toString()} sub={`${stats.thisMonth} this month`} /></Card>
        <Card className="p-4"><Stat icon={<Package className="size-5 text-slate-400" />} label="Units bought" value={stats.units.toLocaleString()} /></Card>
        <Card className="p-4"><Stat icon={<Receipt className="size-5 text-slate-400" />} label="Owed to suppliers" value={formatCompact(stats.owed)} sub="all bills raised" /></Card>
        <Card className="p-4"><Stat label="Selling value" value={formatCompact(stats.saleValue)} sub="at their purchase prices" /></Card>
      </div>

      <FilterBar searchPlaceholder="Search by PO number, supplier or location…" searchValue={search} onSearchChange={setSearch} />

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

function Stat({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
        <div className="text-2xl tabular font-bold mt-1 text-navy-900 dark:text-white">{value}</div>
        {sub && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>}
      </div>
      {icon}
    </div>
  );
}
