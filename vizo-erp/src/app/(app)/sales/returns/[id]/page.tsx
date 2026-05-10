"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, AlertCircle, CheckCircle2, X, Printer, Package, AlertTriangle, RotateCcw, Calendar, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { salesReturns, RETURN_STATUS_VARIANT } from "@/data/sales";
import { formatMoney, formatDate } from "@/lib/format";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const SAMPLE_RETURN_LINES = [
  { id: 1, sku: "VZ-TIT-T9-BLK",  name: "VIZO Titan T9 Wireless Earbuds — Black", originalQty: 50, returnedQty: 4, unitPrice: 980,  condition: "DAMAGED",  restockTo: null },
  { id: 2, sku: "VZ-VR-TC-1.5M",  name: "VIZO VR Type-C Data Cable 1.5m",         originalQty: 100,returnedQty: 6, unitPrice: 195,  condition: "RESALABLE",restockTo: "KHI-WH-01" },
];

export default function SalesReturnDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const r = salesReturns.find((x) => x.id === id);
  const [approveConfirm, setApproveConfirm] = React.useState(false);
  const [rejectConfirm, setRejectConfirm] = React.useState(false);

  if (!r) {
    return <EmptyState icon={AlertCircle} title="Return not found" action={<Button asChild><Link href="/sales/returns">Back</Link></Button>} />;
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Returns", href: "/sales/returns" }, { label: r.returnNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <RotateCcw className="size-6 text-brand-yellow" />
            <span>{r.returnNo}</span>
            <StatusPill variant={RETURN_STATUS_VARIANT[r.status]}>{r.status}</StatusPill>
          </div>
        }
        subtitle={`${r.customerName} · ${formatDate(r.returnDate)} · against ${r.invoiceNo}`}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/sales/returns"><ArrowLeft />Back</Link></Button>
            <Button variant="ghost" className="gap-1.5" onClick={() => toast.info("Printing credit note…")}><Printer />Print</Button>
            {r.status === "DRAFT" && (
              <>
                <Button variant="danger" onClick={() => setRejectConfirm(true)}>Reject</Button>
                <Button variant="accent" className="gap-1.5" onClick={() => setApproveConfirm(true)}><CheckCircle2 />Approve & Post</Button>
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Condition summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 bg-success/5 border-success/30">
              <div className="text-2xs uppercase font-semibold text-success-dark dark:text-success-light">Resalable</div>
              <div className="text-2xl tabular font-bold text-success mt-1">{r.resalableQty}</div>
              <div className="text-xs text-success-dark/70 dark:text-success-light/70 mt-0.5">Restocked to active warehouse</div>
            </Card>
            <Card className="p-4 bg-danger/5 border-danger/30">
              <div className="text-2xs uppercase font-semibold text-danger-dark dark:text-danger-light">Damaged / Lost</div>
              <div className="text-2xl tabular font-bold text-danger mt-1">{r.damagedQty}</div>
              <div className="text-xs text-danger-dark/70 dark:text-danger-light/70 mt-0.5">Written off, debit-note candidate</div>
            </Card>
          </div>

          {/* Returned items */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700">
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">Returned Items</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.itemCount} items returning</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Product</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Original</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Returning</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Condition</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Restock To</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Refund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {SAMPLE_RETURN_LINES.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-navy-900 dark:text-white">{l.name}</div>
                      <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">{l.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular text-sm text-slate-600 dark:text-slate-300">{l.originalQty}</td>
                    <td className="px-4 py-3 text-right tabular text-sm font-bold text-warning">{l.returnedQty}</td>
                    <td className="px-4 py-3">
                      <Badge variant={l.condition === "RESALABLE" ? "success" : l.condition === "DAMAGED" ? "danger" : "warning"}>
                        {l.condition}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{l.restockTo ?? <span className="text-danger">— write-off —</span>}</td>
                    <td className="px-4 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(l.unitPrice * l.returnedQty)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-navy-900/40">
                  <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold uppercase tracking-wider">Total Refund</td>
                  <td className="px-4 py-3 text-right tabular text-base font-bold text-warning">{formatMoney(r.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>

          {(r.status === "POSTED" || r.status === "APPROVED") && (
            <Card className="bg-info/5 border-info/30">
              <CardBody>
                <h4 className="text-sm font-semibold text-info-dark dark:text-info-light mb-2">Accounting Posting</h4>
                <div className="text-xs font-mono text-info-dark/80 dark:text-info-light/80 space-y-1">
                  <div>DR Sales Returns &amp; Allowances  · CR Accounts Receivable ({r.customerName}) — {formatMoney(r.totalAmount)}</div>
                  <div>DR Inventory ({r.resalableQty} resalable units)  · CR COGS</div>
                  {r.damagedQty > 0 && <div>DR Inventory Write-off ({r.damagedQty} damaged)  · CR COGS</div>}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Customer</h3>
              <div className="flex items-center gap-3">
                <Avatar initials={r.customerInitials} size="md" />
                <div>
                  <div className="font-semibold text-navy-900 dark:text-white">{r.customerName}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{r.branch}</div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Details</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="Original Invoice" value={
                  <Link href="/sales/invoices/1" className="text-brand-yellow hover:underline tabular">{r.invoiceNo}</Link>
                } />
                <Meta label="Return Date" icon={Calendar} value={formatDate(r.returnDate)} />
                <Meta label="Refund Method" value={<Badge variant="info">{r.refundMethod}</Badge>} />
                <Meta label="Branch" value={r.branch} />
              </dl>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-navy-700">
                <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5"><FileText className="size-3" />Reason</div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5">{r.reason}</p>
              </div>
            </CardBody>
          </Card>

          {(r.damagedQty > 0) && (
            <Card className="bg-warning/5 border-warning/30">
              <CardBody>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="size-4 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-warning-dark dark:text-warning-light">Damaged stock present</h4>
                    <p className="text-xs text-warning-dark/80 dark:text-warning-light/80 mt-1">
                      {r.damagedQty} units will be written off. Consider creating a debit note to the supplier if items arrived damaged.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={approveConfirm}
        onOpenChange={setApproveConfirm}
        title="Approve and post this return?"
        description={`Stock will be returned to inventory (${r.resalableQty} resalable, ${r.damagedQty} damaged write-off). A reversing journal entry of ${formatMoney(r.totalAmount)} will be posted automatically.`}
        variant="info"
        confirmLabel="Approve & Post"
        onConfirm={() => { toast.success("Return posted", { description: `${formatMoney(r.totalAmount)} refunded via ${r.refundMethod}` }); setApproveConfirm(false); }}
      />
      <ConfirmDialog
        open={rejectConfirm}
        onOpenChange={setRejectConfirm}
        title="Reject this return?"
        variant="danger"
        confirmLabel="Reject"
        requireReason
        onConfirm={(reason) => { toast.success("Return rejected", { description: `Reason: ${reason}` }); setRejectConfirm(false); }}
      />
    </>
  );
}

function Meta({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: typeof Calendar }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5 text-slate-400" />}
        {label}
      </dt>
      <dd className="text-sm font-medium text-navy-900 dark:text-white">{value}</dd>
    </div>
  );
}
