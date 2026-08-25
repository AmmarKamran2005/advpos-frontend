"use client";

import * as React from "react";
import axios from "axios";
import { ArrowUpRight, ArrowDownRight, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /inventory/movements -> { total, page, pageSize, items }.

   This page used to render a hardcoded array of eight invented movements. Every
   row now comes from the "StockMovement" table, which is written by the packing
   bench, goods receipts, transfers, adjustments and returns.

   These are the real "MovementType".TypeKey values. */
type MovementType =
  | "PURCHASE" | "SALE" | "TRANSFER_OUT" | "TRANSFER_IN"
  | "ADJUSTMENT" | "SALE_RETURN" | "PURCHASE_RETURN";

type Movement = {
  id: number;
  productId: number;
  sku: string;
  name: string;
  locationId: number;
  locationName: string;
  movementType: MovementType;
  movementTypeName: string;
  movedAt: string;
  referenceNo: string;
  qty: number;
  balanceAfter: number;
  user: string;
};

type MovementPage = { total: number; page: number; pageSize: number; items: Movement[] };

const TYPE_VARIANT: Record<MovementType, "success" | "danger" | "info" | "warning" | "muted"> = {
  PURCHASE:        "success",
  SALE:            "danger",
  TRANSFER_OUT:    "warning",
  TRANSFER_IN:     "info",
  ADJUSTMENT:      "muted",
  SALE_RETURN:     "info",
  PURCHASE_RETURN: "warning",
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function MovementsPage() {
  const [rows, setRows] = React.useState<Movement[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [locationId, setLocationId] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<MovementPage>(`${API_BASE_URL}/inventory/movements`, {
        params: { pageSize: 200, locationId: locationId ?? undefined },
        headers: authHeader(),
      });
      setRows(res.data.items);
      setTotal(res.data.total);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the stock movements."));
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q) ||
        m.referenceNo.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const columns: Column<Movement>[] = [
    {
      key: "movedAt",
      header: "When",
      sortable: true,
      cell: (m) => {
        const d = new Date(m.movedAt);
        return (
          <div>
            <div className="text-xs font-medium text-navy-900 dark:text-white">{formatDate(m.movedAt)}</div>
            <div className="text-2xs text-slate-500 dark:text-slate-400">
              {d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        );
      },
    },
    {
      key: "name",
      header: "Product",
      sortable: true,
      cell: (m) => (
        <div className="min-w-0">
          <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{m.name}</div>
          <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{m.sku}</div>
        </div>
      ),
    },
    {
      key: "movementType",
      header: "Type",
      sortable: true,
      cell: (m) => <Badge variant={TYPE_VARIANT[m.movementType] ?? "muted"}>{m.movementTypeName}</Badge>,
    },
    {
      key: "referenceNo",
      header: "Reference",
      cell: (m) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{m.referenceNo}</span>,
    },
    {
      key: "locationName",
      header: "Location",
      cell: (m) => <span className="text-xs text-slate-600 dark:text-slate-300">{m.locationName}</span>,
    },
    {
      key: "qty",
      header: "Qty",
      sortable: true,
      align: "right",
      cell: (m) => (
        <span
          className={cn(
            "inline-flex items-center gap-1 tabular text-sm font-semibold",
            m.qty >= 0 ? "text-success" : "text-danger"
          )}
        >
          {m.qty >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {m.qty > 0 ? `+${m.qty}` : m.qty}
        </span>
      ),
    },
    {
      key: "balanceAfter",
      header: "Balance",
      align: "right",
      cell: (m) => <span className="tabular text-sm text-navy-900 dark:text-white">{m.balanceAfter}</span>,
    },
    {
      key: "user",
      header: "By",
      cell: (m) => <span className="text-xs text-slate-600 dark:text-slate-300">{m.user}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Movements" }]}
        title="Stock Movements"
        subtitle={loading ? "Every in and out, with the running balance" : `${total} movements recorded`}
        actions={
          <ReportToolbar
            mode="asOf"
            reportName="Stock Movements"
            locationId={locationId}
            onLocationChange={setLocationId}
          />
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
        searchPlaceholder="Product, SKU or reference…"
        searchValue={search}
        onSearchChange={setSearch}
        chips={[]}
        onClearAll={() => setSearch("")}
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {rows.length === 0 ? "No stock has moved yet." : "Nothing matches that search."}
          </div>
        ) : (
          <DataTable columns={columns} data={filtered} pageSize={15} />
        )}
      </Card>
    </>
  );
}
