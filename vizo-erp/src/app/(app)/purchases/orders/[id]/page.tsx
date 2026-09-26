"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { AlertCircle, Phone, MapPin, RefreshCw, CheckCircle2, FileText, Receipt, MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentActions } from "@/components/widgets/document-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImage } from "@/components/products/product-image";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /purchases/orders/{id}.

   Since 26 Sep 2026 a purchase order has no status, no approval and no
   receipt step: it was received the moment it was saved. So this page shows
   what was bought with all five price parts per line (and the reasons for the
   extra ones), what is still left of each line on the shelves, the supplier's
   bill it raised, and the vouchers it posted — each printable, plus the one
   "overall" sheet of all of them (document kind purchase-vouchers). */
type PoLine = {
  id: number; lineNo: number; productId: number; sku: string; name: string; imageUrl: string | null;
  qty: number; unitCost: number; dutyPrice: number; dutyAccount: string | null;
  fsPrice: number; margin1Price: number; margin2Price: number;
  dutyNote: string | null; fsNote: string | null; margin1Note: string | null; margin2Note: string | null;
  unitSalePrice: number; lineTotal: number; onHand: number;
};

type Voucher = { id: number; entryNo: string; component: string; narration: string; amount: number };

type PurchaseOrder = {
  id: number; poNo: string;
  supplierId: number; supplierName: string; supplierInitials: string;
  supplierCode: string | null; supplierPhone: string | null; supplierBillNo: string | null;
  locationId: number; location: string; poDate: string;
  subtotal: number; discount: number; total: number;
  notes: string | null; createdBy: string | null;
  lines: PoLine[];
  invoice: { id: number; no: string } | null;
  vouchers: Voucher[];
  receipts: { id: number; grnNo: string; receiptDate: string }[];
  totals: { goods: number; duty: number; fs: number; margin1: number; margin2: number; saleValue: number };
};

const PART_NAME: Record<string, string> = {
  GOODS: "Goods", DUTY: "Duty", FS: "Fi Sabilillah", MARGIN1: "Margin 1", MARGIN2: "Margin 2",
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) return (e.response.data as { message?: string })?.message ?? fallback;
  return "Cannot reach the server.";
}

export default function PODetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);

  const [po, setPo] = React.useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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

  if (loading) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Purchases" }, { label: "Orders to Supplier", href: "/purchases/orders" }]} title="Loading…" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><Skeleton className="h-96" /></div>
          <Skeleton className="h-72" />
        </div>
      </>
    );
  }

  if (notFound) {
    return (
      <EmptyState icon={AlertCircle} title="Purchase order not found" description={`No purchase order with id ${id}.`}
        action={<Button variant="accent" asChild><Link href="/purchases/orders">Back to Orders to Supplier</Link></Button>} />
    );
  }

  if (error || !po) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Purchases" }, { label: "Orders to Supplier", href: "/purchases/orders" }]} title="Purchase Order" />
        <Card><CardBody className="flex items-center gap-3">
          <AlertCircle className="size-5 text-danger shrink-0" />
          <div className="flex-1 text-sm font-semibold text-navy-900 dark:text-white">{error}</div>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
            <RefreshCw className="size-4" /> Try again
          </Button>
        </CardBody></Card>
      </>
    );
  }

  const units = po.lines.reduce((s, l) => s + l.qty, 0);
  const left = po.lines.reduce((s, l) => s + Math.max(0, l.onHand), 0);
  /* An order written before 26 Sep went through the old approve-and-receive
     steps; it has no vouchers of its own. Say so rather than show an empty box. */
  const legacy = po.vouchers.length === 0;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Orders to Supplier", href: "/purchases/orders" }, { label: po.poNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{po.poNo}</span>
            {!legacy && <StatusPill variant="success">Received</StatusPill>}
          </div>
        }
        subtitle={`${formatDate(po.poDate)} · received at ${po.location}${po.createdBy ? ` · by ${po.createdBy}` : ""}`}
        actions={
          <>
            <DocumentActions kind="purchase-order" id={id} label="purchase order" />
            <Button variant="ghost" className="gap-1.5" onClick={() => void load()}><RefreshCw className="size-4" />Refresh</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* ── items ── */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white">Items</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {po.lines.length} {po.lines.length === 1 ? "product" : "products"} · {formatNumber(units)} units bought
                </p>
              </div>
              {!legacy && <Badge variant={left > 0 ? "info" : "muted"}>{formatNumber(left)} still on the shelves</Badge>}
            </div>
            {po.lines.length === 0 ? (
              <CardBody><EmptyState icon={AlertCircle} title="No lines on this order" /></CardBody>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-navy-700">
                {po.lines.map((l) => {
                  const notes = [
                    ["Duty", l.dutyNote], ["Fi Sabilillah", l.fsNote], ["Margin 1", l.margin1Note], ["Margin 2", l.margin2Note],
                  ].filter(([, n]) => n) as [string, string][];
                  return (
                    <div key={l.id} className="px-4 py-4 sm:px-5">
                      <div className="flex items-start gap-3">
                        <ProductImage url={l.imageUrl} name={l.name} size="md" />
                        <div className="min-w-0 flex-1">
                          <Link href={`/inventory/products/${l.productId}`} className="font-semibold text-navy-900 dark:text-white hover:text-brand-yellow">
                            {l.name}
                          </Link>
                          <div className="text-2xs tabular text-slate-500">{l.sku}</div>
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            <span className="tabular font-semibold">{formatNumber(l.qty)}</span> bought
                            {!legacy && <> · <span className="tabular">{formatNumber(Math.max(0, l.onHand))}</span> left</>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xs uppercase tracking-wider text-slate-500">Sells at</div>
                          <div className="tabular text-lg font-bold text-navy-900 dark:text-white">{formatMoney(l.unitSalePrice)}</div>
                        </div>
                      </div>

                      {/* The five parts, as saved on the line. */}
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <Part label="Cost" v={l.unitCost} />
                        <Part label="Duty" v={l.dutyPrice} sub={l.dutyAccount ?? undefined} />
                        <Part label="Fi Sabilillah" v={l.fsPrice} />
                        <Part label="Margin 1" v={l.margin1Price} />
                        <Part label="Margin 2" v={l.margin2Price} />
                      </div>

                      {notes.length > 0 && (
                        <div className="mt-2 space-y-0.5 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-navy-900 dark:text-slate-300">
                          {notes.map(([k, n]) => (
                            <div key={k} className="flex gap-1.5"><MessageSquareText className="mt-0.5 size-3 shrink-0 text-slate-400" /><span className="font-medium">{k}:</span> {n}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="px-5 py-4 border-t border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/40">
              <div className="ml-auto max-w-sm space-y-1.5">
                <Row label="Goods (cost)" value={formatMoney(po.subtotal)} />
                {po.discount > 0 && <Row label="Discount" value={`− ${formatMoney(po.discount)}`} />}
                <Row label="Owed to supplier" value={formatMoney(po.total)} bold />
                {!legacy && (
                  <div className="border-t border-slate-200 dark:border-navy-700 pt-2 mt-2 space-y-1.5">
                    <Row label="Duty" value={formatMoney(po.totals.duty)} />
                    <Row label="Fi Sabilillah" value={formatMoney(po.totals.fs)} />
                    <Row label="Margin 1" value={formatMoney(po.totals.margin1)} />
                    <Row label="Margin 2" value={formatMoney(po.totals.margin2)} />
                    <Row label="Selling value" value={formatMoney(po.totals.saleValue)} bold />
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* ── vouchers ── */}
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Journal vouchers</h3>
                  <p className="text-xs text-slate-500">One per price part. The overall sheet prints them all together.</p>
                </div>
                {!legacy && <DocumentActions kind="purchase-vouchers" id={id} label="vouchers" />}
              </div>
              {legacy ? (
                <p className="text-sm text-slate-500 py-4">
                  This order was written before 26 Sep 2026, under the old approve-and-receive steps, and posted no vouchers.
                  {po.receipts.length > 0 && <> Its goods receipts: {po.receipts.map((g, i) => (
                    <React.Fragment key={g.id}>{i > 0 && ", "}<Link className="text-brand-yellow-700 hover:underline" href={`/purchases/grns/${g.id}`}>{g.grnNo}</Link></React.Fragment>
                  ))}.</>}
                </p>
              ) : (
                <div className="space-y-2">
                  {po.vouchers.map((v) => (
                    <Link key={v.id} href={`/accounting/journal-entries/${v.id}`}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 dark:border-navy-700 dark:hover:bg-navy-700">
                      <FileText className="size-4 text-slate-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold tabular text-navy-900 dark:text-white">{v.entryNo}</div>
                        <div className="text-xs text-slate-500 truncate">{v.narration}</div>
                      </div>
                      <Badge variant={v.component === "GOODS" ? "info" : "accent"}>{PART_NAME[v.component] ?? v.component}</Badge>
                      <span className="tabular text-sm font-semibold w-28 text-right">{formatMoney(v.amount)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {po.notes && (
            <Card><CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-1">Notes</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{po.notes}</p>
            </CardBody></Card>
          )}
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
                {po.supplierPhone && <div className="flex items-center gap-1.5"><Phone className="size-3 text-slate-400" />{po.supplierPhone}</div>}
                <div className="flex items-center gap-1.5"><MapPin className="size-3 text-slate-400" />Received at {po.location}</div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Supplier&apos;s bill</h3>
              {po.invoice ? (
                <Link href={`/purchases/invoices/${po.invoice.id}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 dark:border-navy-700 dark:hover:bg-navy-700">
                  <Receipt className="size-5 text-slate-400" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold tabular text-navy-900 dark:text-white">{po.invoice.no}</div>
                    <div className="text-xs text-slate-500">{po.supplierBillNo ? `Their bill ${po.supplierBillNo}` : "Raised with this order"}</div>
                  </div>
                  <span className="tabular text-sm font-semibold">{formatMoney(po.total)}</span>
                </Link>
              ) : (
                <p className="text-sm text-slate-500">No bill is linked to this order.</p>
              )}
              {!legacy && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
                  <CheckCircle2 className="mt-0.5 size-3.5 text-success shrink-0" />
                  Stock was added to {po.location} and the bill raised when this order was saved.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Part({ label, v, sub }: { label: string; v: number; sub?: string }) {
  return (
    <div className={cn("rounded-md border border-slate-200 px-2 py-1.5 dark:border-navy-700", v === 0 && "opacity-60")}>
      <div className="text-2xs text-slate-500">{label}</div>
      <div className="tabular font-semibold text-navy-900 dark:text-white">{formatMoney(v)}</div>
      {sub && <div className="text-2xs text-slate-500 truncate">{sub}</div>}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-6 text-sm">
      <span className={cn("text-slate-600 dark:text-slate-300", bold && "font-bold text-navy-900 dark:text-white")}>{label}</span>
      <span className={cn("tabular text-navy-900 dark:text-white", bold && "font-bold")}>{value}</span>
    </div>
  );
}
