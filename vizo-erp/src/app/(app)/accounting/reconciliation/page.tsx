"use client";

import * as React from "react";
import {
  Landmark, Upload, Download, CheckCircle2, AlertTriangle, Search, Calendar, Sparkles, Link2, X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Side = "bank" | "system";
type Match = { bankId: number; systemId: number };

const BANK_LINES = [
  { id: 1, date: "2026-04-30", description: "INWARD TT — HAFEEZ CTR",         amount: 100000,  type: "credit" as const },
  { id: 2, date: "2026-04-29", description: "OUTWARD TT — PAK ACCESSORIES",   amount: -320000, type: "debit"  as const },
  { id: 3, date: "2026-04-29", description: "INWARD — STAR COMM",             amount: 240000,  type: "credit" as const },
  { id: 4, date: "2026-04-28", description: "BANK CHARGES — APR",             amount: -1850,   type: "debit"  as const },
  { id: 5, date: "2026-04-27", description: "INWARD TT — MOBILINK CONNECT",   amount: 180000,  type: "credit" as const },
  { id: 6, date: "2026-04-26", description: "ATM WITHDRAWAL",                 amount: -25000,  type: "debit"  as const },
];

const SYSTEM_LINES = [
  { id: 1, date: "2026-04-30", entry: "VCH-KHI-26-0089", description: "Bank receipt — Hafeez Center #28",  amount: 100000,  type: "receipt" as const },
  { id: 2, date: "2026-04-29", entry: "VCH-KHI-26-0088", description: "Bank payment — Pak Accessories",     amount: -320000, type: "payment" as const },
  { id: 3, date: "2026-04-29", entry: "VCH-KHI-26-0090", description: "Bank receipt — Star Communications", amount: 240000,  type: "receipt" as const },
  { id: 4, date: "2026-04-27", entry: "VCH-KHI-26-0091", description: "Bank receipt — Mobilink Connect",    amount: 180000,  type: "receipt" as const },
  { id: 5, date: "2026-04-26", entry: "VCH-KHI-26-0086", description: "Cash withdrawal for petty cash",     amount: -25000,  type: "payment" as const },
];

export default function ReconciliationPage() {
  const [bankAccount, setBankAccount] = React.useState("HBL");
  const [statementDate, setStatementDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [openingBalance, setOpeningBalance] = React.useState(1700000);
  const [closingBalance, setClosingBalance] = React.useState(1840000);
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [selectedBank, setSelectedBank] = React.useState<number | null>(null);
  const [selectedSystem, setSelectedSystem] = React.useState<number | null>(null);
  const [confirmFinalize, setConfirmFinalize] = React.useState(false);

  const isMatched = (side: Side, id: number) => matches.some((m) => side === "bank" ? m.bankId === id : m.systemId === id);

  const matchedBankIds = new Set(matches.map((m) => m.bankId));
  const matchedSystemIds = new Set(matches.map((m) => m.systemId));
  const unmatchedBank = BANK_LINES.filter((b) => !matchedBankIds.has(b.id));
  const unmatchedSystem = SYSTEM_LINES.filter((s) => !matchedSystemIds.has(s.id));

  function autoMatch() {
    const newMatches: Match[] = [];
    for (const bl of unmatchedBank) {
      const candidate = unmatchedSystem.find((sl) => Math.abs(sl.amount - bl.amount) < 1 && Math.abs(new Date(sl.date).getTime() - new Date(bl.date).getTime()) < 3 * 86400000);
      if (candidate) newMatches.push({ bankId: bl.id, systemId: candidate.id });
    }
    setMatches((cur) => [...cur, ...newMatches]);
    toast.success(`${newMatches.length} transactions auto-matched`, { description: newMatches.length > 0 ? "Review and confirm matches below." : "No additional matches found." });
  }

  function manualMatch() {
    if (!selectedBank || !selectedSystem) return;
    const bank = BANK_LINES.find((b) => b.id === selectedBank);
    const sys  = SYSTEM_LINES.find((s) => s.id === selectedSystem);
    if (!bank || !sys) return;
    if (Math.abs(bank.amount - sys.amount) > 0.01) {
      toast.error("Amounts don't match", { description: `Bank: ${formatMoney(bank.amount)} · System: ${formatMoney(sys.amount)}` });
      return;
    }
    setMatches((cur) => [...cur, { bankId: bank.id, systemId: sys.id }]);
    setSelectedBank(null);
    setSelectedSystem(null);
    toast.success("Match confirmed");
  }

  function unmatch(bankId: number) {
    setMatches((cur) => cur.filter((m) => m.bankId !== bankId));
    toast.info("Match removed");
  }

  const matchedTotal = matches.reduce((s, m) => {
    const b = BANK_LINES.find((x) => x.id === m.bankId);
    return s + (b?.amount ?? 0);
  }, 0);
  const unreconciledBank = unmatchedBank.reduce((s, b) => s + b.amount, 0);
  const unreconciledSystem = unmatchedSystem.reduce((s, sl) => s + sl.amount, 0);
  const computedClosing = openingBalance + matchedTotal + unreconciledSystem;
  const diff = closingBalance - computedClosing;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Bank Reconciliation" }]}
        title={<><Landmark className="size-6 inline-block mr-2 text-brand-yellow" />Bank Reconciliation</>}
        subtitle="Match bank statement transactions with system records"
        actions={
          <>
            <Button variant="secondary" className="gap-1.5"><Download /><span className="hidden sm:inline">Sample CSV</span></Button>
            <Button variant="accent" className="gap-1.5" onClick={() => setConfirmFinalize(true)} disabled={matches.length === 0}>
              <CheckCircle2 />Finalize Reconciliation
            </Button>
          </>
        }
      />

      {/* Setup card */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="bank-acct">Bank Account</Label>
              <SelectNative id="bank-acct" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="mt-1.5">
                <option value="HBL">HBL Bank — 1234567890</option>
                <option value="MEEZAN">Meezan Bank — 9876543210</option>
                <option value="UBL">UBL — 5555444433</option>
              </SelectNative>
            </div>
            <div>
              <Label htmlFor="stmt-date">Statement Date</Label>
              <Input id="stmt-date" type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="opening">Opening Balance</Label>
              <Input id="opening" type="number" value={openingBalance} onChange={(e) => setOpeningBalance(+e.target.value)} className="mt-1.5 tabular text-right" />
            </div>
            <div>
              <Label htmlFor="closing">Closing (per statement)</Label>
              <Input id="closing" type="number" value={closingBalance} onChange={(e) => setClosingBalance(+e.target.value)} className="mt-1.5 tabular text-right" />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-navy-900 rounded-lg">
            <div>
              <Button variant="secondary" size="md" className="gap-1.5">
                <Upload />Upload Statement (CSV/MT940)
              </Button>
              <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1">Or use the demo data shown below</p>
            </div>
            <Button variant="accent" size="md" className="gap-1.5" onClick={autoMatch}>
              <Sparkles />Auto-match
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Status summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Card className="p-3">
          <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Matched</div>
          <div className="text-xl tabular font-bold text-success mt-1">{matches.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Unmatched (Bank)</div>
          <div className="text-xl tabular font-bold text-warning mt-1">{unmatchedBank.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Unmatched (System)</div>
          <div className="text-xl tabular font-bold text-warning mt-1">{unmatchedSystem.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Computed Closing</div>
          <div className="text-xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(computedClosing)}</div>
        </Card>
        <Card className={cn("p-3", Math.abs(diff) < 1 ? "bg-success/5 border-success/30" : "bg-danger/5 border-danger/30")}>
          <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Difference</div>
          <div className={cn("text-xl tabular font-bold mt-1", Math.abs(diff) < 1 ? "text-success" : "text-danger")}>{formatMoney(diff)}</div>
        </Card>
      </div>

      <Tabs defaultValue="match">
        <TabsList>
          <TabsTrigger value="match">Match Transactions ({unmatchedBank.length + unmatchedSystem.length})</TabsTrigger>
          <TabsTrigger value="matched">Confirmed Matches ({matches.length})</TabsTrigger>
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
                  <Badge variant="muted">{unmatchedBank.length} unmatched</Badge>
                </div>
                <div className="space-y-1.5">
                  {unmatchedBank.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBank(selectedBank === b.id ? null : b.id)}
                      className={cn(
                        "w-full p-3 border rounded-lg text-left transition-colors",
                        selectedBank === b.id
                          ? "border-brand-yellow bg-brand-yellow/5"
                          : "border-slate-200 dark:border-navy-700 hover:border-slate-300 dark:hover:border-navy-600"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-navy-900 dark:text-white">{b.description}</div>
                          <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 inline-flex items-center gap-1.5">
                            <Calendar className="size-3" /> {formatDate(b.date)}
                          </div>
                        </div>
                        <span className={cn("tabular text-sm font-bold", b.amount > 0 ? "text-success" : "text-danger")}>
                          {b.amount > 0 ? "+" : ""}{formatMoney(b.amount)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* System side */}
            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200 dark:border-navy-700">
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white inline-flex items-center gap-2">
                    <Search className="size-4 text-brand-yellow" /> System Vouchers
                  </h3>
                  <Badge variant="muted">{unmatchedSystem.length} unmatched</Badge>
                </div>
                <div className="space-y-1.5">
                  {unmatchedSystem.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSystem(selectedSystem === s.id ? null : s.id)}
                      className={cn(
                        "w-full p-3 border rounded-lg text-left transition-colors",
                        selectedSystem === s.id
                          ? "border-brand-yellow bg-brand-yellow/5"
                          : "border-slate-200 dark:border-navy-700 hover:border-slate-300 dark:hover:border-navy-600"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-navy-900 dark:text-white">{s.description}</div>
                          <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="tabular">{s.entry}</span> · {formatDate(s.date)}
                          </div>
                        </div>
                        <span className={cn("tabular text-sm font-bold", s.amount > 0 ? "text-success" : "text-danger")}>
                          {s.amount > 0 ? "+" : ""}{formatMoney(s.amount)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Manual match action bar */}
          {(selectedBank || selectedSystem) && (
            <Card className="mt-4 sticky bottom-4 bg-navy-900 dark:bg-navy-800 border-brand-yellow/30">
              <CardBody className="py-3">
                <div className="flex items-center justify-between text-white">
                  <div className="text-sm">
                    {selectedBank && selectedSystem ? "Pair selected — match if amounts equal" : "Pick one from each side to match"}
                  </div>
                  <Button variant="accent" disabled={!selectedBank || !selectedSystem} onClick={manualMatch}>
                    <Link2 /> Confirm match
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="matched">
          <Card>
            <CardBody>
              {matches.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">No matches yet — use Auto-match or pair manually.</div>
              ) : (
                <div className="space-y-2">
                  {matches.map((m) => {
                    const bank = BANK_LINES.find((b) => b.id === m.bankId);
                    const sys  = SYSTEM_LINES.find((s) => s.id === m.systemId);
                    return (
                      <div key={`${m.bankId}-${m.systemId}`} className="grid grid-cols-12 gap-3 items-center p-3 border border-success/30 bg-success/5 rounded-lg">
                        <div className="col-span-5">
                          <div className="text-2xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Bank</div>
                          <div className="text-sm font-medium text-navy-900 dark:text-white">{bank?.description}</div>
                          <div className="text-2xs text-slate-500 dark:text-slate-400">{bank ? formatDate(bank.date) : ""}</div>
                        </div>
                        <div className="col-span-1 text-center">
                          <Link2 className="size-4 text-success mx-auto" />
                        </div>
                        <div className="col-span-5">
                          <div className="text-2xs text-slate-500 dark:text-slate-400 uppercase font-semibold">System</div>
                          <div className="text-sm font-medium text-navy-900 dark:text-white">{sys?.description}</div>
                          <div className="text-2xs text-slate-500 dark:text-slate-400 tabular">{sys?.entry} · {sys ? formatDate(sys.date) : ""}</div>
                        </div>
                        <div className="col-span-1 text-right">
                          <span className="tabular text-sm font-bold text-success">{bank ? formatMoney(bank.amount) : ""}</span>
                          <Button variant="ghost" size="icon-sm" onClick={() => unmatch(m.bankId)} className="mt-1 text-danger" aria-label="Remove match"><X /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmFinalize}
        onOpenChange={setConfirmFinalize}
        title="Finalize this reconciliation?"
        description={`${matches.length} matches will be marked as reconciled. Vouchers status will become RECONCILED. Difference: ${formatMoney(diff)}`}
        variant={Math.abs(diff) < 1 ? "info" : "warning"}
        confirmLabel="Yes, finalize"
        onConfirm={() => { toast.success("Reconciliation finalized", { description: `${bankAccount} statement reconciled for ${formatDate(statementDate)}` }); setConfirmFinalize(false); setMatches([]); }}
      />
    </>
  );
}
