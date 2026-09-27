"use client";

import * as React from "react";
import axios from "axios";
import {
  Loader2, Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, AlertCircle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { downloadXlsx, exportError } from "@/lib/export";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * The three dialogs that FEED a bank reconciliation -- start one, type one
 * statement line, import a statement -- all against
 * Controllers/BankReconciliationController.cs. The page loads this file only
 * when one of them is first opened (next/dynamic), so the matching screen
 * itself stays as light as it was.
 *
 * Sign convention everywhere: a statement line's amount is the BANK's view,
 * positive = money into the account. The forms ask "money in / money out"
 * rather than for a sign, because nobody reading a bank statement thinks in
 * signs.
 */

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const BASE = () => `${API_BASE_URL}/accounting/reconciliation`;

/* ══════════════════════════ start / edit ══════════════════════════ */

type BankAccount = {
  id: number; code: string; name: string;
  lastStatementDate: string | null; lastClosingBalance: number | null;
  lastFinalized: boolean; suggestedFrom: string | null;
};

export type ReconHeader = {
  id: number; accountId: number; periodFrom: string | null; statementDate: string;
  openingBalance: number; closingBalance: number;
};

export function ReconHeaderDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Present to correct an existing reconciliation; absent to start one. */
  editing?: ReconHeader | null;
  onSaved: (id: number) => void;
}) {
  const [accounts, setAccounts] = React.useState<BankAccount[] | null>(null);
  const [today, setToday] = React.useState("");
  const [accountId, setAccountId] = React.useState(0);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [opening, setOpening] = React.useState("");
  const [closing, setClosing] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /* Fresh every time it opens: the "where did the last statement end" hints
     change as soon as one is finalised. */
  React.useEffect(() => {
    if (!open) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       Resetting the form as the dialog opens; the per-page fetch pattern. */
    setError(null);
    axios.get<{ today: string; items: BankAccount[] }>(`${BASE()}/bank-accounts`, { headers: authHeader() })
      .then((res) => {
        setAccounts(res.data.items);
        setToday(res.data.today);
        if (editing) {
          setAccountId(editing.accountId);
          setFrom(editing.periodFrom ?? "");
          setTo(editing.statementDate);
          setOpening(String(editing.openingBalance));
          setClosing(String(editing.closingBalance));
        } else {
          /* Start on a bank rather than on cash in hand: a statement comes
             from a bank. The first account with "bank" in its name, else the
             first on the list. */
          const first = res.data.items.find((a) => /bank/i.test(a.name)) ?? res.data.items[0];
          pick(first, res.data.today);
        }
      })
      .catch((e) => setError(apiMessage(e, "Could not load the bank accounts.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  /** Choosing an account fills the period and the opening balance from where its last statement ended. */
  function pick(a: BankAccount | undefined, todayIso = today) {
    if (!a) return;
    setAccountId(a.id);
    if (editing) return;
    setFrom(a.suggestedFrom ?? "");
    setTo(todayIso);
    setOpening(a.lastClosingBalance !== null ? String(a.lastClosingBalance) : "");
    setClosing("");
  }

  const account = accounts?.find((a) => a.id === accountId) ?? null;
  const openNum = Number(opening);
  const closeNum = Number(closing);

  async function save() {
    setError(null);
    if (!accountId) return setError("Pick the bank account.");
    if (!from || !to) return setError("Enter the first and last day the statement covers.");
    if (opening.trim() === "" || Number.isNaN(openNum)) return setError("Enter the opening balance printed on the statement.");
    if (closing.trim() === "" || Number.isNaN(closeNum)) return setError("Enter the closing balance printed on the statement.");

    setSaving(true);
    try {
      const body = { accountId, periodFrom: from, statementDate: to, openingBalance: openNum, closingBalance: closeNum };
      const res = editing
        ? await axios.put<{ id: number; warning: string | null; message: string }>(`${BASE()}/${editing.id}`, body, { headers: authHeader() })
        : await axios.post<{ id: number; warning: string | null; message: string }>(BASE(), body, { headers: authHeader() });
      if (res.data.warning) toast.warning(res.data.message, { description: res.data.warning });
      else toast.success(res.data.message);
      onOpenChange(false);
      onSaved(res.data.id);
    } catch (e) {
      setError(apiMessage(e, "The reconciliation could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Correct the statement details" : "New bank reconciliation"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "The period and the two balances, as printed on the bank's statement."
              : "Pick the account, then copy the period and the two balances off the bank's statement. The statement lines come next."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <Label htmlFor="rc-account">Bank account</Label>
            <SelectNative id="rc-account" className="mt-1.5" value={accountId || ""}
              disabled={!accounts}
              onChange={(e) => pick(accounts?.find((a) => a.id === Number(e.target.value)))}>
              {!accounts && <option value="">Loading…</option>}
              {accounts?.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
            </SelectNative>
            {account && (
              <p className="mt-1.5 text-2xs text-slate-500 dark:text-slate-400">
                {account.lastStatementDate
                  ? <>Last statement ended {formatDate(account.lastStatementDate)} at {formatMoney(account.lastClosingBalance ?? 0)}{account.lastFinalized ? "" : " (not finalised yet)"}.</>
                  : "No statement has been reconciled on this account yet."}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rc-from">Statement from</Label>
              <Input id="rc-from" type="date" className="mt-1.5" value={from} max={to || today || undefined}
                onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="rc-to">Statement to</Label>
              <Input id="rc-to" type="date" className="mt-1.5" value={to} min={from || undefined} max={today || undefined}
                onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="rc-open">Opening balance</Label>
              <Input id="rc-open" type="number" step="0.01" inputMode="decimal" className="mt-1.5 text-right tabular"
                value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label htmlFor="rc-close">Closing balance</Label>
              <Input id="rc-close" type="number" step="0.01" inputMode="decimal" className="mt-1.5 text-right tabular"
                value={closing} onChange={(e) => setClosing(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {opening !== "" && closing !== "" && !Number.isNaN(openNum) && !Number.isNaN(closeNum) && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The statement lines will have to move <span className="tabular font-semibold text-navy-900 dark:text-white">{formatMoney(closeNum - openNum)}</span> for this to finalise.
            </p>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/5 border border-danger/25 text-xs text-danger">
              <AlertCircle className="size-4 shrink-0" /> {error}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="accent" className="gap-1.5" disabled={saving || !accounts} onClick={() => void save()}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {editing ? "Save" : "Start reconciliation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════ one line by hand ══════════════════════════ */

export function StatementLineDialog({
  open, onOpenChange, reconId, periodFrom, statementDate, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reconId: number;
  periodFrom: string | null;
  statementDate: string;
  onSaved: () => void;
}) {
  const [date, setDate] = React.useState(statementDate);
  const [description, setDescription] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [direction, setDirection] = React.useState<"in" | "out">("out");
  const [amount, setAmount] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save(another: boolean) {
    setError(null);
    const n = Math.abs(Number(amount));
    if (!date) return setError("Enter the date on the statement.");
    if (!description.trim()) return setError("Enter the description as the statement prints it.");
    if (!n) return setError("Enter the amount.");
    setSaving(true);
    try {
      await axios.post(`${BASE()}/${reconId}/lines`, {
        date, description: description.trim(), reference: reference.trim() || null,
        amount: direction === "in" ? n : -n,
      }, { headers: authHeader() });
      toast.success("Statement line added");
      onSaved();
      setDescription(""); setReference(""); setAmount("");
      if (!another) onOpenChange(false);
    } catch (e) {
      setError(apiMessage(e, "The line could not be added."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Add a statement line</DialogTitle>
          <DialogDescription>One line exactly as the bank printed it — a charge, a deposit the download missed.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="sl-date">Date</Label>
              <Input id="sl-date" type="date" className="mt-1.5" value={date}
                min={periodFrom ?? undefined} max={statementDate}
                onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="sl-ref">Reference <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input id="sl-ref" className="mt-1.5" value={reference} maxLength={60}
                onChange={(e) => setReference(e.target.value)} placeholder="Cheque / TXN no." />
            </div>
          </div>
          <div>
            <Label htmlFor="sl-desc">Description</Label>
            <Input id="sl-desc" className="mt-1.5" value={description} maxLength={200}
              onChange={(e) => setDescription(e.target.value)} placeholder="e.g. BANK CHARGES - SEP" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Label>Direction</Label>
              <div className="mt-1.5 grid grid-cols-2 rounded-lg border border-slate-200 dark:border-navy-700 p-0.5">
                {(["in", "out"] as const).map((d) => (
                  <button key={d} type="button" onClick={() => setDirection(d)}
                    className={cn("h-8 rounded-md text-sm font-medium transition-colors",
                      direction === d
                        ? d === "in" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                        : "text-slate-500 hover:text-navy-900 dark:hover:text-white")}>
                    {d === "in" ? "Money in" : "Money out"}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="sl-amount">Amount</Label>
              <Input id="sl-amount" type="number" step="0.01" min="0" inputMode="decimal" className="mt-1.5 text-right tabular"
                value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/5 border border-danger/25 text-xs text-danger">
              <AlertCircle className="size-4 shrink-0" /> {error}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="secondary" disabled={saving} onClick={() => void save(true)}>Add &amp; another</Button>
          <Button variant="accent" className="gap-1.5" disabled={saving} onClick={() => void save(false)}>
            {saving && <Loader2 className="size-4 animate-spin" />} Add line
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════ import a statement ══════════════════════════ */

type PreviewRow = {
  row: number; date: string | null; description: string; reference: string | null;
  amount: number; errors: string[]; warnings: string[];
};
type Preview = {
  columns: Record<string, string | number | null>;
  rows: PreviewRow[];
  summary: {
    total: number; valid: number; withErrors: number; withWarnings: number;
    moneyIn: number; moneyOut: number;
    existingMovement: number; expectedMovement: number; movementAfter: number; unexplainedAfter: number;
  };
};

export function StatementImportDialog({
  open, onOpenChange, reconId, onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reconId: number;
  onImported: () => void;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [reading, setReading] = React.useState(false);
  const [committing, setCommitting] = React.useState(false);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  /* Rows with only a WARNING (already on the statement, twice in the file)
     start unticked; the operator ticks them in if they are real. */
  const [chosen, setChosen] = React.useState<Set<number>>(new Set());

  function reset() {
    setFileName(null); setPreview(null); setError(null); setChosen(new Set());
  }

  async function template() {
    try {
      await downloadXlsx("accounting/reconciliation/import/template", {}, "bank-statement-template.xlsx");
    } catch (e) {
      toast.error("Could not download the template", { description: await exportError(e) });
    }
  }

  async function upload(file: File) {
    setFileName(file.name);
    setReading(true);
    setPreview(null);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await axios.post<Preview>(`${BASE()}/${reconId}/import/preview`, form, { headers: authHeader() });
      setPreview(res.data);
      setChosen(new Set(res.data.rows.filter((r) => r.errors.length === 0 && r.warnings.length === 0).map((r) => r.row)));
    } catch (e) {
      setError(apiMessage(e, "The file could not be read."));
    } finally {
      setReading(false);
      if (input.current) input.current.value = "";
    }
  }

  const picked = preview ? preview.rows.filter((r) => r.errors.length === 0 && chosen.has(r.row)) : [];
  const pickedNet = picked.reduce((s, r) => s + r.amount, 0);
  const after = preview ? preview.summary.existingMovement + pickedNet : 0;
  const unexplained = preview ? preview.summary.expectedMovement - after : 0;

  async function commit() {
    if (picked.length === 0) return;
    setCommitting(true);
    try {
      const res = await axios.post<{ message: string }>(`${BASE()}/${reconId}/import/commit`, {
        rows: picked.map((r) => ({ row: r.row, date: r.date, description: r.description, reference: r.reference, amount: r.amount })),
      }, { headers: authHeader() });
      toast.success("Statement imported", { description: res.data.message });
      reset();
      onOpenChange(false);
      onImported();
    } catch (e) {
      toast.error("Nothing was imported", { description: apiMessage(e, "Please try again.") });
    } finally {
      setCommitting(false);
    }
  }

  function toggle(row: number) {
    setChosen((s) => {
      const n = new Set(s);
      if (n.has(row)) n.delete(row); else n.add(row);
      return n;
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Import a bank statement</DialogTitle>
          <DialogDescription>
            The bank&rsquo;s download as .xlsx or .csv. Columns are found by name — Date, Description (or
            Particulars / Narration), an optional Reference, and either Deposit and Withdrawal or one signed Amount.
            Nothing is saved until you press Import.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input ref={input} type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
            <Button variant="accent" className="gap-1.5 flex-1" disabled={reading} onClick={() => input.current?.click()}>
              {reading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {preview ? "Choose another file" : "Choose the statement file"}
            </Button>
            <Button variant="secondary" className="gap-1.5" onClick={() => void template()}>
              <Download className="size-4" /> Template
            </Button>
          </div>
          {fileName && <p className="text-2xs text-slate-500 dark:text-slate-400 truncate">{fileName}</p>}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/5 border border-danger/25 text-xs text-danger">
              <AlertCircle className="size-4 shrink-0" /> {error}
            </div>
          )}

          {preview && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label="Rows read" value={String(preview.summary.total)} />
                <Stat label="With errors" value={String(preview.summary.withErrors)} tone={preview.summary.withErrors ? "danger" : "muted"} />
                <Stat label="Money in" value={formatMoney(preview.summary.moneyIn)} tone="success" />
                <Stat label="Money out" value={formatMoney(preview.summary.moneyOut)} tone="danger" />
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-navy-700 divide-y divide-slate-100 dark:divide-navy-700 max-h-72 overflow-y-auto scrollbar-thin">
                {preview.rows.map((r) => {
                  const bad = r.errors.length > 0;
                  return (
                    <label key={r.row} className={cn("flex items-start gap-3 px-3 py-2 text-sm",
                      bad ? "bg-danger/5" : r.warnings.length ? "bg-warning/5" : "", !bad && "cursor-pointer")}>
                      <Checkbox checked={!bad && chosen.has(r.row)} disabled={bad}
                        onCheckedChange={() => toggle(r.row)} className="mt-0.5" aria-label={`Row ${r.row}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-navy-900 dark:text-white">{r.description || "—"}</div>
                        <div className="text-2xs text-slate-500 dark:text-slate-400">
                          Row {r.row} · {r.date ? formatDate(r.date) : "no date"}{r.reference ? ` · ${r.reference}` : ""}
                        </div>
                        {r.errors.map((e) => (
                          <div key={e} className="text-2xs text-danger flex items-center gap-1"><AlertCircle className="size-3" />{e}</div>
                        ))}
                        {r.warnings.map((w) => (
                          <div key={w} className="text-2xs text-warning flex items-center gap-1"><AlertTriangle className="size-3" />{w}</div>
                        ))}
                      </div>
                      <span className={cn("tabular text-sm font-semibold shrink-0", r.amount < 0 ? "text-danger" : "text-success")}>
                        {formatMoney(r.amount)}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className={cn("flex items-start gap-2 p-3 rounded-lg text-xs",
                Math.abs(unexplained) < 0.01 ? "bg-success/5 border border-success/25 text-success" : "bg-warning/5 border border-warning/25 text-warning-dark dark:text-warning-light")}>
                {Math.abs(unexplained) < 0.01 ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertTriangle className="size-4 shrink-0" />}
                <span>
                  With these {picked.length} {picked.length === 1 ? "line" : "lines"} the statement moves {formatMoney(after)}; its
                  balances say {formatMoney(preview.summary.expectedMovement)}.{" "}
                  {Math.abs(unexplained) < 0.01
                    ? "It adds up."
                    : `${formatMoney(unexplained)} would still be unexplained — finalising will refuse until it is.`}
                </span>
              </div>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button variant="primary" className="gap-1.5" disabled={!preview || picked.length === 0 || committing}
            onClick={() => void commit()}>
            {committing ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
            {preview ? `Import ${picked.length} ${picked.length === 1 ? "line" : "lines"}` : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone = "muted" }: { label: string; value: string; tone?: "muted" | "success" | "danger" }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-navy-700 p-2">
      <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cn("tabular text-sm font-bold mt-0.5 truncate",
        tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-navy-900 dark:text-white")}>{value}</div>
    </div>
  );
}
