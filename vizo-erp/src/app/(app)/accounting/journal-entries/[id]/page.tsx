"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, AlertCircle, RotateCcw, Lock, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { journalEntries, JE_STATUS_VARIANT, accounts } from "@/data/accounting";
import { formatMoney, formatDate } from "@/lib/format";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const MOCK_LINES = [
  { id: 1, accountCode: "1130", accountName: "Accounts Receivable",      debit: 145000, credit: 0,      branch: "Karachi", desc: "Hafeez Center #28 — INV-142" },
  { id: 2, accountCode: "4001", accountName: "Sales Revenue",             debit: 0,      credit: 122881, branch: "Karachi", desc: "Sales tax exclusive" },
  { id: 3, accountCode: "2110", accountName: "Output Sales Tax Payable",  debit: 0,      credit: 22119,  branch: "Karachi", desc: "GST 18%" },
  { id: 4, accountCode: "5001", accountName: "Cost of Goods Sold",        debit: 84500,  credit: 0,      branch: "Karachi", desc: "Avg cost × qty" },
  { id: 5, accountCode: "1140", accountName: "Inventory",                  debit: 0,      credit: 84500,  branch: "Karachi", desc: "Stock reduced" },
];

export default function JEDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const je = journalEntries.find((e) => e.id === id);
  const [post, setPost] = React.useState(false);
  const [reverse, setReverse] = React.useState(false);

  if (!je) return <EmptyState icon={AlertCircle} title="Journal entry not found" action={<Button asChild><Link href="/accounting/journal-entries">Back</Link></Button>} />;

  const debitTotal = MOCK_LINES.reduce((s, l) => s + l.debit, 0);
  const creditTotal = MOCK_LINES.reduce((s, l) => s + l.credit, 0);
  const balanced = debitTotal === creditTotal;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Journal Entries", href: "/accounting/journal-entries" }, { label: je.entryNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{je.entryNo}</span>
            <StatusPill variant={JE_STATUS_VARIANT[je.status]}>{je.status}</StatusPill>
            <Badge variant="muted">{je.entryType}</Badge>
          </div>
        }
        subtitle={je.narration}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/accounting/journal-entries"><ArrowLeft />Back</Link></Button>
            <Button variant="ghost" className="gap-1.5"><Printer />Print</Button>
            {je.status === "DRAFT" && (
              <Button variant="accent" onClick={() => setPost(true)} className="gap-1.5">
                <CheckCircle2 />Post Entry
              </Button>
            )}
            {je.status === "POSTED" && (
              <Button variant="danger" onClick={() => setReverse(true)} className="gap-1.5">
                <RotateCcw />Reverse Entry
              </Button>
            )}
          </>
        }
      />

      {je.status === "POSTED" && (
        <Card className="bg-success/5 border-success/30 mb-6">
          <CardBody className="py-3">
            <div className="flex items-center gap-2 text-sm text-success-dark dark:text-success-light">
              <Lock className="size-4" />
              <span><strong>Posted entries are immutable.</strong> To correct, post a reversing entry.</span>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700">
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">Journal Lines</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Account</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Branch</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Description</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Debit</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {MOCK_LINES.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-navy-900 dark:text-white">{l.accountName}</div>
                      <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{l.accountCode}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{l.branch}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{l.desc}</td>
                    <td className="px-4 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{l.debit > 0 ? formatMoney(l.debit) : "—"}</td>
                    <td className="px-4 py-3 text-right tabular text-sm font-semibold text-success">{l.credit > 0 ? formatMoney(l.credit) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-navy-900 text-white">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-bold uppercase tracking-wider">Totals</td>
                  <td className="px-4 py-3 text-right tabular text-sm font-bold">{formatMoney(debitTotal)}</td>
                  <td className="px-4 py-3 text-right tabular text-sm font-bold">{formatMoney(creditTotal)}</td>
                </tr>
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-right text-2xs">
                    {balanced ? <span className="text-brand-yellow">✓ Balanced</span> : <span className="text-danger">⚠ Diff: {formatMoney(Math.abs(debitTotal - creditTotal))}</span>}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Entry Details</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="Entry #" value={<span className="tabular">{je.entryNo}</span>} />
                <Meta label="Type" value={<Badge variant="muted">{je.entryType}</Badge>} />
                <Meta label="Date" value={formatDate(je.entryDate)} />
                <Meta label="Branch" value={je.branch} />
                <Meta label="Reference" value={<span className="tabular">{je.reference}</span>} />
                <Meta label="Created By" value={je.createdBy} />
                {je.postedBy && <Meta label="Posted By" value={je.postedBy} />}
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={post}
        onOpenChange={setPost}
        title="Post this journal entry?"
        description="Posted entries become immutable. To correct, you must post a reversing entry."
        variant="info"
        confirmLabel="Yes, post entry"
        onConfirm={() => { toast.success("Entry posted", { description: `${je.entryNo} is now immutable.` }); setPost(false); }}
      />

      <ConfirmDialog
        open={reverse}
        onOpenChange={setReverse}
        title="Reverse this journal entry?"
        description="A new reversing entry will be posted with debits and credits swapped. The original entry will remain in the audit trail."
        variant="danger"
        confirmLabel="Yes, reverse entry"
        requireReason
        reasonLabel="Reason for reversal"
        onConfirm={(r) => { toast.success("Reversing entry posted", { description: `Reason: ${r}` }); setReverse(false); }}
      />
    </>
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
