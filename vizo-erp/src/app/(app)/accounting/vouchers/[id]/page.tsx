"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, AlertCircle, ArrowDownToLine, ArrowUpFromLine, FileText, CheckCircle2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { vouchers } from "@/data/accounting";
import { formatMoney, formatDate } from "@/lib/format";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

export default function VoucherDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const v = vouchers.find((x) => x.id === id);
  const [reconcile, setReconcile] = React.useState(false);
  const [cancel, setCancel] = React.useState(false);

  if (!v) return <EmptyState icon={AlertCircle} title="Voucher not found" action={<Button asChild><Link href="/accounting/vouchers">Back</Link></Button>} />;

  const isReceipt = ["CR", "BR", "WR"].includes(v.type);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Vouchers", href: "/accounting/vouchers" }, { label: v.voucherNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{v.voucherNo}</span>
            <Badge variant={isReceipt ? "success" : "danger"}>{v.typeName}</Badge>
            <StatusPill variant={v.status === "POSTED" ? "success" : v.status === "RECONCILED" ? "info" : v.status === "CANCELLED" ? "danger" : "muted"}>{v.status}</StatusPill>
          </div>
        }
        subtitle={v.narration}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/accounting/vouchers"><ArrowLeft />Back</Link></Button>
            <Button variant="ghost" className="gap-1.5"><Printer />Print</Button>
            {v.status === "POSTED" && (v.type === "BR" || v.type === "BP" || v.type === "WR" || v.type === "WP") && (
              <Button variant="accent" onClick={() => setReconcile(true)} className="gap-1.5">
                <CheckCircle2 />Reconcile
              </Button>
            )}
            {v.status !== "CANCELLED" && (
              <Button variant="ghost" className="text-danger" onClick={() => setCancel(true)}><X />Cancel</Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardBody>
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-navy-700">
                <div className={cn("size-12 rounded-xl flex items-center justify-center",
                  isReceipt ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                )}>
                  {isReceipt ? <ArrowDownToLine className="size-5" /> : <ArrowUpFromLine className="size-5" />}
                </div>
                <div className="flex-1">
                  <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Amount</div>
                  <div className={cn("text-3xl tabular font-bold",
                    isReceipt ? "text-success" : "text-danger"
                  )}>
                    {isReceipt ? "+" : "-"}{formatMoney(v.amount)}
                  </div>
                </div>
                <Badge variant="muted">{v.paymentMethod}</Badge>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Meta label="Voucher Date" value={formatDate(v.date)} />
                <Meta label="Type" value={v.typeName} />
                <Meta label="Branch" value={v.branch} />
                <Meta label="Party" value={`${v.partyName} (${v.partyType})`} />
                <Meta label="Payment Method" value={<Badge variant="muted">{v.paymentMethod}</Badge>} />
                {v.paymentProvider && <Meta label="Provider" value={v.paymentProvider} />}
                {v.reference && v.reference !== "—" && <Meta label="Reference" value={<span className="tabular">{v.reference}</span>} />}
                <Meta label="Status" value={<StatusPill variant={v.status === "POSTED" ? "success" : v.status === "RECONCILED" ? "info" : "muted"}>{v.status}</StatusPill>} />
                <Meta label="Created By" value={v.createdBy} />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="size-4 text-info" />
                <h3 className="text-base font-semibold text-navy-900 dark:text-white">Linked Journal Entry</h3>
              </div>
              <Link href="/accounting/journal-entries/1" className="block p-3 border border-slate-200 dark:border-navy-700 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">JE-26-1041</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{v.narration}</div>
                  </div>
                  <Badge variant="success">POSTED</Badge>
                </div>
              </Link>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Posting Logic</h3>
              <div className="text-xs font-mono space-y-1.5 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-navy-900 p-3 rounded-lg">
                {isReceipt ? (
                  <>
                    <div>DR &nbsp;{v.paymentMethod} Account &nbsp;{formatMoney(v.amount)}</div>
                    <div>CR &nbsp;Accounts Receivable &nbsp;{formatMoney(v.amount)}</div>
                  </>
                ) : (
                  <>
                    <div>DR &nbsp;Accounts Payable &nbsp;{formatMoney(v.amount)}</div>
                    <div>CR &nbsp;{v.paymentMethod} Account &nbsp;{formatMoney(v.amount)}</div>
                  </>
                )}
              </div>
            </CardBody>
          </Card>

          {v.status === "RECONCILED" && (
            <Card className="bg-success/5 border-success/30">
              <CardBody>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-success-dark dark:text-success-light">Reconciled</h4>
                    <p className="text-xs text-success-dark/80 dark:text-success-light/80 mt-0.5">
                      Matched against bank statement on {formatDate(v.date)}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={reconcile}
        onOpenChange={setReconcile}
        title="Mark voucher as reconciled?"
        description="This indicates the transaction has been verified against the bank/wallet statement."
        variant="info"
        confirmLabel="Mark reconciled"
        onConfirm={() => { toast.success("Voucher reconciled"); setReconcile(false); }}
      />
      <ConfirmDialog
        open={cancel}
        onOpenChange={setCancel}
        title="Cancel this voucher?"
        description="A reversing journal entry will be posted automatically."
        variant="danger"
        confirmLabel="Yes, cancel voucher"
        requireReason
        onConfirm={(r) => { toast.success("Voucher cancelled", { description: `Reason: ${r}` }); setCancel(false); }}
      />
    </>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-navy-900 dark:text-white mt-1">{value}</dd>
    </div>
  );
}
