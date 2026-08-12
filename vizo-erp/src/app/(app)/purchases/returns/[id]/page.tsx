"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, AlertCircle, CheckCircle2, Printer, Calendar, FileText, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { purchaseReturns, PR_STATUS_VARIANT } from "@/data/purchases";
import { formatMoney, formatDate } from "@/lib/format";
import { toast } from "@/components/ui/toaster";
import { statusLabel } from "@/lib/labels";

export default function PurchaseReturnDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const r = purchaseReturns.find((x) => x.id === id);
  const [approveConfirm, setApproveConfirm] = React.useState(false);
  const [rejectConfirm, setRejectConfirm] = React.useState(false);

  if (!r) return <EmptyState icon={AlertCircle} title="Purchase return not found" action={<Button asChild><Link href="/purchases/returns">Back</Link></Button>} />;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Returns", href: "/purchases/returns" }, { label: r.returnNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <RotateCcw className="size-6 text-brand-yellow" />
            <span>{r.returnNo}</span>
            <StatusPill variant={PR_STATUS_VARIANT[r.status]}>{statusLabel(r.status)}</StatusPill>
          </div>
        }
        subtitle={`Debit note to ${r.supplier} · ${formatDate(r.date)} · against ${r.invoiceNo}`}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/purchases/returns"><ArrowLeft />Back</Link></Button>
            <Button variant="ghost" className="gap-1.5" onClick={() => toast.info("Printing debit note…")}><Printer />Print</Button>
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
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-navy-700">
                <h3 className="text-base font-semibold text-navy-900 dark:text-white">Debit Note Details</h3>
                <div className="text-2xl tabular font-bold text-warning">-{formatMoney(r.totalAmount)}</div>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Meta label="Original PI" value={<Link href="/purchases/invoices/1" className="text-brand-yellow hover:underline tabular">{r.invoiceNo}</Link>} />
                <Meta label="Return Date" icon={Calendar} value={formatDate(r.date)} />
                <Meta label="Items returned" value={`${r.itemCount} products`} />
                <Meta label="Reason" icon={FileText} value={<Badge variant="muted">{r.reason}</Badge>} />
              </dl>
            </CardBody>
          </Card>

          {(r.status === "POSTED" || r.status === "APPROVED") && (
            <Card className="bg-info/5 border-info/30">
              <CardBody>
                <h4 className="text-sm font-semibold text-info-dark dark:text-info-light mb-2">Accounting Posting</h4>
                <div className="text-xs font-mono text-info-dark/80 dark:text-info-light/80 space-y-1">
                  <div>DR Accounts Payable ({r.supplier}) — {formatMoney(r.totalAmount)}</div>
                  <div>CR Inventory + Reverse Input Sales Tax</div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Supplier</h3>
              <div className="flex items-center gap-3">
                <Avatar initials={r.initials} size="md" />
                <div>
                  <div className="font-semibold text-navy-900 dark:text-white">{r.supplier}</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={approveConfirm}
        onOpenChange={setApproveConfirm}
        title="Approve and post this return?"
        description={`Stock will be removed from inventory. Accounts Payable to ${r.supplier} will reduce by ${formatMoney(r.totalAmount)}. A debit note will be sent to the supplier.`}
        variant="info"
        confirmLabel="Approve & Post"
        onConfirm={() => { toast.success("Purchase return posted", { description: `Debit note sent to ${r.supplier}` }); setApproveConfirm(false); }}
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
    <div>
      <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5 text-slate-400" />}
        {label}
      </dt>
      <dd className="text-sm font-medium text-navy-900 dark:text-white mt-1">{value}</dd>
    </div>
  );
}
