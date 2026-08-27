"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { AlertCircle, Printer, RefreshCw, Wallet, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /purchases/invoices/{id}. `paid` and `balance` are computed by the API
   from settled payments -- they are not stored on the invoice. */
type PiLine = {
  id: number; lineNo: number; productId: number; sku: string; name: string;
  qty: number; unitCost: number; taxPercent: number; lineTotal: number;
};

type PurchaseInvoice = {
  id: number; invoiceNo: string; supplierInvoiceNo: string | null;
  supplierId: number; supplierName: string; supplierInitials: string; supplierCode: string | null;
  poId: number | null; poNo: string | null;
  invoiceDate: string; dueDate: string | null;
  subtotal: number; discount: number; tax: number; whtAmount: number; total: number;
  status: string; statusName: string; paymentMethod: string | null;
  createdBy: string | null; paid: number; balance: number;
  lines: PiLine[];
};

const STATUS_VARIANT: Record<string, "muted" | "info" | "success" | "warning" | "danger"> = {
  DRAFT: "muted", POSTED: "info", PARTIAL: "warning", PAID: "success",
  OVERDUE: "danger", CANCELLED: "danger", VOID: "danger",
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function PurchaseInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);

  const [pi, setPi] = React.useState<PurchaseInvoice | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  /* Snapshotted once on mount. Calling Date.now() while rendering makes the
     render impure -- the same props would produce a different tree a second
     later, which is exactly what react-hooks/purity is there to catch. */
  const [now] = React.useState(() => Date.now());

  const load = React.useCallback(async () => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    try {
      const res = await axios.get<PurchaseInvoice>(`${API_BASE_URL}/purchases/invoices/${id}`, { headers: authHeader() });
      setPi(res.data);
      setNotFound(false);
      setError(null);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true);
      else setError(apiMessage(e, "Could not load this supplier invoice."));
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
        <PageHeader breadcrumbs={[{ label: "Purchases" }, { label: "Invoices", href: "/purchases/invoices" }]} title="Loading…" />
        <Skeleton className="h-64" />
      </>
    );
  }

  if (notFound) {
    return (
      <EmptyState icon={AlertCircle} title="Supplier invoice not found" description={`No supplier invoice with id ${id}.`}
        action={<Button variant="accent" asChild><Link href="/purchases/invoices">Back to Invoices</Link></Button>} />
    );
  }

  if (error || !pi) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Purchases" }, { label: "Invoices", href: "/purchases/invoices" }]} title="Supplier Invoice" />
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

  const overdue = pi.balance > 0 && pi.dueDate !== null && new Date(pi.dueDate).getTime() < now;
  const paidPercent = pi.total > 0 ? Math.round((pi.paid / pi.total) * 100) : 0;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Invoices", href: "/purchases/invoices" }, { label: pi.invoiceNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{pi.invoiceNo}</span>
            <StatusPill variant={STATUS_VARIANT[pi.status] ?? "muted"}>{pi.statusName}</StatusPill>
            {overdue && <Badge variant="danger">Overdue</Badge>}
          </div>
        }
        subtitle={`${pi.supplierName} · ${formatDate(pi.invoiceDate)}${pi.supplierInvoiceNo ? ` · their ref ${pi.supplierInvoiceNo}` : ""}`}
        actions={
          <>
            <Button variant="ghost" className="gap-1.5" onClick={() => window.print()}><Printer />Print</Button>
            <Button variant="ghost" className="gap-1.5" onClick={() => void load()}><RefreshCw className="size-4" />Refresh</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Invoice Total</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(pi.total)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Paid</div>
          <div className="text-2xl tabular font-bold text-success mt-1">{formatMoney(pi.paid)}</div>
          <div className="w-full h-1 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-success" style={{ width: `${Math.min(100, paidPercent)}%` }} />
          </div>
        </Card>
        <Card className={cn("p-4", pi.balance > 0 && "border-warning/40")}>
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Balance</div>
          <div className={cn("text-2xl tabular font-bold mt-1", pi.balance > 0 ? "text-warning" : "text-success")}>
            {formatMoney(pi.balance)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Due</div>
          <div className={cn("text-2xl tabular font-bold mt-1 inline-flex items-center gap-2", overdue ? "text-danger" : "text-navy-900 dark:text-white")}>
            <CalendarClock className="size-4" />
            {pi.dueDate ? formatDate(pi.dueDate) : "—"}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700">
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">Items</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {pi.lines.length} {pi.lines.length === 1 ? "line" : "lines"} · {formatNumber(pi.lines.reduce((s, l) => s + l.qty, 0))} units
              </p>
            </div>
            {pi.lines.length === 0 ? (
              <CardBody><EmptyState icon={AlertCircle} title="No lines on this invoice" /></CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Product</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Qty</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Cost</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Tax</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    {pi.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-3">
                          <Link href={`/inventory/products/${l.productId}`} className="text-sm font-medium text-navy-900 dark:text-white hover:text-brand-yellow">
                            {l.name}
                          </Link>
                          <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">{l.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-right tabular text-sm text-navy-900 dark:text-white">{formatNumber(l.qty)}</td>
                        <td className="px-4 py-3 text-right tabular text-sm text-slate-700 dark:text-slate-300">{formatMoney(l.unitCost)}</td>
                        <td className="px-4 py-3 text-right tabular text-xs text-slate-500 dark:text-slate-400">{l.taxPercent}%</td>
                        <td className="px-4 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(l.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-5 py-4 border-t border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/40">
              <div className="ml-auto max-w-xs space-y-1.5">
                <Row label="Subtotal" value={formatMoney(pi.subtotal)} />
                {pi.discount > 0 && <Row label="Discount" value={`− ${formatMoney(pi.discount)}`} />}
                <Row label="Sales Tax" value={formatMoney(pi.tax)} />
                {pi.whtAmount > 0 && <Row label="Withholding tax" value={`− ${formatMoney(pi.whtAmount)}`} />}
                <div className="border-t border-slate-200 dark:border-navy-700 pt-2 mt-2">
                  <Row label="Total" value={formatMoney(pi.total)} bold />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Supplier</h3>
                <Link href={`/parties/${pi.supplierId}`} className="text-xs text-brand-yellow hover:underline font-medium">View</Link>
              </div>
              <div className="flex items-center gap-3">
                <Avatar initials={pi.supplierInitials} size="lg" />
                <div className="min-w-0">
                  <div className="font-semibold text-navy-900 dark:text-white truncate">{pi.supplierName}</div>
                  {pi.supplierCode && <div className="text-xs tabular text-slate-500 dark:text-slate-400">{pi.supplierCode}</div>}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Invoice Details</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="Invoice Date" value={formatDate(pi.invoiceDate)} />
                <Meta label="Due Date" value={pi.dueDate ? formatDate(pi.dueDate) : "—"} />
                <Meta label="Their Reference" value={pi.supplierInvoiceNo || "—"} />
                <Meta label="Payment Method" value={pi.paymentMethod ? <Badge variant="muted">{pi.paymentMethod}</Badge> : "—"} />
                <Meta label="Entered By" value={pi.createdBy ?? "—"} />
                <Meta
                  label="Against PO"
                  value={pi.poId
                    ? <Link href={`/purchases/orders/${pi.poId}`} className="text-brand-yellow hover:underline">{pi.poNo}</Link>
                    : <Badge variant="muted">No PO</Badge>}
                />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3 inline-flex items-center gap-2">
                <Wallet className="size-4 text-slate-400" /> Payment
              </h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="Paid" value={formatMoney(pi.paid)} />
                <Meta label="Outstanding" value={formatMoney(pi.balance)} />
              </dl>
              {/* Supplier pay-runs are not built, so there is no "Record
                  payment" button here rather than one that does nothing. */}
              <p className="text-2xs text-slate-500 dark:text-slate-400 mt-3">
                Payments are recorded against the supplier from Money → Vouchers.
              </p>
            </CardBody>
          </Card>
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
