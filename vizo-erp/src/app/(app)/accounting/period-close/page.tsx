"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { CheckCircle2, Lock, Calendar, AlertTriangle, ListChecks, X, Eye, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /accounting/periods -> every FiscalPeriod, newest first.
   `draftCount` is what actually blocks a close: the API refuses while any entry
   in the period is still unposted, so the button is disabled for the same
   reason rather than a different one. */
type Period = {
  id: number;
  name: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  closedAt: string | null;
  closedBy: string | null;
  entryCount: number;
  draftCount: number;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function PeriodClosePage() {
  const [periods, setPeriods] = React.useState<Period[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [closeTarget, setCloseTarget] = React.useState<Period | null>(null);
  const [reopenTarget, setReopenTarget] = React.useState<Period | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Period[]>(`${API_BASE_URL}/accounting/periods`, { headers: authHeader() });
      setPeriods(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the accounting periods."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  async function handleClose() {
    if (!closeTarget) return;
    setBusy(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/accounting/periods/${closeTarget.id}/close`, {}, { headers: authHeader() }
      );
      await load();
      toast.success(`${closeTarget.name} closed`, { description: res.data.message });
      setCloseTarget(null);
    } catch (e) {
      toast.error("Period not closed", { description: apiMessage(e, "Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  async function handleReopen() {
    if (!reopenTarget) return;
    setBusy(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/accounting/periods/${reopenTarget.id}/reopen`, {}, { headers: authHeader() }
      );
      await load();
      toast.success(`${reopenTarget.name} reopened`, { description: res.data.message });
      setReopenTarget(null);
    } catch (e) {
      toast.error("Period not reopened", { description: apiMessage(e, "Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  const openCount = periods.filter((p) => !p.isClosed).length;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Period Close" }]}
        title="Period Close"
        subtitle="Lock accounting periods to prevent backdated postings"
        actions={
          <Button variant="ghost" size="md" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
            <RefreshCw className="size-4" /><span className="hidden sm:inline">Refresh</span>
          </Button>
        }
      />

      {error && (
        <Card className="mb-6">
          <CardBody className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy-900 dark:text-white">{error}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                The API must be running on {API_BASE_URL}.
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" /> Try again
            </Button>
          </CardBody>
        </Card>
      )}

      <Card className="bg-info/5 border-info/20 mb-6">
        <CardBody>
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
              <Lock className="size-5 text-info" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-info-dark dark:text-info-light">About Period Close</h3>
              <p className="text-xs text-info-dark/80 dark:text-info-light/80 mt-1">
                Closing a period locks all journal entries within it, so no backdated transaction can be posted.
                The server refuses to close a period that still holds an unposted entry — post or delete those first.
                {openCount > 0 && ` ${openCount} ${openCount === 1 ? "period is" : "periods are"} still open.`}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : periods.length === 0 ? (
        <Card>
          <EmptyState
            icon={Calendar}
            title="No accounting periods"
            description="Nothing is set up in FiscalPeriod yet, so there is nothing to close."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {periods.map((p) => {
            const blocked = p.draftCount > 0;
            return (
              <Card key={p.id} className={cn(p.isClosed && "bg-slate-50/60 dark:bg-navy-900/40")}>
                <CardBody className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className={cn(
                    "size-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    p.isClosed ? "bg-success/10 text-success" : "bg-brand-yellow/10 text-brand-yellow"
                  )}>
                    {p.isClosed ? <CheckCircle2 className="size-5" /> : <Calendar className="size-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-navy-900 dark:text-white">{p.name}</span>
                      {p.isClosed
                        ? <Badge variant="success">Closed</Badge>
                        : <Badge variant="warning">Open</Badge>}
                      {blocked && !p.isClosed && (
                        <Badge variant="danger">{p.draftCount} unposted</Badge>
                      )}
                    </div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatDate(p.startDate)} – {formatDate(p.endDate)} ·{" "}
                      <span className="tabular">{p.entryCount}</span>{" "}
                      {p.entryCount === 1 ? "entry" : "entries"}
                      {p.isClosed && p.closedBy && ` · closed by ${p.closedBy}`}
                      {p.isClosed && p.closedAt && ` on ${formatDate(p.closedAt)}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                      <Link href={`/accounting/journal-entries?periodId=${p.id}`}>
                        <Eye className="size-3.5" /> Entries
                      </Link>
                    </Button>
                    {p.isClosed ? (
                      <Button variant="ghost" size="sm" className="gap-1.5 text-warning"
                        onClick={() => setReopenTarget(p)} disabled={busy}>
                        <X className="size-3.5" /> Reopen
                      </Button>
                    ) : (
                      <Button variant="accent" size="sm" className="gap-1.5"
                        onClick={() => setCloseTarget(p)} disabled={busy || blocked}
                        title={blocked ? `${p.draftCount} unposted entries must be dealt with first` : undefined}>
                        <Lock className="size-3.5" /> Close
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Close confirmation ─────────────────────────────────────── */}
      <Dialog open={closeTarget !== null} onOpenChange={(v) => !v && setCloseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close {closeTarget?.name}?</DialogTitle>
            <DialogDescription>
              No further postings will be allowed in this period.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <Check ok label={`${closeTarget?.entryCount ?? 0} journal entries in the period`} />
              <Check ok={(closeTarget?.draftCount ?? 0) === 0}
                label={
                  (closeTarget?.draftCount ?? 0) === 0
                    ? "Every entry is posted"
                    : `${closeTarget?.draftCount} entries are still drafts`
                } />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
              This can be undone from this screen, and the reopen is written to the audit log.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloseTarget(null)} disabled={busy}>Cancel</Button>
            <Button variant="accent" className="gap-1.5" onClick={() => void handleClose()} disabled={busy}>
              {busy ? <><Loader2 className="size-4 animate-spin" /> Closing…</> : <><Lock className="size-4" /> Close period</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reopen confirmation ────────────────────────────────────── */}
      <Dialog open={reopenTarget !== null} onOpenChange={(v) => !v && setReopenTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen {reopenTarget?.name}?</DialogTitle>
            <DialogDescription>
              Backdated postings into this period will be allowed again.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/5 border border-warning/25">
              <AlertTriangle className="size-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Anything already reported off this period can change. The reopen is recorded in the
                audit log against your name.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReopenTarget(null)} disabled={busy}>Cancel</Button>
            <Button variant="danger" className="gap-1.5" onClick={() => void handleReopen()} disabled={busy}>
              {busy ? <><Loader2 className="size-4 animate-spin" /> Reopening…</> : <><X className="size-4" /> Reopen period</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok
        ? <CheckCircle2 className="size-4 text-success flex-shrink-0" />
        : <AlertTriangle className="size-4 text-danger flex-shrink-0" />}
      <span className={cn(!ok && "text-danger")}>{label}</span>
      {ok && <ListChecks className="size-3 text-slate-300 ml-auto" />}
    </div>
  );
}
