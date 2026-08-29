"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { AlertCircle, RefreshCw, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentActions } from "@/components/widgets/document-actions";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate, formatNumber } from "@/lib/format";

/* GET /purchases/returns/{id} — goods going back to a supplier. */
type PrLine = {
  id: number; lineNo: number; productId: number; sku: string; name: string;
  qty: number; unitCost: number; lineTotal: number;
};

type PurchaseReturn = {
  id: number; returnNo: string;
  piId: number | null; invoiceNo: string | null;
  supplierId: number; supplierName: string; supplierInitials: string;
  location: string; returnDate: string; reason: string | null;
  status: string; statusName: string; createdBy: string | null;
  totalAmount: number;
  lines: PrLine[];
};

const STATUS_VARIANT: Record<string, "muted" | "info" | "success" | "warning" | "danger"> = {
  DRAFT: "muted", PENDING_APPROVAL: "warning", APPROVED: "success",
  POSTED: "success", REJECTED: "danger", CANCELLED: "danger",
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function PurchaseReturnDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);

  const [pr, setPr] = React.useState<PurchaseReturn | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    try {
      const res = await axios.get<PurchaseReturn>(`${API_BASE_URL}/purchases/returns/${id}`, { headers: authHeader() });
      setPr(res.data);
      setNotFound(false);
      setError(null);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true);
      else setError(apiMessage(e, "Could not load this purchase return."));
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
        <PageHeader breadcrumbs={[{ label: "Purchases" }, { label: "Returns", href: "/purchases/returns" }]} title="Loading…" />
        <Skeleton className="h-64" />
      </>
    );
  }

  if (notFound) {
    return (
      <EmptyState icon={AlertCircle} title="Purchase return not found" description={`No purchase return with id ${id}.`}
        action={<Button variant="accent" asChild><Link href="/purchases/returns">Back to Returns</Link></Button>} />
    );
  }

  if (error || !pr) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Purchases" }, { label: "Returns", href: "/purchases/returns" }]} title="Purchase Return" />
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

  const units = pr.lines.reduce((s, l) => s + l.qty, 0);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Returns", href: "/purchases/returns" }, { label: pr.returnNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{pr.returnNo}</span>
            <StatusPill variant={STATUS_VARIANT[pr.status] ?? "muted"}>{pr.statusName}</StatusPill>
          </div>
        }
        subtitle={`${pr.supplierName} · ${formatDate(pr.returnDate)} · from ${pr.location}`}
        actions={
          <>
            <DocumentActions kind="purchase-return" id={id} label="purchase return" />
            <Button variant="ghost" className="gap-1.5" onClick={() => void load()}><RefreshCw className="size-4" />Refresh</Button>
          </>
        }
      />

      {pr.reason && (
        <Card className="mb-6">
          <CardBody className="flex items-start gap-3 py-3">
            <Undo2 className="size-4 text-warning shrink-0 mt-0.5" />
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Why it went back</div>
              <p className="text-sm text-navy-900 dark:text-white mt-0.5">{pr.reason}</p>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700">
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">Items returned</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {pr.lines.length} {pr.lines.length === 1 ? "line" : "lines"} · {formatNumber(units)} units
              </p>
            </div>
            {pr.lines.length === 0 ? (
              <CardBody><EmptyState icon={AlertCircle} title="No lines on this return" /></CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Product</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Qty</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Cost</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    {pr.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-3">
                          <Link href={`/inventory/products/${l.productId}`} className="text-sm font-medium text-navy-900 dark:text-white hover:text-brand-yellow">
                            {l.name}
                          </Link>
                          <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">{l.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-right tabular text-sm text-navy-900 dark:text-white">{formatNumber(l.qty)}</td>
                        <td className="px-4 py-3 text-right tabular text-sm text-slate-700 dark:text-slate-300">{formatMoney(l.unitCost)}</td>
                        <td className="px-4 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(l.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-5 py-4 border-t border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/40 flex items-center justify-between">
              <span className="text-sm font-bold text-navy-900 dark:text-white">Credit due from supplier</span>
              <span className="tabular text-base font-bold text-navy-900 dark:text-white">{formatMoney(pr.totalAmount)}</span>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Supplier</h3>
                <Link href={`/parties/${pr.supplierId}`} className="text-xs text-brand-yellow hover:underline font-medium">View</Link>
              </div>
              <div className="flex items-center gap-3">
                <Avatar initials={pr.supplierInitials} size="lg" />
                <div className="font-semibold text-navy-900 dark:text-white">{pr.supplierName}</div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Return Details</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="Return Date" value={formatDate(pr.returnDate)} />
                <Meta label="From" value={pr.location} />
                <Meta label="Created By" value={pr.createdBy ?? "—"} />
                <Meta
                  label="Against Invoice"
                  value={pr.piId
                    ? <Link href={`/purchases/invoices/${pr.piId}`} className="text-brand-yellow hover:underline">{pr.invoiceNo}</Link>
                    : "—"}
                />
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
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
