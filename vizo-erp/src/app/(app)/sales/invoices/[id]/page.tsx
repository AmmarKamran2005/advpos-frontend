"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  Printer, MessageCircle, ArrowRight, Building2, MapPin, Phone,
  AlertCircle, Download, RefreshCw, Users, Loader2, CloudUpload,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordPaymentDialog } from "@/components/dialogs/record-payment-dialog";
import { WhatsAppShareDialog } from "@/components/dialogs/whatsapp-share-dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { openDocument, openDocumentWhenReady } from "@/lib/documents";
import { formatMoney, formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import { prettyPhone } from "@/lib/whatsapp";

/* GET /sales/invoices/{id} -- one call. Customer details, the real line items
   AND the company letterhead off the "Company" row all come back together, so
   the printed document carries the address and tax numbers that are in the
   database rather than the ones somebody typed into this component. */
type InvoiceLine = {
  id: number; lineNo: number; productId: number; name: string; sku: string;
  packing: number; qty: number; rate: number;
  discountPercent: number; taxPercent: number; lineTotal: number;
  returnedQty: number;
};

type LetterHead = {
  name: string; legalName: string; address: string; city: string; country: string;
  phone: string; email: string; ntn: string; strn: string;
  currencyCode: string; currencySymbol: string;
};

type InvoiceDetail = {
  id: number; invoiceNo: string; orderId: number | null; orderNo: string | null;
  customerId: number; customerName: string; accountName: string; customerInitials: string;
  customerCode: string; customerPhone: string | null; address: string | null;
  city: string; ntn: string | null; strn: string | null; isWalkIn: boolean;
  locationId: number; location: string;
  invoiceDate: string; dueDate: string;
  subtotal: number; discount: number; tax: number; total: number;
  status: string; statusName: string;
  methodId: number; paymentMethod: string; paymentMethodName: string;
  createdBy: string; pdfUrl: string | null; shareUrl: string | null; notes: string | null;
  paid: number; balance: number;
  lines: InvoiceLine[];
  company: LetterHead | null;
};

/* Real "InvoiceStatus".StatusKey values -- same map used on the list page. */
const INVOICE_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
  DRAFT: "muted", ISSUED: "info", POSTED: "info",
  PARTIAL: "warning", PAID: "success", OVERDUE: "danger", VOID: "muted",
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "", 10);

  const [invoice, setInvoice] = React.useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rebuilding, setRebuilding] = React.useState(false);

  /* Declared before any early return so the hook order never changes. */
  const [pay, setPay] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!Number.isFinite(id)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get<InvoiceDetail>(`${API_BASE_URL}/sales/invoices/${id}`, {
        headers: authHeader(),
      });
      setInvoice(res.data);
      setError(null);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        /* A real 404 from the API -- fall through to the "not found" state
           below rather than treating it as a load error. */
        setInvoice(null);
        setError(null);
      } else {
        setError(apiMessage(e, "Could not load this invoice."));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  /* Print and Download open the SAME file: the bill in the Cloudinary store,
     which is the one the customer was sent. Printing the web page instead would
     print the app chrome and a layout nobody designed for A4; rendering a fresh
     PDF would mean the copy on screen was never the copy in the store.

     The Cloudinary URL rather than an API route, because window.open carries no
     Authorization header. */
  async function openBill(attachment = false) {
    if (invoice?.pdfUrl) {
      openDocument(invoice.pdfUrl, attachment);
      return;
    }
    const opened = await openDocumentWhenReady(async () => {
      const res = await axios.post<{ pdfUrl: string | null }>(
        `${API_BASE_URL}/sales/invoices/${id}/pdf`, {}, { headers: authHeader() });
      await load();
      return res.data.pdfUrl;
    }, attachment);
    if (!opened) toast.error("Could not open the bill", { description: "Try again in a moment." });
  }

  async function rebuildBill() {
    setRebuilding(true);
    try {
      const res = await axios.post<{ pdfUrl: string; shareUrl: string; message: string }>(
        `${API_BASE_URL}/sales/invoices/${id}/pdf?force=true`, {}, { headers: authHeader() });
      toast.success("Bill re-saved", { description: res.data.message });
      await load();
    } catch (e) {
      toast.error("Could not save the bill", { description: apiMessage(e, "Please try again.") });
    } finally {
      setRebuilding(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Could not load this invoice"
        description={error}
        action={<Button variant="accent" onClick={() => void load()}><RefreshCw />Try again</Button>}
      />
    );
  }

  if (!invoice) {
    return <EmptyState icon={AlertCircle} title="Invoice not found" action={<Button asChild><Link href="/sales/invoices">Back</Link></Button>} />;
  }

  const co = invoice.company;
  const cur = co?.currencySymbol ?? "PKR";

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Sales" },
          invoice.isWalkIn
            ? { label: "Walk-in Orders", href: "/sales/direct/walkin" }
            : { label: "Invoices", href: "/sales/invoices" },
          { label: invoice.invoiceNo },
        ]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{invoice.invoiceNo}</span>
            <StatusPill variant={INVOICE_STATUS_VARIANT[invoice.status] ?? "muted"}>{statusLabel(invoice.status)}</StatusPill>
            {invoice.isWalkIn && <Badge variant="muted"><Users className="size-3" />Walk-in</Badge>}
          </div>
        }
        subtitle={`Issued ${formatDate(invoice.invoiceDate)} · Due ${formatDate(invoice.dueDate)} · by ${invoice.createdBy}`}
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" onClick={() => void openBill(false)}><Printer /><span className="hidden sm:inline">Print</span></Button>
            <Button variant="ghost" size="md" className="gap-1.5" onClick={() => void openBill(true)}><Download /><span className="hidden sm:inline">Download</span></Button>
            <Button variant="ghost" size="md" className="gap-1.5" onClick={() => setShareOpen(true)}><MessageCircle /><span className="hidden sm:inline">WhatsApp</span></Button>
            {invoice.status !== "PAID" && invoice.status !== "VOID" && (
              <Button variant="accent" size="md" className="gap-1.5" onClick={() => setPay(true)}>
                <ArrowRight />Record Payment
              </Button>
            )}
          </>
        }
      />

      {/* The archived copy. Only surfaced when it is missing, because that is
          the only time anybody needs to know it exists. */}
      {!invoice.pdfUrl && (
        <Card className="max-w-5xl mx-auto mb-4 bg-warning/5 border-warning/30">
          <CardBody className="flex items-center gap-3">
            <CloudUpload className="size-5 text-warning shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-warning-dark dark:text-warning-light">
                This bill is not archived
              </div>
              <div className="text-xs text-warning-dark/80 dark:text-warning-light/80 mt-0.5">
                Print, download and WhatsApp all still work — the document is rendered on request.
                Saving a copy just means the link keeps working if this API is not reachable.
              </div>
            </div>
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={rebuildBill} disabled={rebuilding}>
              {rebuilding ? <Loader2 className="size-4 animate-spin" /> : <CloudUpload className="size-4" />}
              Save a copy
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Invoice document preview. Everything below comes from the database:
          the letterhead from "Company", the buyer from "Party", the lines from
          "SalesInvoiceItem". Nothing here is a constant. */}
      <Card className="max-w-5xl mx-auto">
        <CardBody className="p-8 sm:p-12">
          {/* Header */}
          <div className="flex items-start justify-between gap-6 pb-6 border-b border-slate-200 dark:border-navy-700">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="size-10 rounded-lg bg-brand-yellow flex items-center justify-center">
                  <Building2 className="size-5 text-navy-900" />
                </div>
                <div>
                  <div className="text-xl font-bold text-navy-900 dark:text-white">{co?.name ?? "—"}</div>
                  <div className="text-2xs text-slate-500 dark:text-slate-400">{co?.legalName}</div>
                </div>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                {co?.address && <div>{co.address}</div>}
                {(co?.city || co?.country) && <div>{[co?.city, co?.country].filter(Boolean).join(", ")}</div>}
                {(co?.phone || co?.email) && <div>{[co?.phone, co?.email].filter(Boolean).join(" · ")}</div>}
                {(co?.ntn || co?.strn) && (
                  <div className="tabular">
                    {co?.ntn && `NTN: ${co.ntn}`}{co?.ntn && co?.strn && " · "}{co?.strn && `STRN: ${co.strn}`}
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-navy-900 dark:text-white">SALES TAX INVOICE</div>
              <div className="tabular text-base text-brand-yellow font-bold mt-1">{invoice.invoiceNo}</div>
              <div className="mt-3 space-y-1">
                <Row label="Issue date" value={formatDate(invoice.invoiceDate)} />
                <Row label="Due date" value={formatDate(invoice.dueDate)} />
                {invoice.orderNo && (
                  <Row label="Order ref" value={
                    invoice.orderId
                      ? <Link href={`/sales/orders/${invoice.orderId}`} className="text-brand-yellow hover:underline">{invoice.orderNo}</Link>
                      : invoice.orderNo
                  } />
                )}
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-6 border-b border-slate-200 dark:border-navy-700">
            <div>
              <div className="text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                {invoice.isWalkIn ? "Bill to (walk-in)" : "Bill to"}
              </div>
              <div className="flex items-start gap-3">
                <Avatar initials={invoice.customerInitials} size="md" />
                <div>
                  <div className="text-base font-semibold text-navy-900 dark:text-white">{invoice.customerName}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 space-y-0.5">
                    {!invoice.isWalkIn && <div className="tabular">{invoice.customerCode}</div>}
                    {invoice.customerPhone && (
                      <div className="inline-flex items-center gap-1.5"><Phone className="size-3" /> {prettyPhone(invoice.customerPhone)}</div>
                    )}
                    {!invoice.isWalkIn && (
                      <div className="flex items-start gap-1.5">
                        <MapPin className="size-3 mt-0.5 shrink-0" />
                        <span>{[invoice.address, invoice.city, co?.country].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                    {invoice.ntn && <div>NTN: <span className="tabular">{invoice.ntn}</span></div>}
                    {invoice.isWalkIn && (
                      <div className="text-slate-400">
                        Counter sale, booked to the walk-in account.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2">Payment</div>
              <div className="text-sm text-slate-700 dark:text-slate-300">
                Method: <span className="font-semibold text-navy-900 dark:text-white">{invoice.paymentMethodName}</span>
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-300">
                Issued from: <span className="font-semibold text-navy-900 dark:text-white">{invoice.location}</span>
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-300">
                Currency: <span className="font-semibold text-navy-900 dark:text-white">{co?.currencyCode ?? "PKR"}</span>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="py-6 overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b-2 border-navy-900 dark:border-brand-yellow">
                  <th className="text-left text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2.5">Description</th>
                  <th className="text-right text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2.5">Qty</th>
                  <th className="text-right text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2.5">Rate</th>
                  <th className="text-right text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2.5">Disc</th>
                  <th className="text-right text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2.5">Tax</th>
                  <th className="text-right text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2.5">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((item, i) => (
                  <tr key={item.id} className={i % 2 ? "bg-slate-50 dark:bg-navy-700/30" : ""}>
                    <td className="px-2 py-3">
                      <div className="text-sm font-medium text-navy-900 dark:text-white">{item.name}</div>
                      <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.sku}
                        {item.packing > 1 && ` · pack of ${item.packing}`}
                        {item.returnedQty > 0 && (
                          <span className="text-warning"> · {item.returnedQty} returned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right tabular text-sm text-slate-700 dark:text-slate-200">{item.qty}</td>
                    <td className="px-2 py-3 text-right tabular text-sm text-slate-700 dark:text-slate-200">{formatMoney(item.rate, { decimals: 2 })}</td>
                    <td className="px-2 py-3 text-right tabular text-xs text-slate-500 dark:text-slate-400">{item.discountPercent > 0 ? `${item.discountPercent}%` : "—"}</td>
                    <td className="px-2 py-3 text-right tabular text-xs text-slate-500 dark:text-slate-400">{item.taxPercent}%</td>
                    <td className="px-2 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(item.lineTotal, { decimals: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pb-6">
            <div className="w-full max-w-sm space-y-2">
              <Row label="Subtotal" value={`${cur} ${invoice.subtotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              {invoice.discount > 0 && (
                <Row label="Discount" value={`- ${cur} ${invoice.discount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} danger />
              )}
              <Row label="Sales tax" value={`${cur} ${invoice.tax.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              <div className="border-t-2 border-navy-900 dark:border-brand-yellow pt-2 mt-2">
                <Row label="Total due" value={`${cur} ${invoice.total.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} bold />
              </div>
              {invoice.paid > 0 && (
                <>
                  <Row label="Amount paid" value={formatMoney(invoice.paid)} success />
                  <div className="border-t border-slate-200 dark:border-navy-700 pt-2 mt-2">
                    <Row label="Balance" value={formatMoney(invoice.balance)} bold danger={invoice.balance > 0} />
                  </div>
                </>
              )}
            </div>
          </div>

          {invoice.notes && (
            <div className="pb-6 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold">Note: </span>{invoice.notes}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-navy-700 pt-6 text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Payment due {formatDate(invoice.dueDate)} · Goods once sold are accepted back only in
              resalable condition, within 7 days, against this invoice.
            </div>
            <div className="text-2xs text-slate-400 mt-2">
              Prepared by {invoice.createdBy}. This is a computer-generated invoice and needs no signature.
            </div>
          </div>
        </CardBody>
      </Card>

      <RecordPaymentDialog
        open={pay}
        onOpenChange={setPay}
        invoiceNo={invoice.invoiceNo}
        customerName={invoice.customerName}
        totalAmount={invoice.total}
        balanceAmount={invoice.balance}
      />
      <WhatsAppShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        docNo={invoice.invoiceNo}
        docLabel="Invoice"
        customerName={invoice.customerName}
        customerPhone={invoice.customerPhone ?? ""}
        total={invoice.total}
        balance={invoice.balance}
        billLink={invoice.shareUrl ?? invoice.pdfUrl}
        companyName={co?.name}
        note={invoice.balance > 0 ? "Baqi raqam ki adaigi ka intezaar rahega." : undefined}
      />
    </>
  );
}

function Row({ label, value, bold, danger, success }: {
  label: string; value: React.ReactNode; bold?: boolean; danger?: boolean; success?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className={bold ? "font-bold text-navy-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}>{label}</span>
      <span className={`tabular ${bold ? "font-bold text-base" : ""} ${danger ? "text-danger" : success ? "text-success" : "text-navy-900 dark:text-white"}`}>{value}</span>
    </div>
  );
}
