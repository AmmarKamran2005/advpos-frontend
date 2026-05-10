"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Lock, Calendar, AlertTriangle, ListChecks, X, Eye } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

type Period = {
  id: number;
  period: string;
  year: number;
  branch: string;
  isClosed: boolean;
  draftCount: number;
  unreconciledCount: number;
  unpostedInvoicesCount: number;
  closedBy?: string;
  closedAt?: string;
  jeCount: number;
};

const PERIODS: Period[] = [
  { id: 1, period: "Apr 2026", year: 2026, branch: "All",       isClosed: false, draftCount: 1, unreconciledCount: 3, unpostedInvoicesCount: 0,  jeCount: 142 },
  { id: 2, period: "Mar 2026", year: 2026, branch: "All",       isClosed: true,  draftCount: 0, unreconciledCount: 0, unpostedInvoicesCount: 0, closedBy: "Hassan Raza", closedAt: "2026-04-05", jeCount: 168 },
  { id: 3, period: "Feb 2026", year: 2026, branch: "All",       isClosed: true,  draftCount: 0, unreconciledCount: 0, unpostedInvoicesCount: 0, closedBy: "Hassan Raza", closedAt: "2026-03-04", jeCount: 154 },
  { id: 4, period: "Jan 2026", year: 2026, branch: "All",       isClosed: true,  draftCount: 0, unreconciledCount: 0, unpostedInvoicesCount: 0, closedBy: "Hassan Raza", closedAt: "2026-02-03", jeCount: 142 },
];

export default function PeriodClosePage() {
  const [periods, setPeriods] = React.useState(PERIODS);
  const [closeTarget, setCloseTarget] = React.useState<Period | null>(null);
  const [reopenTarget, setReopenTarget] = React.useState<Period | null>(null);
  const [closing, setClosing] = React.useState(false);

  async function handleClose() {
    if (!closeTarget) return;
    setClosing(true);
    await new Promise((r) => setTimeout(r, 800));
    setPeriods((cur) => cur.map((p) => p.id === closeTarget.id ? { ...p, isClosed: true, closedBy: "You", closedAt: new Date().toISOString().slice(0, 10) } : p));
    toast.success(`${closeTarget.period} closed`, { description: "No further postings allowed in this period." });
    setClosing(false);
    setCloseTarget(null);
  }

  async function handleReopen() {
    if (!reopenTarget) return;
    setClosing(true);
    await new Promise((r) => setTimeout(r, 600));
    setPeriods((cur) => cur.map((p) => p.id === reopenTarget.id ? { ...p, isClosed: false, closedBy: undefined, closedAt: undefined } : p));
    toast.success(`${reopenTarget.period} reopened`, { description: "Backdated postings now allowed (audit logged)." });
    setClosing(false);
    setReopenTarget(null);
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Period Close" }]}
        title="Period Close"
        subtitle="Lock accounting periods to prevent backdated postings"
      />

      <Card className="bg-info/5 border-info/20 mb-6">
        <CardBody>
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
              <Lock className="size-5 text-info" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-info-dark dark:text-info-light">About Period Close</h3>
              <p className="text-xs text-info-dark/80 dark:text-info-light/80 mt-1">
                Closing a period locks all journal entries within it. No backdated transactions can be posted. Closing requires all draft entries to be reviewed first.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-3">
        {periods.map((p) => {
          const blockers = p.draftCount + p.unreconciledCount + p.unpostedInvoicesCount;
          const ready = blockers === 0;
          return (
            <Card key={p.id} className={p.isClosed ? "" : (ready ? "border-success/30 bg-success/[0.02]" : "border-warning/30 bg-warning/[0.02]")}>
              <CardBody>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`size-12 rounded-xl flex items-center justify-center ${p.isClosed ? "bg-success/10 text-success" : ready ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                      {p.isClosed ? <Lock className="size-5" /> : <Calendar className="size-5" />}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-navy-900 dark:text-white">{p.period}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {p.isClosed ? <Badge variant="success">Closed</Badge> : ready ? <Badge variant="success">Ready</Badge> : <Badge variant="warning">{blockers} blocker{blockers === 1 ? "" : "s"}</Badge>}
                        <span className="text-xs text-slate-500 dark:text-slate-400">{p.branch} · {p.jeCount} entries</span>
                      </div>
                    </div>
                  </div>

                  {p.isClosed ? (
                    <>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Closed on <span className="font-semibold text-navy-900 dark:text-white">{p.closedAt}</span> by <span className="font-semibold text-navy-900 dark:text-white">{p.closedBy}</span>
                      </div>
                      <Button variant="ghost" size="md" asChild>
                        <Link href={`/accounting/journal-entries?period=${p.id}`}><Eye />View JEs</Link>
                      </Button>
                      <Button variant="ghost" size="md" className="text-warning gap-1.5" onClick={() => setReopenTarget(p)}>
                        Reopen
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 text-xs">
                        {ready ? (
                          <span className="inline-flex items-center gap-1.5 text-success font-semibold"><CheckCircle2 className="size-3.5" />Ready to close</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {p.draftCount > 0 && (
                              <Link href={`/accounting/journal-entries?status=DRAFT`} className="inline-flex items-center gap-1.5 text-warning hover:underline">
                                <AlertTriangle className="size-3.5" />{p.draftCount} draft entr{p.draftCount === 1 ? "y" : "ies"}
                              </Link>
                            )}
                            {p.unreconciledCount > 0 && (
                              <Link href={`/accounting/vouchers?status=POSTED`} className="inline-flex items-center gap-1.5 text-warning hover:underline">
                                <AlertTriangle className="size-3.5" />{p.unreconciledCount} unreconciled voucher{p.unreconciledCount === 1 ? "" : "s"}
                              </Link>
                            )}
                            {p.unpostedInvoicesCount > 0 && (
                              <Link href={`/sales/invoices?status=DRAFT`} className="inline-flex items-center gap-1.5 text-warning hover:underline">
                                <AlertTriangle className="size-3.5" />{p.unpostedInvoicesCount} unposted invoice{p.unpostedInvoicesCount === 1 ? "" : "s"}
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="md" asChild>
                          <Link href={`/accounting/journal-entries?period=${p.id}`}><Eye />View Entries</Link>
                        </Button>
                        <Button variant="accent" size="md" className="gap-1.5" onClick={() => setCloseTarget(p)} disabled={!ready}>
                          <Lock />Close Period
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Close Period Dialog with checklist */}
      <Dialog open={closeTarget !== null} onOpenChange={(o) => !o && setCloseTarget(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                <Lock className="size-5 text-warning" />
              </div>
              <div>
                <DialogTitle>Close {closeTarget?.period}?</DialogTitle>
                <DialogDescription className="mt-1">
                  Once closed, no transactions can be posted, edited, or reversed in this period without reopening it (which is logged in the audit trail).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogBody>
            <div className="bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                <ListChecks className="size-3.5" />
                Pre-close checklist
              </div>
              <div className="space-y-2.5 text-sm">
                <ChecklistItem ok={(closeTarget?.draftCount ?? 0) === 0} label="All draft journal entries posted" />
                <ChecklistItem ok={(closeTarget?.unreconciledCount ?? 0) === 0} label="All bank/wallet vouchers reconciled" />
                <ChecklistItem ok={(closeTarget?.unpostedInvoicesCount ?? 0) === 0} label="All invoices posted" />
                <ChecklistItem ok={true} label="Trial balance reviewed" />
                <ChecklistItem ok={true} label="Bank reconciliations completed" />
              </div>
            </div>
            <div className="mt-4 p-3 bg-info/5 border border-info/20 rounded-lg text-xs text-info-dark dark:text-info-light">
              <strong>{closeTarget?.jeCount} journal entries</strong> across <strong>{closeTarget?.branch}</strong> will be locked.
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCloseTarget(null)} disabled={closing}><X /> Cancel</Button>
            <Button type="button" variant="accent" onClick={handleClose} disabled={closing}>
              {closing ? "Closing…" : <><Lock />Yes, close period</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Dialog */}
      <Dialog open={reopenTarget !== null} onOpenChange={(o) => !o && setReopenTarget(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="size-5 text-warning" />
              </div>
              <div>
                <DialogTitle>Reopen {reopenTarget?.period}?</DialogTitle>
                <DialogDescription className="mt-1">
                  Reopening allows backdated postings into this period. This action is logged in the audit trail and will require period close approval again.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setReopenTarget(null)} disabled={closing}><X /> Cancel</Button>
            <Button type="button" variant="danger" onClick={handleReopen} disabled={closing}>
              {closing ? "Reopening…" : "Yes, reopen period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", ok ? "text-success" : "text-warning")}>
      {ok ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
      <span>{label}</span>
    </div>
  );
}
