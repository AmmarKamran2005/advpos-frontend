"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Edit3, Printer, AlertCircle, Trash2, FileText, Receipt, Calendar, Building2, Tag, Banknote, Download } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { expenses } from "@/data/accounting";
import { formatMoney, formatDate } from "@/lib/format";
import { toast } from "@/components/ui/toaster";

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const e = expenses.find((x) => x.id === id);
  const [voidConfirm, setVoidConfirm] = React.useState(false);

  if (!e) {
    return <EmptyState icon={AlertCircle} title="Expense not found" action={<Button asChild><Link href="/accounting/expenses">Back</Link></Button>} />;
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Expenses", href: "/accounting/expenses" }, { label: e.expenseNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{e.expenseNo}</span>
            <StatusPill variant={e.status === "POSTED" ? "success" : "muted"}>{e.status}</StatusPill>
            <Badge variant="muted">{e.category}</Badge>
          </div>
        }
        subtitle={`${formatDate(e.date)} · ${e.vendor}`}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/accounting/expenses"><ArrowLeft />Back</Link></Button>
            <Button variant="ghost" className="gap-1.5" onClick={() => toast.info("Printing receipt…")}><Printer />Print</Button>
            <Button variant="secondary" className="gap-1.5" asChild><Link href={`/accounting/expenses/new?id=${e.id}`}><Edit3 />Edit</Link></Button>
            {e.status === "POSTED" && (
              <Button variant="ghost" className="text-danger" onClick={() => setVoidConfirm(true)}><Trash2 />Void</Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardBody>
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-navy-700">
                <div className="size-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
                  <Receipt className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Amount</div>
                  <div className="text-3xl tabular font-bold text-danger">-{formatMoney(e.amount)}</div>
                </div>
                <Badge variant="muted">{e.paidVia}</Badge>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <Meta label="Date"     icon={Calendar}  value={formatDate(e.date)} />
                <Meta label="Branch"    icon={Building2} value={e.branch} />
                <Meta label="Category"  icon={Tag}       value={e.category} />
                <Meta label="Vendor"    icon={Receipt}   value={e.vendor} />
                <Meta label="Account"                    value={e.account} />
                <Meta label="Paid Via"  icon={Banknote}  value={<Badge variant="muted">{e.paidVia}</Badge>} />
              </dl>
            </CardBody>
          </Card>

          {/* Receipt attachment placeholder */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-navy-900 dark:text-white">Receipt / Attachments</h3>
                <Button variant="ghost" size="sm" className="gap-1"><Download className="size-3.5" />Download</Button>
              </div>
              <div className="border border-slate-200 dark:border-navy-700 rounded-lg p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-navy-700 cursor-pointer">
                <div className="size-10 rounded-lg bg-info/10 flex items-center justify-center text-info">
                  <FileText className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-navy-900 dark:text-white">{e.expenseNo}-receipt.pdf</div>
                  <div className="text-2xs text-slate-500 dark:text-slate-400">84 KB · Uploaded {formatDate(e.date)}</div>
                </div>
                <Button variant="ghost" size="sm">Preview</Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Linked Journal Entry</h3>
              <Link href="/accounting/journal-entries/5" className="block p-3 border border-slate-200 dark:border-navy-700 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">JE-26-1038</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Office rent — April 2026</div>
                  </div>
                  <Badge variant="success">POSTED</Badge>
                </div>
              </Link>
              <div className="mt-4 p-3 bg-slate-50 dark:bg-navy-900 rounded-lg">
                <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Auto-posting</div>
                <div className="text-xs font-mono mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                  <div>DR &nbsp;{e.account} &nbsp;{formatMoney(e.amount)}</div>
                  <div>CR &nbsp;{e.paidVia} &nbsp;{formatMoney(e.amount)}</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={voidConfirm}
        onOpenChange={setVoidConfirm}
        title="Void this expense?"
        description="A reversing journal entry will be posted automatically. The receipt and audit trail are preserved."
        variant="danger"
        confirmLabel="Yes, void expense"
        requireReason
        reasonLabel="Reason for voiding"
        onConfirm={(r) => { toast.success("Expense voided", { description: `Reason: ${r}` }); setVoidConfirm(false); }}
      />
    </>
  );
}

function Meta({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: typeof Calendar }) {
  return (
    <div>
      <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-navy-900 dark:text-white mt-1 inline-flex items-center gap-2">
        {Icon && <Icon className="size-3.5 text-slate-400" />}
        {value}
      </dd>
    </div>
  );
}
