"use client";

import * as React from "react";
import axios from "axios";
import {
  Landmark, CheckCircle2, AlertTriangle, Sparkles, Link2, X, Loader2,
  AlertCircle, RefreshCw, Lock,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /accounting/reconciliation -> one row per statement. */
type ReconSummary = {
  id: number;
  accountId: number;
  accountName: string;
  statementDate: string;
  openingBalance: number;
  closingBalance: number;
  status: string;
  statusName: string;
  finalizedOn: string | null;
  preparedBy: string;
  lineCount: number;
  matchedCount: number;
  unmatchedTotal: number;
};

/* GET /accounting/reconciliation/{id} -> the statement lines and the posted
   ledger lines on the same account that they can be matched against.

   `amount` on both sides is signed the way a bank statement reads: positive is
   money into the account. On the ledger side the API works that out as
   debit − credit, so the two columns can be compared directly. */
type StatementLine = {
  id: number;
  date: string;
  description: string;
  amount: number;
  matchedLineId: number | null;
};

type LedgerLine = {
  id: number;
  date: string;
  entryNo: string;
  entryType: string;
  description: string | null;
  party: string | null;
  amount: number;
};

type ReconDetail = {
  id: number;
  accountId: number;
  accountName: string;
  accountCode: string;
  statementDate: string;
  openingBalance: number;
  closingBalance: number;
  status: string;
  statusName: string;
  finalizedOn: string | null;
  preparedBy: string;
  statementLines: StatementLine[];
  ledgerLines: LedgerLine[];
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function ReconciliationPage() {
  const [list, setList] = React.useState<ReconSummary[]>([]);
  const [detail, setDetail] = React.useState<ReconDetail | null>(null);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [loadingList, setLoadingList] = React.useState(true);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedStatement, setSelectedStatement] = React.useState<number | null>(null);
  const [selectedLedger, setSelectedLedger] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [confirmFinalize, setConfirmFinalize] = React.useState(false);

  const loadList = React.useCallback(async () => {
    try {
      const res = await axios.get<ReconSummary[]>(`${API_BASE_URL}/accounting/reconciliation`, { headers: authHeader() });
      setList(res.data);
      setSelectedId((cur) => cur ?? res.data[0]?.id ?? null);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the bank reconciliations."));
    } finally {
      setLoadingList(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void loadList();
  }, [loadList]);

  const loadDetail = React.useCallback(async () => {
    if (selectedId === null) return;
    setLoadingDetail(true);
    try {
      const res = await axios.get<ReconDetail>(`${API_BASE_URL}/accounting/reconciliation/${selectedId}`, { headers: authHeader() });
      setDetail(res.data);
      setSelectedStatement(null);
      setSelectedLedger(null);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load this reconciliation."));
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedId]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       Same reason as above: this is the requested per-page fetch pattern. */
    void loadDetail();
  }, [loadDetail]);

  /* ── derived ─────────────────────────────────────────────────────── */

  const locked = detail?.finalizedOn !== null && detail?.finalizedOn !== undefined;

  const matchedLedgerIds = React.useMemo(
    () => new Set((detail?.statementLines ?? []).map((l) => l.matchedLineId).filter((x): x is number => x !== null)),
    [detail]
  );

  const unmatchedStatement = (detail?.statementLines ?? []).filter((l) => l.matchedLineId === null);
  const unmatchedLedger = (detail?.ledgerLines ?? []).filter((l) => !matchedLedgerIds.has(l.id));
  const matchedPairs = (detail?.statementLines ?? []).filter((l) => l.matchedLineId !== null);

  const statementMovement = (detail?.statementLines ?? []).reduce((s, l) => s + l.amount, 0);
  const expectedMovement = detail ? detail.closingBalance - detail.openingBalance : 0;
  const diff = expectedMovement - statementMovement;

  const ledgerById = React.useMemo(() => {
    const m = new Map<number, LedgerLine>();
    for (const l of detail?.ledgerLines ?? []) m.set(l.id, l);
    return m;
  }, [detail]);

  /* ── actions ─────────────────────────────────────────────────────── */

  /** One POST per pair; the server is the judge of whether each is allowed. */
  async function postMatch(statementLineId: number, journalEntryLineId: number | null, quiet = false) {
    if (!detail) return false;
    try {
      await axios.post(
        `${API_BASE_URL}/accounting/reconciliation/${detail.id}/match`,
        { statementLineId, journalEntryLineId },
        { headers: authHeader() }
      );
      return true;
    } catch (e) {
      if (!quiet) toast.error("Could not match", { description: apiMessage(e, "Please try again.") });
      return false;
    }
  }

  async function manualMatch() {
    if (selectedStatement === null || selectedLedger === null || !detail) return;
    const bank = detail.statementLines.find((l) => l.id === selectedStatement);
    const led = ledgerById.get(selectedLedger);
    if (!bank || !led) return;

    if (Math.abs(bank.amount - led.amount) > 0.01) {
      toast.error("Amounts don't match", {
        description: `Statement: ${formatMoney(bank.amount)} · Ledger: ${formatMoney(led.amount)}`,
      });
      return;
    }

    setBusy(true);
    if (await postMatch(bank.id, led.id)) {
      await loadDetail();
      await loadList();
      toast.success("Match confirmed");
    }
    setBusy(false);
  }

  async function unmatch(statementLineId: number) {
    setBusy(true);
    if (await postMatch(statementLineId, null)) {
      await loadDetail();
      await loadList();
      toast.info("Match removed");
    }
    setBusy(false);
  }

  /** Pairs equal amounts within three days, then persists each one. */
  async function autoMatch() {
    if (!detail) return;
    setBusy(true);

    const takenLedger = new Set(matchedLedgerIds);
    const pairs: { statementLineId: number; ledgerLineId: number }[] = [];

    for (const bank of unmatchedStatement) {
      const candidate = detail.ledgerLines.find(
        (led) =>
          !takenLedger.has(led.id) &&
          Math.abs(led.amount - bank.amount) < 0.01 &&
          Math.abs(new Date(led.date).getTime() - new Date(bank.date).getTime()) < 3 * 86400000
      );
      if (candidate) {
        takenLedger.add(candidate.id);
        pairs.push({ statementLineId: bank.id, ledgerLineId: candidate.id });
      }
    }

    if (pairs.length === 0) {
      setBusy(false);
      toast.info("Nothing to auto-match", { description: "No unmatched pair has the same amount within three days." });
      return;
    }

    let saved = 0;
    for (const p of pairs) {
      if (await postMatch(p.statementLineId, p.ledgerLineId, true)) saved += 1;
    }

    await loadDetail();
    await loadList();
    setBusy(false);

    if (saved === pairs.length) {
      toast.success(`${saved} ${saved === 1 ? "line" : "lines"} auto-matched`, { description: "Review them below before finalising." });
    } else {
      toast.warning(`${saved} of ${pairs.length} matched`, { description: "The server refused the rest — check them by hand." });
    }
  }

  async function finalize() {
    if (!detail) return;
    setBusy(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/accounting/reconciliation/${detail.id}/finalize`, {}, { headers: authHeader() }
      );
      await loadDetail();
      await loadList();
      setConfirmFinalize(false);
      toast.success("Reconciliation finalised", { description: res.data.message });
    } catch (e) {
      toast.error("Not finalised", { description: apiMessage(e, "Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  /* ── render ──────────────────────────────────────────────────────── */

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Bank Reconciliation" }]}
        title={<><Landmark className="size-6 inline-block mr-2 text-brand-yellow" />Bank Reconciliation</>}
        subtitle="Match bank statement lines against posted ledger entries"
        actions={
          <>
            <Button variant="ghost" className="gap-1.5" onClick={() => { setLoadingList(true); void loadList(); void loadDetail(); }}>
              <RefreshCw className="size-4" /><span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="accent" className="gap-1.5"
              onClick={() => setConfirmFinalize(true)}
              disabled={!detail || locked || busy || unmatchedStatement.length > 0}>
              <CheckCircle2 />Finalize
            </Button>
          </>
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
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoadingList(true); void loadList(); }}>
              <RefreshCw className="size-4" /> Try again
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Which statement */}
      <Card className="mb-6">
        <CardBody>
          {loadingList ? (
            <Skeleton className="h-16" />
          ) : list.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title="No bank reconciliations"
              description="Nothing exists in BankReconciliation yet, so there is no statement to work through."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="recon-picker">Statement</Label>
                <SelectNative
                  id="recon-picker"
                  value={selectedId ?? ""}
                  onChange={(e) => setSelectedId(Number(e.target.value))}
                  className="mt-1.5"
                >
                  {list.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.accountName} — {formatDate(r.statementDate)} ({r.statusName})
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div>
                <Label>Opening balance</Label>
                <div className="mt-1.5 px-3 py-2 rounded-md bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 tabular text-sm font-semibold text-navy-900 dark:text-white text-right">
                  {detail ? formatMoney(detail.openingBalance) : "—"}
                </div>
              </div>
              <div>
                <Label>Closing (per statement)</Label>
                <div className="mt-1.5 px-3 py-2 rounded-md bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 tabular text-sm font-semibold text-navy-900 dark:text-white text-right">
                  {detail ? formatMoney(detail.closingBalance) : "—"}
                </div>
              </div>
            </div>
          )}

          {detail && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-navy-900 rounded-lg">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Prepared by <span className="font-semibold text-navy-900 dark:text-white">{detail.preparedBy}</span>
                {locked && detail.finalizedOn && <> · finalised {formatDate(detail.finalizedOn)}</>}
                {/* No statement import exists: BankStatementLine rows are
                    seeded/entered, and there is no CSV or MT940 parser behind
                    the old upload button, so it is not shown. */}
                <> · statement lines come from the database</>
              </div>
              <Button variant="accent" size="md" className="gap-1.5"
                onClick={() => void autoMatch()}
                disabled={locked || busy || unmatchedStatement.length === 0}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles />}Auto-match
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {loadingDetail ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72" /><Skeleton className="h-72" />
        </div>
      ) : !detail ? null : (
        <>
          {locked && (
            <Card className="mb-6 bg-success/5 border-success/30">
              <CardBody className="flex items-center gap-3 py-3">
                <Lock className="size-4 text-success shrink-0" />
                <p className="text-xs text-slate-700 dark:text-slate-200">
                  This statement was finalised on {formatDate(detail.finalizedOn!)} and can no longer be changed.
                </p>
              </CardBody>
            </Card>
          )}

          {/* Status summary */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <Card className="p-3">
              <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Matched</div>
              <div className="text-xl tabular font-bold text-success mt-1">{matchedPairs.length}</div>
            </Card>
            <Card className="p-3">
              <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Unmatched (Bank)</div>
              <div className="text-xl tabular font-bold text-warning mt-1">{unmatchedStatement.length}</div>
            </Card>
            <Card className="p-3">
              <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Unmatched (Ledger)</div>
              <div className="text-xl tabular font-bold text-warning mt-1">{unmatchedLedger.length}</div>
            </Card>
            <Card className="p-3">
              <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Statement Movement</div>
              <div className="text-xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(statementMovement)}</div>
            </Card>
            <Card className={cn("p-3", Math.abs(diff) < 0.01 ? "bg-success/5 border-success/30" : "bg-danger/5 border-danger/30")}>
              <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Unexplained</div>
              <div className={cn("text-xl tabular font-bold mt-1", Math.abs(diff) < 0.01 ? "text-success" : "text-danger")}>
                {formatMoney(diff)}
              </div>
            </Card>
          </div>

          <Tabs defaultValue="match">
            <TabsList>
              <TabsTrigger value="match">Match Transactions ({unmatchedStatement.length})</TabsTrigger>
              <TabsTrigger value="matched">Confirmed Matches ({matchedPairs.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="match">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Bank statement side */}
                <Card>
                  <CardBody>
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200 dark:border-navy-700">
                      <h3 className="text-sm font-semibold text-navy-900 dark:text-white inline-flex items-center gap-2">
                        <Landmark className="size-4 text-info" /> Bank Statement
                      </h3>
                      <Badge variant="muted">{unmatchedStatement.length} unmatched</Badge>
                    </div>
                    {unmatchedStatement.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                        Every statement line is matched.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {unmatchedStatement.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            disabled={locked || busy}
                            onClick={() => setSelectedStatement(selectedStatement === l.id ? null : l.id)}
                            className={cn(
                              "w-full text-left p-2.5 rounded-lg border-2 transition-colors disabled:opacity-60",
                              selectedStatement === l.id
                                ? "border-brand-yellow bg-brand-yellow/5"
                                : "border-slate-200 dark:border-navy-700 hover:border-slate-300"
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm text-navy-900 dark:text-white truncate">{l.description}</div>
                                <div className="text-2xs text-slate-500 dark:text-slate-400">{formatDate(l.date)}</div>
                              </div>
                              <span className={cn("tabular text-sm font-bold shrink-0", l.amount < 0 ? "text-danger" : "text-success")}>
                                {formatMoney(l.amount)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Ledger side */}
                <Card>
                  <CardBody>
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200 dark:border-navy-700">
                      <h3 className="text-sm font-semibold text-navy-900 dark:text-white inline-flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-success" /> Posted Ledger
                      </h3>
                      <Badge variant="muted">{unmatchedLedger.length} unmatched</Badge>
                    </div>
                    {unmatchedLedger.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                        No unmatched ledger lines on this account in the window.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {unmatchedLedger.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            disabled={locked || busy}
                            onClick={() => setSelectedLedger(selectedLedger === l.id ? null : l.id)}
                            className={cn(
                              "w-full text-left p-2.5 rounded-lg border-2 transition-colors disabled:opacity-60",
                              selectedLedger === l.id
                                ? "border-brand-yellow bg-brand-yellow/5"
                                : "border-slate-200 dark:border-navy-700 hover:border-slate-300"
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm text-navy-900 dark:text-white truncate">
                                  {l.description ?? l.entryType}
                                </div>
                                <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                                  {l.entryNo} · {formatDate(l.date)}{l.party ? ` · ${l.party}` : ""}
                                </div>
                              </div>
                              <span className={cn("tabular text-sm font-bold shrink-0", l.amount < 0 ? "text-danger" : "text-success")}>
                                {formatMoney(l.amount)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>

              <Card className="mt-4">
                <CardBody className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pick one line on each side, then confirm. Amounts must agree to the paisa.
                  </p>
                  <Button
                    variant="accent" size="md" className="gap-1.5"
                    disabled={locked || busy || selectedStatement === null || selectedLedger === null}
                    onClick={() => void manualMatch()}
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                    Confirm match
                  </Button>
                </CardBody>
              </Card>
            </TabsContent>

            <TabsContent value="matched">
              <Card>
                <CardBody>
                  {matchedPairs.length === 0 ? (
                    <EmptyState icon={Link2} title="Nothing matched yet" description="Match a statement line to a ledger line to see it here." />
                  ) : (
                    <div className="space-y-2">
                      {matchedPairs.map((l) => {
                        const led = l.matchedLineId === null ? null : ledgerById.get(l.matchedLineId);
                        return (
                          <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                            <CheckCircle2 className="size-4 text-success shrink-0" />
                            <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="min-w-0">
                                <div className="text-sm text-navy-900 dark:text-white truncate">{l.description}</div>
                                <div className="text-2xs text-slate-500 dark:text-slate-400">{formatDate(l.date)} · statement</div>
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm text-navy-900 dark:text-white truncate">
                                  {led ? (led.description ?? led.entryType) : `Ledger line #${l.matchedLineId}`}
                                </div>
                                <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                                  {led ? `${led.entryNo} · ${formatDate(led.date)}` : "outside the shown window"} · ledger
                                </div>
                              </div>
                            </div>
                            <span className={cn("tabular text-sm font-bold shrink-0", l.amount < 0 ? "text-danger" : "text-success")}>
                              {formatMoney(l.amount)}
                            </span>
                            {!locked && (
                              <Button variant="ghost" size="icon" aria-label="Remove match"
                                disabled={busy} onClick={() => void unmatch(l.id)}>
                                <X className="size-4 text-danger" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardBody>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <ConfirmDialog
        open={confirmFinalize}
        onOpenChange={setConfirmFinalize}
        title="Finalise this reconciliation?"
        description={
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {detail?.accountName} to {detail ? formatDate(detail.statementDate) : ""} will be locked and can no
              longer be matched or unmatched.
            </p>
            {Math.abs(diff) >= 0.01 && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-danger/5 border border-danger/25">
                <AlertTriangle className="size-4 text-danger flex-shrink-0 mt-0.5" />
                <p className="text-xs text-danger-dark dark:text-danger-light">
                  {formatMoney(diff)} is unexplained. The server will refuse this until the statement lines
                  carry the opening balance to the closing balance.
                </p>
              </div>
            )}
          </div>
        }
        variant={Math.abs(diff) >= 0.01 ? "danger" : "info"}
        confirmLabel={busy ? "Finalising…" : "Finalise"}
        onConfirm={() => { void finalize(); }}
      />
    </>
  );
}
