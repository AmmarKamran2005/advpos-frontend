"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  AlertCircle, CheckCircle2, Printer, Phone, MapPin, Plus,
  RefreshCw, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/labels";

/* GET /purchases/orders/{id}. `lines` and `receipts` are real -- the old page
   rendered three hard-coded items and a four-step invented activity feed
   ("System emailed PO to supplier") no matter which order you opened. */
type PoLine = {
  id: number; lineNo: number; productId: number; sku: string; name: string;
  packing: number; qty: number; unitCost: number; taxPercent: number; lineTotal: number;
  received: number;
};

type PoReceipt = {
  id: number; grnNo: string; receiptDate: string; status: string;
  statusName: string; receivedBy: string | null; unitsReceived: number;
};

type PurchaseOrder = {
  id: number; poNo: string;
  supplierId: number; supplierName: string; supplierInitials: string;
  supplierCode: string | null; supplierPhone: string | null;
  locationId: number; location: string;
  poDate: string; expectedDate: string | null;
  status: string; statusName: string;
  subtotal: number; discount: number; tax: number; total: number;
  notes: string | null;
  createdBy: string | null; approvedBy: string | null;
  lines: PoLine[];
  receipts: PoReceipt[];
};

const STATE_FLOW = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "PARTIALLY_RECEIVED", "RECEIVED"];

const STATUS_VARIANT: Record<string, "muted" | "info" | "success" | "warning" | "danger"> = {
  DRAFT: "muted",
  PENDING_APPROVAL: "warning",
  APPROVED: "info",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "danger",
  CLOSED: "muted",
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function PODetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);

  const [po, setPo] = React.useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [approving, setApproving] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    try {
      const res = await axios.get<PurchaseOrder>(`${API_BASE_URL}/purchases/orders/${id}`, { headers: authHeader() });
      setPo(res.data);
      setNotFound(false);
      setError(null);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true);
      else setError(apiMessage(e, "Could not load this purchase order."));
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

  async function approve() {
    if (!po) return;
    setApproving(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/purchases/orders/${po.id}/approve`, {}, { headers: authHeader() }
      );
      await load();
      toast.success("Purchase order approved", { description: res.data.message });
    } catch (e) {
      toast.error("Not approved", { description: apiMessage(e, "Please try again.") });
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Purchases" }, { label: "POs", href: "/purchases/orders" }]} title="Loading…" />
        <Skeleton className="h-24 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><Skeleton className="h-72" /></div>
          <Skeleton className="h-72" />
        </div>
      </>
    );
  }

  if (notFound) {
    return (
      <EmptyState icon={AlertCircle} title="Purchase order not found" description={`No purchase order with id ${id}.`}
        action={<Button variant="accent" asChild><Link href="/purchases/orders">Back to Purchase Orders</Link></Button>} />
    );
  }

  if (error || !po) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Purchases" }, { label: "POs", href: "/purchases/orders" }]} title="Purchase Order" />
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

  const stateIdx = STATE_FLOW.indexOf(po.status);
  const orderedUnits = po.lines.reduce((s, l) => s + l.qty, 0);
  /* Off the lines, not the receipts: the API counts each line against POSTED
     receipts only, so a draft GRN sitting in the list does not inflate this. */
  const receivedUnits = po.lines.reduce((s, l) => s + l.received, 0);
  const receivedPercent = orderedUnits > 0 ? Math.round((receivedUnits / orderedUnits) * 100) : 0;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "POs", href: "/purchases/orders" }, { label: po.poNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{po.poNo}</span>
            <StatusPill variant={STATUS_VARIANT[po.status] ?? "muted"}>{po.statusName ?? statusLabel(po.status)}</StatusPill>
          </div>
        }
        subtitle={`Created ${formatDate(po.poDate)}${po.expectedDate ? ` · Expected ${formatDate(po.expectedDate)}` : ""} · ${po.location}`}
        actions={
          <>
            <Button variant="ghost" className="gap-1.5" onClick={() => window.print()}><Printer />Print</Button>
            <Button variant="ghost" className="gap-1.5" onClick={() => void load()}><RefreshCw className="size-4" />Refresh</Button>
            {(po.status === "PENDING_APPROVAL" || po.status === "DRAFT") && (
              <Button variant="accent" className="gap-1.5" onClick={() => void approve()} disabled={approving}>
                {approving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 />} Approve
              </Button>
            )}
            {(po.status === "APPROVED" || po.status === "PARTIALLY_RECEIVED") && (
              <Button variant="accent" className="gap-1.5" asChild>
                <Link href={`/purchases/grns/new?poId=${po.id}`}><Plus />Receive Goods (GRN)</Link>
              </Button>
            )}
          </>
        }
      />

      {/* Pipeline */}
      {po.status !== "DRAFT" && po.status !== "CANCELLED" && (
        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center justify-between gap-2">
              {STATE_FLOW.map((s, i) => {
                const passed = i <= stateIdx;
                const current = i === stateIdx;
                return (
                  <React.Fragment key={s}>
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <div className={cn(
                        "size-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                        current ? "bg-brand-yellow text-navy-900 ring-4 ring-brand-yellow/20"
                        : passed ? "bg-success text-white"
                        : "bg-slate-200 dark:bg-navy-700 text-slate-500"
                      )}>
                        {passed && !current ? <CheckCircle2 className="size-4" /> : i + 1}
                      </div>
                      <div className={cn("text-2xs font-semibold uppercase tracking-wider text-center",
                        passed ? "text-navy-900 dark:text-white" : "text-slate-400"
                      )}>
                        {s.replace("_", " ")}
                      </div>
                    </div>
                    {i < STATE_FLOW.length - 1 && (
                      <div className={cn("flex-1 h-0.5 -mt-6", i < stateIdx ? "bg-success" : "bg-slate-200 dark:bg-navy-700")} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white">Items</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {po.lines.length} {po.lines.length === 1 ? "product" : "products"} · {formatNumber(orderedUnits)} units ordered
                </p>
              </div>
              <Badge variant={receivedPercent === 100 ? "success" : receivedPercent > 0 ? "warning" : "muted"}>
                {receivedPercent}% received
              </Badge>
            </div>
            {po.lines.length === 0 ? (
              <CardBody><EmptyState icon={AlertCircle} title="No lines on this order" /></CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Product</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Ordered</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Received</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Cost</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Tax</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    {po.lines.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <Link href={`/inventory/products/${item.productId}`} className="text-sm font-medium text-navy-900 dark:text-white hover:text-brand-yellow">
                            {item.name}
                          </Link>
                          <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">{item.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-right tabular text-sm text-navy-900 dark:text-white">{formatNumber(item.qty)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className={cn("tabular text-sm font-semibold", item.received >= item.qty ? "text-success" : item.received > 0 ? "text-warning" : "text-slate-400")}>
                            {formatNumber(item.received)}
                          </div>
                          <div className="w-16 h-1 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden mt-1 ml-auto">
                            <div className="h-full bg-success" style={{ width: `${item.qty > 0 ? Math.min(100, (item.received / item.qty) * 100) : 0}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular text-sm text-slate-700 dark:text-slate-300">{formatMoney(item.unitCost)}</td>
                        <td className="px-4 py-3 text-right tabular text-xs text-slate-500 dark:text-slate-400">{item.taxPercent}%</td>
                        <td className="px-4 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-5 py-4 border-t border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/40">
              {/* Real figures off the order, not derived by dividing the total
                  by 1.18 the way the old page did. */}
              <div className="ml-auto max-w-xs space-y-1.5">
                <Row label="Subtotal" value={formatMoney(po.subtotal)} />
                {po.discount > 0 && <Row label="Discount" value={`− ${formatMoney(po.discount)}`} />}
                <Row label="Sales Tax" value={formatMoney(po.tax)} />
                <div className="border-t border-slate-200 dark:border-navy-700 pt-2 mt-2">
                  <Row label="Total" value={formatMoney(po.total)} bold />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardBody>
              <Tabs defaultValue="grns">
                <TabsList>
                  <TabsTrigger value="grns">Goods Received ({po.receipts.length})</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>
                <TabsContent value="grns">
                  {po.receipts.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Nothing received against this order yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {po.receipts.map((g) => (
                        <Link key={g.id} href={`/purchases/grns/${g.id}`}
                          className="block p-3 border border-slate-200 dark:border-navy-700 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold tabular text-navy-900 dark:text-white">{g.grnNo}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {formatDate(g.receiptDate)}{g.receivedBy ? ` · ${g.receivedBy}` : ""} · {formatNumber(g.unitsReceived)} units
                              </div>
                            </div>
                            <Badge variant={g.status === "POSTED" ? "success" : "muted"}>{g.statusName}</Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="notes">
                  <p className="text-sm text-slate-600 dark:text-slate-300 py-2">
                    {po.notes || "No notes on this order."}
                  </p>
                </TabsContent>
              </Tabs>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Supplier</h3>
                <Link href={`/parties/${po.supplierId}`} className="text-xs text-brand-yellow hover:underline font-medium">View</Link>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <Avatar initials={po.supplierInitials} size="lg" />
                <div className="min-w-0">
                  <div className="font-semibold text-navy-900 dark:text-white truncate">{po.supplierName}</div>
                  {po.supplierCode && <div className="text-xs tabular text-slate-500 dark:text-slate-400">{po.supplierCode}</div>}
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                {po.supplierPhone && <div className="inline-flex items-center gap-1.5"><Phone className="size-3 text-slate-400" />{po.supplierPhone}</div>}
                <div className="inline-flex items-center gap-1.5"><MapPin className="size-3 text-slate-400" />{po.location}</div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">PO Details</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="PO Date" value={formatDate(po.poDate)} />
                <Meta label="Expected" value={po.expectedDate ? formatDate(po.expectedDate) : "—"} />
                <Meta label="Location" value={po.location} />
                <Meta label="Created By" value={po.createdBy ?? "—"} />
                <Meta label="Approved By" value={po.approvedBy ?? "Not approved yet"} />
              </dl>
            </CardBody>
          </Card>

          {/* The old page carried a "Danger Zone" that cancelled the PO and
              claimed the supplier had been notified. There is no cancel
              endpoint and no outbound mail for this, so it is not shown -- a
              button that reports success while doing nothing is worse than no
              button. Noted in db_code_changes.txt. */}
        </div>
      </div>
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-6 text-sm">
      <span className={cn("text-slate-600 dark:text-slate-300", bold && "font-bold text-navy-900 dark:text-white")}>{label}</span>
      <span className={cn("tabular text-navy-900 dark:text-white", bold && "font-bold text-base")}>{value}</span>
    </div>
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
