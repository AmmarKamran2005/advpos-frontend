"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  AlertCircle, RefreshCw, ArrowRight, PackageCheck, Loader2, Truck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentActions } from "@/components/widgets/document-actions";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /inventory/transfers/{id}. The page held a SAMPLE_ITEMS array, so every
   transfer id showed the same invented lines. */
type TransferLine = {
  id: number; lineNo: number; productId: number; sku: string; name: string;
  qty: number; packing: number;
};

type Transfer = {
  id: number; transferNo: string;
  fromLocationId: number; fromLocation: string;
  toLocationId: number; toLocation: string;
  transferDate: string; receivedOn: string | null;
  status: string; statusName: string;
  initiatedBy: string | null; approvedBy: string | null;
  notes: string | null;
  lines: TransferLine[];
};

const STATUS_VARIANT: Record<string, "muted" | "info" | "success" | "warning" | "danger"> = {
  DRAFT: "muted", PENDING_APPROVAL: "warning", APPROVED: "info",
  IN_TRANSIT: "info", RECEIVED: "success", CANCELLED: "danger",
};

/* Where a transfer is in its life. The database also carries DRAFT and
   CANCELLED, which sit outside this line rather than on it. */
const FLOW = ["PENDING_APPROVAL", "APPROVED", "IN_TRANSIT", "RECEIVED"];
const FLOW_LABEL: Record<string, string> = {
  PENDING_APPROVAL: "Awaiting approval",
  APPROVED: "Approved",
  IN_TRANSIT: "On the way",
  RECEIVED: "Received",
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function TransferDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);

  const [transfer, setTransfer] = React.useState<Transfer | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [receiving, setReceiving] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    try {
      const res = await axios.get<Transfer>(`${API_BASE_URL}/inventory/transfers/${id}`, { headers: authHeader() });
      setTransfer(res.data);
      setNotFound(false);
      setError(null);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true);
      else setError(apiMessage(e, "Could not load this transfer."));
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

  async function receive() {
    if (!transfer) return;
    setReceiving(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/inventory/transfers/${transfer.id}/receive`, {}, { headers: authHeader() }
      );
      await load();
      toast.success("Transfer received", { description: res.data.message });
    } catch (e) {
      toast.error("Not received", { description: apiMessage(e, "Please try again.") });
    } finally {
      setReceiving(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Inventory" }, { label: "Transfers", href: "/inventory/transfers" }]} title="Loading…" />
        <Skeleton className="h-64" />
      </>
    );
  }

  if (notFound) {
    return (
      <EmptyState icon={AlertCircle} title="Transfer not found" description={`No stock transfer with id ${id}.`}
        action={<Button variant="accent" asChild><Link href="/inventory/transfers">Back to Transfers</Link></Button>} />
    );
  }

  if (error || !transfer) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Inventory" }, { label: "Transfers", href: "/inventory/transfers" }]} title="Stock Transfer" />
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

  const stageIdx = FLOW.indexOf(transfer.status);
  const units = transfer.lines.reduce((s, l) => s + l.qty, 0);
  const canReceive = transfer.status === "IN_TRANSIT" || transfer.status === "APPROVED";

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Transfers", href: "/inventory/transfers" }, { label: transfer.transferNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{transfer.transferNo}</span>
            <StatusPill variant={STATUS_VARIANT[transfer.status] ?? "muted"}>{transfer.statusName}</StatusPill>
          </div>
        }
        subtitle={`${transfer.fromLocation} → ${transfer.toLocation} · raised ${formatDate(transfer.transferDate)}`}
        actions={
          <>
            <DocumentActions kind="stock-transfer" id={id} label="stock transfer" />
            <Button variant="ghost" className="gap-1.5" onClick={() => void load()}><RefreshCw className="size-4" />Refresh</Button>
            {canReceive && (
              <Button variant="accent" className="gap-1.5" onClick={() => void receive()} disabled={receiving}>
                {receiving ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
                Mark received
              </Button>
            )}
          </>
        }
      />

      {/* Route */}
      <Card className="mb-6">
        <CardBody className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">From</div>
            <div className="text-base font-semibold text-navy-900 dark:text-white mt-0.5">{transfer.fromLocation}</div>
          </div>
          <ArrowRight className="size-5 text-brand-yellow shrink-0" />
          <div className="flex-1">
            <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">To</div>
            <div className="text-base font-semibold text-navy-900 dark:text-white mt-0.5">{transfer.toLocation}</div>
          </div>
          <div className="sm:text-right">
            <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Units moving</div>
            <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-0.5">{formatNumber(units)}</div>
          </div>
        </CardBody>
      </Card>

      {/* Pipeline */}
      {transfer.status !== "CANCELLED" && transfer.status !== "DRAFT" && (
        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center gap-2">
              {FLOW.map((st, i) => {
                const done = stageIdx >= i;
                return (
                  <React.Fragment key={st}>
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <div className={cn(
                        "size-8 rounded-full flex items-center justify-center text-xs font-bold",
                        done ? "bg-success text-white" : "bg-slate-100 dark:bg-navy-800 text-slate-400"
                      )}>
                        {done ? <PackageCheck className="size-4" /> : i + 1}
                      </div>
                      <span className={cn("text-2xs font-medium text-center", done ? "text-navy-900 dark:text-white" : "text-slate-400")}>
                        {FLOW_LABEL[st]}
                      </span>
                    </div>
                    {i < FLOW.length - 1 && (
                      <div className={cn("h-0.5 flex-1 rounded", stageIdx > i ? "bg-success" : "bg-slate-100 dark:bg-navy-800")} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700">
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">Items</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {transfer.lines.length} {transfer.lines.length === 1 ? "line" : "lines"}
              </p>
            </div>
            {transfer.lines.length === 0 ? (
              <CardBody><EmptyState icon={AlertCircle} title="No lines on this transfer" /></CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Product</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Qty</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Packets</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    {transfer.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-3">
                          <Link href={`/inventory/products/${l.productId}`} className="text-sm font-medium text-navy-900 dark:text-white hover:text-brand-yellow">
                            {l.name}
                          </Link>
                          <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">{l.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{formatNumber(l.qty)}</td>
                        <td className="px-4 py-3 text-right tabular text-xs text-slate-500 dark:text-slate-400">
                          {l.packing > 0 ? `${Math.floor(l.qty / l.packing)} × ${l.packing}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3 inline-flex items-center gap-2">
                <Truck className="size-4 text-slate-400" /> Transfer Details
              </h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="Raised" value={formatDate(transfer.transferDate)} />
                <Meta label="Received" value={transfer.receivedOn ? formatDate(transfer.receivedOn) : "Not yet"} />
                <Meta label="Initiated by" value={transfer.initiatedBy ?? "—"} />
                <Meta label="Approved by" value={transfer.approvedBy ?? "Not approved"} />
              </dl>
              {transfer.notes && (
                <p className="mt-3 pt-3 border-t border-slate-100 dark:border-navy-700 text-xs text-slate-600 dark:text-slate-300">
                  {transfer.notes}
                </p>
              )}
              {canReceive && (
                <p className="mt-3 text-2xs text-slate-500 dark:text-slate-400">
                  Receiving moves the stock out of {transfer.fromLocation} and into {transfer.toLocation}.
                </p>
              )}
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
