"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, AlertCircle, Banknote, X, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { RecordPaymentDialog } from "@/components/dialogs/record-payment-dialog";
import { purchaseInvoices, PI_STATUS_VARIANT } from "@/data/purchases";
import { formatMoney, formatDate } from "@/lib/format";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/labels";

export default function PIDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const pi = purchaseInvoices.find((p) => p.id === id);
  const [pay, setPay] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);

  if (!pi) return <EmptyState icon={AlertCircle} title="Purchase invoice not found" action={<Button asChild><Link href="/purchases/invoices">Back</Link></Button>} />;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Invoices", href: "/purchases/invoices" }, { label: pi.invoiceNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{pi.invoiceNo}</span>
            <StatusPill variant={PI_STATUS_VARIANT[pi.status]}>{statusLabel(pi.status)}</StatusPill>
          </div>
        }
        subtitle={`Issued ${formatDate(pi.invoiceDate)} · Due ${formatDate(pi.dueDate)} · Supplier ref ${pi.supplierInvoiceNo}`}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/purchases/invoices"><ArrowLeft />Back</Link></Button>
            <Button variant="ghost" className="gap-1.5"><Printer />Print</Button>
            {pi.status !== "PAID" && pi.status !== "VOID" && (
              <Button variant="accent" className="gap-1.5" onClick={() => setPay(true)}>
                <Banknote />Pay Supplier
              </Button>
            )}
            {pi.status !== "VOID" && (
              <Button variant="ghost" className="text-danger" onClick={() => setDeleteConfirm(true)}><Trash2 />Delete</Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700">
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">Bill Items</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Description</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Qty</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Cost</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {[
                  { name: "VIZO Titan T9 Wireless Earbuds — Black",  qty: 100, cost: 580,  total: 58000 },
                  { name: "VIZO VOLT 65W GaN Type-C Charger",        qty: 80,  cost: 1480, total: 118400 },
                  { name: "VIZO VR Type-C Data Cable 1.5m",          qty: 60,  cost: 95,   total: 5700 },
                ].map((l, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-sm text-navy-900 dark:text-white">{l.name}</td>
                    <td className="px-4 py-3 text-right tabular text-sm text-slate-700 dark:text-slate-300">{l.qty}</td>
                    <td className="px-4 py-3 text-right tabular text-sm text-slate-700 dark:text-slate-300">{formatMoney(l.cost)}</td>
                    <td className="px-4 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(l.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/40">
              <div className="ml-auto max-w-xs space-y-1.5 text-sm">
                <Row label="Subtotal" value={formatMoney(pi.total / 1.18)} />
                <Row label="Sales Tax (18%)" value={formatMoney(pi.total - pi.total / 1.18)} />
                {pi.whtAmount > 0 && <Row label="WHT (4.5%)" value={`-${formatMoney(pi.whtAmount)}`} />}
                <div className="border-t border-slate-200 dark:border-navy-700 pt-2 mt-2">
                  <Row label="Total" value={formatMoney(pi.total)} bold />
                </div>
                {pi.paid > 0 && (
                  <>
                    <Row label="Paid" value={`-${formatMoney(pi.paid)}`} />
                    <div className="border-t border-slate-200 dark:border-navy-700 pt-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-navy-900 dark:text-white">Balance Due</span>
                        <span className={cn("tabular text-base font-bold", pi.balance > 0 ? "text-warning" : "text-success")}>{formatMoney(pi.balance)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Supplier</h3>
              <div className="flex items-center gap-3">
                <Avatar initials={pi.supplierInitials} size="md" />
                <div>
                  <div className="font-semibold text-navy-900 dark:text-white">{pi.supplierName}</div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Invoice Details</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="Our Ref" value={<span className="tabular">{pi.invoiceNo}</span>} />
                <Meta label="Supplier Ref" value={<span className="tabular">{pi.supplierInvoiceNo}</span>} />
                <Meta label="PO Reference" value={<span className="tabular">{pi.poNo}</span>} />
                <Meta label="Date" value={formatDate(pi.invoiceDate)} />
                <Meta label="Due Date" value={formatDate(pi.dueDate)} />
                <Meta label="Payment Method" value={<Badge variant="muted">{pi.paymentMethod}</Badge>} />
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>

      <RecordPaymentDialog
        open={pay}
        onOpenChange={setPay}
        invoiceNo={pi.invoiceNo}
        customerName={pi.supplierName}
        totalAmount={pi.total}
        balanceAmount={pi.balance}
      />
      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Delete this purchase invoice?"
        variant="danger"
        confirmLabel="Yes, delete invoice"
        requireReason
        onConfirm={(r) => { toast.success("Invoice deleted", { description: `Reason: ${r}` }); setDeleteConfirm(false); }}
      />
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-6">
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
