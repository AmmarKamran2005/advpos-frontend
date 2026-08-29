"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  AlertCircle, RefreshCw, ArrowUpRight, ArrowDownRight, ClipboardList,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentActions } from "@/components/widgets/document-actions";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /inventory/adjustments/{id}. The page used to hold two arrays declared at
   the top of the file, so every adjustment id opened the same three sample
   lines. `delta` and `costPrice` are computed by the API. */
type AdjLine = {
  id: number; lineNo: number; productId: number; sku: string; name: string;
  currentQty: number; newQty: number; delta: number; costPrice: number;
};

type Adjustment = {
  id: number; adjustmentNo: string;
  locationId: number; locationName: string;
  adjustmentDate: string;
  reason: string; reasonName: string; reasonNotes: string | null;
  status: string; statusName: string;
  createdBy: string | null;
  lines: AdjLine[];
};

const STATUS_VARIANT: Record<string, "muted" | "success" | "warning" | "danger"> = {
  DRAFT: "muted", POSTED: "success", CANCELLED: "danger", VOID: "danger",
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function AdjustmentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);

  const [adj, setAdj] = React.useState<Adjustment | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    try {
      const res = await axios.get<Adjustment>(`${API_BASE_URL}/inventory/adjustments/${id}`, { headers: authHeader() });
      setAdj(res.data);
      setNotFound(false);
      setError(null);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true);
      else setError(apiMessage(e, "Could not load this adjustment."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  if (loading) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Inventory" }, { label: "Adjustments", href: "/inventory/adjustments" }]} title="Loading…" />
        <Skeleton className="h-64" />
      </>
    );
  }

  if (notFound) {
    return (
      <EmptyState icon={AlertCircle} title="Adjustment not found" description={`No stock adjustment with id ${id}.`}
        action={<Button variant="accent" asChild><Link href="/inventory/adjustments">Back to Adjustments</Link></Button>} />
    );
  }

  if (error || !adj) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Inventory" }, { label: "Adjustments", href: "/inventory/adjustments" }]} title="Stock Adjustment" />
        <Card><CardBody className="flex items-center gap-3">
          <AlertCircle className="size-5 text-danger shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-navy-900 dark:text-white">{error}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">The API must be running on {API_BASE_URL}.</div>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
            <RefreshCw className="size-4" /> Try again
          </Button>
        </CardBody></Card>
      </>
    );
  }

  const netDelta = adj.lines.reduce((s, l) => s + l.delta, 0);
  const added = adj.lines.filter((l) => l.delta > 0).reduce((s, l) => s + l.delta, 0);
  const removed = adj.lines.filter((l) => l.delta < 0).reduce((s, l) => s + Math.abs(l.delta), 0);
  const valueDelta = adj.lines.reduce((s, l) => s + l.delta * l.costPrice, 0);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Adjustments", href: "/inventory/adjustments" }, { label: adj.adjustmentNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{adj.adjustmentNo}</span>
            <StatusPill variant={STATUS_VARIANT[adj.status] ?? "muted"}>{adj.statusName}</StatusPill>
          </div>
        }
        subtitle={`${formatDate(adj.adjustmentDate)} · ${adj.locationName}${adj.createdBy ? ` · ${adj.createdBy}` : ""}`}
        actions={
          <>
            <DocumentActions kind="stock-adjustment" id={id} label="stock adjustment" />
            <Button variant="ghost" className="gap-1.5" onClick={() => void load()}><RefreshCw className="size-4" />Refresh</Button>
          </>
        }
      />

      <Card className="mb-6">
        <CardBody className="flex items-start gap-3 py-3">
          <ClipboardList className="size-4 text-brand-yellow shrink-0 mt-0.5" />
          <div>
            <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
              {adj.reasonName}
            </div>
            <p className="text-sm text-navy-900 dark:text-white mt-0.5">{adj.reasonNotes || "No further notes."}</p>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Fig label="Lines" value={String(adj.lines.length)} />
        <Fig label="Units added" value={formatNumber(added)} tone="text-success" />
        <Fig label="Units removed" value={formatNumber(removed)} tone="text-danger" />
        <Fig label="Value change" value={formatMoney(valueDelta)} tone={valueDelta >= 0 ? "text-success" : "text-danger"} />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700 flex items-center justify-between">
          <h3 className="text-base font-semibold text-navy-900 dark:text-white">What changed</h3>
          <span className={cn("tabular text-sm font-bold", netDelta > 0 ? "text-success" : netDelta < 0 ? "text-danger" : "text-slate-500")}>
            {netDelta > 0 ? "+" : ""}{formatNumber(netDelta)} units net
          </span>
        </div>
        {adj.lines.length === 0 ? (
          <CardBody><EmptyState icon={AlertCircle} title="No lines on this adjustment" /></CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Product</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">System said</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Counted</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Δ</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {adj.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3">
                      <Link href={`/inventory/products/${l.productId}`} className="text-sm font-medium text-navy-900 dark:text-white hover:text-brand-yellow">
                        {l.name}
                      </Link>
                      <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">{l.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular text-sm text-slate-600 dark:text-slate-300">{formatNumber(l.currentQty)}</td>
                    <td className="px-4 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{formatNumber(l.newQty)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("tabular text-sm font-bold inline-flex items-center gap-1",
                        l.delta > 0 ? "text-success" : l.delta < 0 ? "text-danger" : "text-slate-400")}>
                        {l.delta !== 0 && (l.delta > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />)}
                        {l.delta > 0 ? "+" : ""}{l.delta}
                      </span>
                    </td>
                    <td className={cn("px-4 py-3 text-right tabular text-sm", l.delta >= 0 ? "text-slate-600 dark:text-slate-300" : "text-danger")}>
                      {formatMoney(l.delta * l.costPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/40 text-xs text-slate-500 dark:text-slate-400">
          A posted adjustment writes a stock movement per changed line. It cannot be undone — correct it with another adjustment.
        </div>
      </Card>
    </>
  );
}

function Fig({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cn("text-2xl tabular font-bold mt-1", tone ?? "text-navy-900 dark:text-white")}>{value}</div>
    </Card>
  );
}
