"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { AlertCircle, RefreshCw, Truck, PackageCheck, PackageX } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentActions } from "@/components/widgets/document-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /purchases/grns/{id}. qtyAccepted is qtyReceived - qtyDamaged, computed
   by the API; only accepted units reach stock. */
type GrnLine = {
  id: number; lineNo: number; productId: number; sku: string; name: string;
  qtyReceived: number; qtyDamaged: number; qtyAccepted: number;
  unitCost: number; batchNo: string | null; expiryDate: string | null;
};

type Grn = {
  id: number; grnNo: string;
  poId: number | null; poNo: string | null;
  supplierId: number; supplierName: string; supplierInitials: string;
  locationId: number; location: string;
  receiptDate: string; deliveryNoteNo: string | null; vehicleNo: string | null;
  totalValue: number; status: string; statusName: string;
  receivedBy: string | null; notes: string | null;
  lines: GrnLine[];
};

const STATUS_VARIANT: Record<string, "muted" | "info" | "success" | "warning" | "danger"> = {
  DRAFT: "muted", POSTED: "success", CANCELLED: "danger", VOID: "danger",
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function GrnDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);

  const [grn, setGrn] = React.useState<Grn | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    try {
      const res = await axios.get<Grn>(`${API_BASE_URL}/purchases/grns/${id}`, { headers: authHeader() });
      setGrn(res.data);
      setNotFound(false);
      setError(null);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true);
      else setError(apiMessage(e, "Could not load this goods receipt."));
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
        <PageHeader breadcrumbs={[{ label: "Purchases" }, { label: "GRNs", href: "/purchases/grns" }]} title="Loading…" />
        <Skeleton className="h-64" />
      </>
    );
  }

  if (notFound) {
    return (
      <EmptyState icon={AlertCircle} title="Goods receipt not found" description={`No goods receipt with id ${id}.`}
        action={<Button variant="accent" asChild><Link href="/purchases/grns">Back to GRNs</Link></Button>} />
    );
  }

  if (error || !grn) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Purchases" }, { label: "GRNs", href: "/purchases/grns" }]} title="Goods Receipt" />
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

  const received = grn.lines.reduce((s, l) => s + l.qtyReceived, 0);
  const damaged = grn.lines.reduce((s, l) => s + l.qtyDamaged, 0);
  const accepted = grn.lines.reduce((s, l) => s + l.qtyAccepted, 0);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "GRNs", href: "/purchases/grns" }, { label: grn.grnNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{grn.grnNo}</span>
            <StatusPill variant={STATUS_VARIANT[grn.status] ?? "muted"}>{grn.statusName}</StatusPill>
          </div>
        }
        subtitle={`Received ${formatDate(grn.receiptDate)} into ${grn.location}${grn.receivedBy ? ` by ${grn.receivedBy}` : ""}`}
        actions={
          <>
            <DocumentActions kind="goods-receipt" id={id} label="goods receipt" />
            <Button variant="ghost" className="gap-1.5" onClick={() => void load()}><RefreshCw className="size-4" />Refresh</Button>
          </>
        }
      />

      {grn.status === "DRAFT" && (
        <Card className="mb-6 border-warning/40 bg-warning/5">
          <CardBody className="flex items-start gap-3 py-3">
            <AlertCircle className="size-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 dark:text-slate-200">
              This receipt is still a draft, so none of it has reached stock yet.
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Units Received" value={formatNumber(received)} icon={PackageCheck} tone="text-navy-900 dark:text-white" />
        <Stat label="Damaged" value={formatNumber(damaged)} icon={PackageX} tone={damaged > 0 ? "text-danger" : "text-slate-400"} />
        <Stat label="Accepted into Stock" value={formatNumber(accepted)} icon={PackageCheck} tone="text-success" />
        <Stat label="Total Value" value={formatMoney(grn.totalValue)} icon={Truck} tone="text-navy-900 dark:text-white" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700">
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">Items</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {grn.lines.length} {grn.lines.length === 1 ? "line" : "lines"}
              </p>
            </div>
            {grn.lines.length === 0 ? (
              <CardBody><EmptyState icon={AlertCircle} title="No lines on this receipt" /></CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Product</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Received</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Damaged</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Accepted</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    {grn.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-3">
                          <Link href={`/inventory/products/${l.productId}`} className="text-sm font-medium text-navy-900 dark:text-white hover:text-brand-yellow">
                            {l.name}
                          </Link>
                          <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">
                            {l.sku}
                            {l.batchNo && <> · batch {l.batchNo}</>}
                            {l.expiryDate && <> · expires {formatDate(l.expiryDate)}</>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular text-sm text-navy-900 dark:text-white">{formatNumber(l.qtyReceived)}</td>
                        <td className={cn("px-4 py-3 text-right tabular text-sm", l.qtyDamaged > 0 ? "text-danger font-semibold" : "text-slate-400")}>
                          {l.qtyDamaged > 0 ? formatNumber(l.qtyDamaged) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular text-sm font-semibold text-success">{formatNumber(l.qtyAccepted)}</td>
                        <td className="px-4 py-3 text-right tabular text-sm text-slate-700 dark:text-slate-300">{formatMoney(l.unitCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-5 py-4 border-t border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/40 flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-300">Total value received</span>
              <span className="tabular text-base font-bold text-navy-900 dark:text-white">{formatMoney(grn.totalValue)}</span>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Supplier</h3>
                <Link href={`/parties/${grn.supplierId}`} className="text-xs text-brand-yellow hover:underline font-medium">View</Link>
              </div>
              <div className="flex items-center gap-3">
                <Avatar initials={grn.supplierInitials} size="lg" />
                <div className="font-semibold text-navy-900 dark:text-white">{grn.supplierName}</div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Receipt Details</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="Received" value={formatDate(grn.receiptDate)} />
                <Meta label="Into" value={grn.location} />
                <Meta label="Received By" value={grn.receivedBy ?? "—"} />
                <Meta label="Delivery Note" value={grn.deliveryNoteNo || "—"} />
                <Meta label="Vehicle" value={grn.vehicleNo || "—"} />
                <Meta
                  label="Against PO"
                  value={grn.poId
                    ? <Link href={`/purchases/orders/${grn.poId}`} className="text-brand-yellow hover:underline">{grn.poNo}</Link>
                    : <Badge variant="muted">Direct receipt</Badge>}
                />
              </dl>
              {grn.notes && (
                <p className="mt-3 pt-3 border-t border-slate-100 dark:border-navy-700 text-xs text-slate-600 dark:text-slate-300">
                  {grn.notes}
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Truck; tone: string }) {
  return (
    <Card className="p-4">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cn("text-2xl tabular font-bold mt-1 inline-flex items-center gap-2", tone)}>
        <Icon className="size-4" />{value}
      </div>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-navy-900 dark:text-white">{value}</dd>
    </div>
  );
}
