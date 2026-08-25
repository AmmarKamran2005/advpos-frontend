"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { Plus, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /inventory/adjustments

   This page used to render five hardcoded rows. netUnits is the sum of
   (NewQty - CurrentQty) across the lines, computed by the API -- it is what the
   correction actually did to the shelf. */
type Adjustment = {
  id: number;
  adjustmentNo: string;
  locationId: number;
  locationName: string;
  adjustmentDate: string;
  reason: string;
  reasonName: string;
  reasonNotes: string | null;
  status: string;
  statusName: string;
  createdBy: string;
  itemCount: number;
  netUnits: number;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function AdjustmentsPage() {
  const [rows, setRows] = React.useState<Adjustment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Adjustment[]>(`${API_BASE_URL}/inventory/adjustments`, {
        headers: authHeader(),
      });
      setRows(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the stock adjustments."));
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
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (a) =>
        a.adjustmentNo.toLowerCase().includes(q) ||
        a.reasonName.toLowerCase().includes(q) ||
        a.locationName.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const columns: Column<Adjustment>[] = [
    { key: "adjustmentNo", header: "Adjustment #", sortable: true,
      cell: (a) => <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{a.adjustmentNo}</span> },
    { key: "adjustmentDate", header: "Date", sortable: true,
      cell: (a) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(a.adjustmentDate)}</span> },
    { key: "locationName", header: "Location",
      cell: (a) => <span className="text-sm text-slate-700 dark:text-slate-200">{a.locationName}</span> },
    { key: "reasonName", header: "Reason",
      cell: (a) => (
        <div className="min-w-0">
          <div className="text-sm text-slate-700 dark:text-slate-200">{a.reasonName}</div>
          {a.reasonNotes && <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">{a.reasonNotes}</div>}
        </div>
      ) },
    { key: "itemCount", header: "Lines", align: "right",
      cell: (a) => <Badge variant="muted">{a.itemCount}</Badge> },
    { key: "netUnits", header: "Net Units", align: "right", sortable: true,
      cell: (a) => (
        <span className={cn("tabular text-sm font-semibold",
          a.netUnits > 0 ? "text-success" : a.netUnits < 0 ? "text-danger" : "text-slate-400")}>
          {a.netUnits > 0 ? `+${a.netUnits}` : a.netUnits}
        </span>
      ) },
    { key: "status", header: "Status",
      cell: (a) => (
        <StatusPill variant={a.status === "POSTED" ? "success" : a.status === "DRAFT" ? "muted" : "warning"}>
          {a.statusName}
        </StatusPill>
      ) },
    { key: "createdBy", header: "By",
      cell: (a) => <span className="text-xs text-slate-600 dark:text-slate-300">{a.createdBy}</span> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Adjustments" }]}
        title="Stock Adjustments"
        subtitle="Corrections between what the system thought and what was counted"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/inventory/adjustments/new"><Plus /><span>New Adjustment</span></Link>
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

      <FilterBar
        searchPlaceholder="Adjustment number, reason or location…"
        searchValue={search}
        onSearchChange={setSearch}
        chips={[]}
        onClearAll={() => setSearch("")}
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {rows.length === 0 ? "No stock corrections recorded yet." : "Nothing matches that search."}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            rowHref={(a) => `/inventory/adjustments/${a.id}`}
            pageSize={15}
          />
        )}
      </Card>
    </>
  );
}
