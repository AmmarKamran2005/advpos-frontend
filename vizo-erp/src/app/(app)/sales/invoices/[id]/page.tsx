"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Printer, Mail, MessageCircle, X, ArrowRight, Building2, MapPin, Phone, AlertCircle, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { RecordPaymentDialog } from "@/components/dialogs/record-payment-dialog";
import { WhatsAppShareDialog } from "@/components/dialogs/whatsapp-share-dialog";
import { toast } from "@/components/ui/toaster";
import { getInvoice, INVOICE_STATUS_VARIANT } from "@/data/sales";
import { getParty } from "@/data/parties";
import { formatMoney, formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";

const ITEMS = [
  { id: 1, sku: "VZ-TIT-T9-BLK",  name: "VIZO Titan T9 Wireless Earbuds — Black",  qty: 50,  unitPrice: 980,  taxPercent: 18, lineTotal: 57820 },
  { id: 2, sku: "VZ-VLT-65W-PD",  name: "VIZO VOLT 65W GaN Type-C Charger (PD)",   qty: 20,  unitPrice: 2480, taxPercent: 18, lineTotal: 58528 },
  { id: 3, sku: "VZ-VR-TC-1.5M",  name: "VIZO VR Type-C Data Cable 1.5m",          qty: 100, unitPrice: 195,  taxPercent: 18, lineTotal: 21859 },
];

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const invoice = getInvoice(id);

  if (!invoice) {
    return <EmptyState icon={AlertCircle} title="Invoice not found" action={<Button asChild><Link href="/sales/invoices">Back</Link></Button>} />;
  }

  const customer = getParty(invoice.customerId);
  const subtotal = invoice.total / 1.18;
  const tax = invoice.total - subtotal;

  const [pay, setPay] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Invoices", href: "/sales/invoices" }, { label: invoice.invoiceNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{invoice.invoiceNo}</span>
            <StatusPill variant={INVOICE_STATUS_VARIANT[invoice.status]}>{statusLabel(invoice.status)}</StatusPill>
          </div>
        }
        subtitle={`Issued ${formatDate(invoice.invoiceDate)} · Due ${formatDate(invoice.dueDate)}`}
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" onClick={() => toast.info("Printing invoice…")}><Printer />Print</Button>
            <Button variant="ghost" size="md" className="gap-1.5" onClick={() => toast.success("Invoice emailed", { description: invoice.customerName })}><Mail /><span className="hidden sm:inline">Email</span></Button>
            <Button variant="ghost" size="md" className="gap-1.5" onClick={() => setShareOpen(true)}><MessageCircle /><span className="hidden sm:inline">WhatsApp</span></Button>
            {invoice.status !== "PAID" && invoice.status !== "VOID" && (
              <Button variant="accent" size="md" className="gap-1.5" onClick={() => setPay(true)}>
                <ArrowRight />Record Payment
              </Button>
            )}
            {invoice.status !== "VOID" && invoice.status !== "PAID" && (
              <Button variant="ghost" size="md" className="text-danger" onClick={() => setDeleteConfirm(true)}><Trash2 />Delete</Button>
            )}
          </>
        }
      />

      {/* Invoice document preview */}
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
                  <div className="text-xl font-bold text-navy-900 dark:text-white">VIZO ERP</div>
                  <div className="text-2xs text-slate-500 dark:text-slate-400">Mobile Accessories Distribution</div>
                </div>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                <div>VIZO Trading Company (Pvt.) Ltd.</div>
                <div>Kohinoor Market, Saddar, Karachi</div>
                <div>NTN: 0123456-7 · STRN: 32-77-8901-234-56</div>
                <div>info@vizo.com.pk · 0300 7287607</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold tracking-tight text-navy-900 dark:text-white">INVOICE</div>
              <div className="tabular text-base text-brand-yellow font-bold mt-1">{invoice.invoiceNo}</div>
              <div className="mt-3 space-y-1">
                <Row label="Issue Date" value={formatDate(invoice.invoiceDate)} />
                <Row label="Due Date"   value={formatDate(invoice.dueDate)} />
                <Row label="Order Ref"  value={invoice.orderNo} />
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-6 border-b border-slate-200 dark:border-navy-700">
            <div>
              <div className="text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2">Bill To</div>
              <div className="flex items-start gap-3">
                <Avatar initials={invoice.customerInitials} size="md" />
                <div>
                  <div className="text-base font-semibold text-navy-900 dark:text-white">{invoice.customerName}</div>
                  {customer && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 space-y-0.5">
                      <div className="inline-flex items-center gap-1.5"><Phone className="size-3" /> {customer.phone}</div>
                      <div className="inline-flex items-center gap-1.5"><MapPin className="size-3" /> {customer.city}, Pakistan</div>
                      {customer.ntn && <div>NTN: <span className="tabular">{customer.ntn}</span></div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2">Payment</div>
              <div className="text-sm text-slate-700 dark:text-slate-300">
                Method: <span className="font-semibold text-navy-900 dark:text-white">{invoice.paymentMethod}</span>
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-300">
                Location: <span className="font-semibold text-navy-900 dark:text-white">{invoice.location}</span>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="py-6">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-navy-900 dark:border-brand-yellow">
                  <th className="text-left text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2.5">Description</th>
                  <th className="text-right text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2.5">Qty</th>
                  <th className="text-right text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2.5">Unit Price</th>
                  <th className="text-right text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2.5">Tax</th>
                  <th className="text-right text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2.5">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ITEMS.map((item, i) => (
                  <tr key={item.id} className={i % 2 ? "bg-slate-50 dark:bg-navy-700/30" : ""}>
                    <td className="px-2 py-3">
                      <div className="text-sm font-medium text-navy-900 dark:text-white">{item.name}</div>
                      <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">{item.sku}</div>
                    </td>
                    <td className="px-2 py-3 text-right tabular text-sm text-slate-700 dark:text-slate-200">{item.qty}</td>
                    <td className="px-2 py-3 text-right tabular text-sm text-slate-700 dark:text-slate-200">{formatMoney(item.unitPrice)}</td>
                    <td className="px-2 py-3 text-right tabular text-xs text-slate-500 dark:text-slate-400">{item.taxPercent}%</td>
                    <td className="px-2 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pb-6">
            <div className="w-full max-w-sm space-y-2">
              <Row label="Subtotal"          value={formatMoney(subtotal)} />
              <Row label="Sales Tax (18%)"   value={formatMoney(tax)} />
              <div className="border-t-2 border-navy-900 dark:border-brand-yellow pt-2 mt-2">
                <Row label="Total Due"       value={formatMoney(invoice.total)} bold />
              </div>
              {invoice.paid > 0 && (
                <>
                  <Row label="Amount Paid"    value={formatMoney(invoice.paid)} success />
                  <div className="border-t border-slate-200 dark:border-navy-700 pt-2 mt-2">
                    <Row label="Balance"      value={formatMoney(invoice.balance)} bold danger={invoice.balance > 0} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-navy-700 pt-6 text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Thank you for your business · Payment terms: NET 30 · Bank: Meezan Bank · IBAN: PK01 MEZN 0001 2345 6789 0123
            </div>
            <div className="text-2xs text-slate-400 mt-2">
              This is a computer-generated invoice and does not require a signature.
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
      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Delete this invoice?"
        description="The stock and the customer's balance go back to what they were before. The invoice number stays used, and the change is kept in the activity history."
        variant="danger"
        confirmLabel="Yes, delete invoice"
        requireReason
        reasonLabel="Why are you deleting it?"
        onConfirm={(r) => { toast.success("Invoice deleted", { description: `Reason: ${r}` }); setDeleteConfirm(false); }}
      />
      <WhatsAppShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        docNo={invoice.invoiceNo}
        docLabel="Invoice"
        customerName={invoice.customerName}
        customerPhone={customer?.phone ?? ""}
        total={invoice.total}
        balance={invoice.balance}
        note={invoice.balance > 0 ? "Baqi raqam ki adaigi ka intezaar rahega." : undefined}
      />
    </>
  );
}

function Row({ label, value, bold, danger, success }: { label: string; value: string; bold?: boolean; danger?: boolean; success?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className={bold ? "font-bold text-navy-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}>{label}</span>
      <span className={`tabular ${bold ? "font-bold text-base" : ""} ${danger ? "text-danger" : success ? "text-success" : "text-navy-900 dark:text-white"}`}>{value}</span>
    </div>
  );
}
