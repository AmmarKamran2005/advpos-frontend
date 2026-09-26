"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { AlertCircle, ArrowLeft, Check, KeyRound, Loader2, Pencil, Phone, Plus, Undo2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { StatementPdfActions } from "@/components/ledgers/statement-pdf-actions";
import { StaffDialog, type StaffLookups } from "@/components/ledgers/staff-dialog";
import { apiMessage, defaultFrom, pkToday, ledgerAmount, monthStart, yearStart } from "@/components/ledgers/ledger-kit";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   ONE STAFF LEDGER -- a person's account on 2140 Staff Payables.

   Credit is what they have earned (salary due, a bonus); debit is what has
   gone to them (salary paid, an advance) or been kept back (a deduction). The
   running balance is in the payroll's own sense: positive is still owed to
   them, negative is an advance to recover.

   The "+" row: date, type, description, the amount on its side, and the
   account on the other side -- the cash or bank a payment came out of, Salary
   Expense for salary. Every row posts to the main books at once, and can be
   undone (reversed by a mirror, never deleted).
   ─────────────────────────────────────────────────────────────────────────── */

type Row = {
  key: string; date: string | null; kind: string; particulars: string; account: string | null;
  debit: number; credit: number; balance: number; entryId: number | null; entryNo: string | null;
  reversed: boolean; canReverse: boolean;
};
type StaffInfo = {
  id: number; code: string; name: string; phone: string | null; cnic: string | null; categoryId: number;
  category: string; monthlySalary: number; openingBalance: number; joinedOn: string; isActive: boolean;
  notes: string | null; userId: number | null; login: string | null; role: string | null;
};
type Statement = {
  staff: StaffInfo; from: string; to: string; balanceBroughtForward: number; rows: Row[];
  entryCount: number; totalDebit: number; totalCredit: number; closingBalance: number;
};
type RowType = { key: string; label: string; side: "debit" | "credit" | "either"; defaultAccountCode: string };
type AccountOpt = { id: number; code: string; name: string; type: string; group: string };
type Lookups = StaffLookups & { rowTypes: RowType[]; accounts: AccountOpt[] };

export default function StaffStatementPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const today = pkToday();
  const [from, setFrom] = React.useState(defaultFrom(today, 2));
  const [to, setTo] = React.useState(today);
  const [s, setS] = React.useState<Statement | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<Statement>(`${API_BASE_URL}/ledgers/staff/${id}/statement`, {
        params: { from, to }, headers: authHeader(),
      });
      setS(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load this staff ledger."));
    } finally {
      setLoading(false);
    }
  }, [id, from, to]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const loadLookups = React.useCallback(() => {
    axios.get<Lookups>(`${API_BASE_URL}/ledgers/staff/lookups`, { headers: authHeader() })
      .then((r) => setLookups(r.data)).catch(() => undefined);
  }, []);
  React.useEffect(() => { loadLookups(); }, [loadLookups]);

  async function reverse(row: Row) {
    if (!row.entryId) return;
    const reason = window.prompt(`Undo ${row.entryNo}? It will be reversed by a new entry dated today.\n\nReason (optional):`, "");
    if (reason === null) return;
    try {
      const res = await axios.post<{ message: string }>(`${API_BASE_URL}/ledgers/staff/${id}/entries/${row.entryId}/reverse`,
        { reason: reason || null }, { headers: authHeader() });
      toast.success("Reversed", { description: res.data.message });
      void load();
    } catch (e) {
      toast.error("Not reversed", { description: apiMessage(e, "Please try again.") });
    }
  }

  if (error && !s) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="size-8 text-danger mx-auto mb-2" />
        <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
        <Button variant="ghost" className="mt-2" asChild><Link href="/ledgers/staff"><ArrowLeft />Back</Link></Button>
      </Card>
    );
  }

  const st = s?.staff;
  const presets = [
    { label: "This month", from: monthStart(today) },
    { label: "Last 3 months", from: defaultFrom(today, 2) },
    { label: "This year", from: yearStart(today) },
    { label: "All time", from: "2020-01-01" },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Money" }, { label: "Staff Ledgers", href: "/ledgers/staff" }, { label: st?.code ?? "…" }]}
        title={st ? (
          <span className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm font-bold tabular px-2 py-0.5 rounded-md bg-navy-900 text-brand-yellow dark:bg-brand-yellow dark:text-navy-900">{st.code}</span>
            <span>{st.name}</span>
          </span>
        ) : <Skeleton className="h-8 w-56" />}
        subtitle={st ? (
          <span className="flex items-center gap-x-2 gap-y-0.5 flex-wrap">
            <span>{st.category}</span>
            {st.phone && <><span>·</span><span className="inline-flex items-center gap-1"><Phone className="size-3" />{st.phone}</span></>}
            <span>·</span>
            {st.role ? <span className="inline-flex items-center gap-1"><KeyRound className="size-3" />signs in as {st.role}</span> : <span>no login</span>}
            {!st.isActive && <span className="text-danger font-medium">· left</span>}
          </span>
        ) : undefined}
        actions={s && st ? (
          <div className="flex items-center gap-2 flex-wrap">
            <StatementPdfActions path={`ledgers/staff/${id}/statement/pdf`} from={s.from} to={s.to}
              fileName={`STAFF-${st.code}-${s.from}-${s.to}.pdf`} />
            <Button variant="ghost" size="md" className="gap-1.5" onClick={() => setEditOpen(true)} disabled={!lookups}>
              <Pencil /><span className="hidden sm:inline">Edit</span>
            </Button>
          </div>
        ) : undefined}
      />

      <Card className="p-3 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="grid grid-cols-2 gap-2 lg:w-80">
            <div>
              <Label className="text-2xs uppercase tracking-wider text-slate-500">From</Label>
              <Input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-2xs uppercase tracking-wider text-slate-500">To</Label>
              <Input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
            {presets.map((p) => (
              <button key={p.label} type="button" onClick={() => { setFrom(p.from); setTo(today); }}
                className={cn("shrink-0 px-3 h-9 rounded-lg text-xs font-medium border transition-colors",
                  from === p.from && to === today
                    ? "bg-navy-900 text-white border-navy-900 dark:bg-brand-yellow dark:text-navy-900 dark:border-brand-yellow"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-navy-700 dark:text-slate-300")}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {s ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Stat label={`Balance B/F · ${formatDate(s.from)}`} value={formatMoney(s.balanceBroughtForward)} />
          <Stat label="Earned (credit)" value={formatMoney(s.totalCredit - Math.max(0, s.balanceBroughtForward))} />
          <Stat label="Paid / advanced (debit)" value={formatMoney(s.totalDebit - Math.max(0, -s.balanceBroughtForward))} />
          <Card className="p-4 bg-navy-900 dark:bg-navy-800 border-navy-900">
            <div className="text-2xs uppercase font-semibold tracking-wider text-brand-yellow">
              {s.closingBalance >= 0 ? "Payable to them" : "Advance to recover"}
            </div>
            <div className="text-xl sm:text-2xl tabular font-bold mt-1 text-white">{formatMoney(Math.abs(s.closingBalance))}</div>
            <div className="text-2xs mt-1 text-slate-300 tabular">
              {st && st.monthlySalary > 0 ? `Monthly salary ${formatMoney(st.monthlySalary)}` : "No monthly salary set"}
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      )}

      <Card className="p-0 overflow-hidden">
        {!s ? (
          <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : (
          <div className={cn(loading && "opacity-60 transition-opacity")}>
            <div className="hidden md:grid grid-cols-[6.5rem_1fr_7.5rem_7.5rem_8.5rem] gap-x-3 px-4 py-2.5 bg-navy-900 text-white text-2xs uppercase tracking-wider font-semibold">
              <div>Date</div><div>Particulars</div>
              <div className="text-right">Debit</div><div className="text-right">Credit</div><div className="text-right">Balance</div>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-navy-700/60">
              {s.rows.map((r) => (
                <li key={r.key} className={cn("px-4 py-2.5", r.kind === "opening" && "bg-slate-50 dark:bg-navy-700/30", r.reversed && "opacity-60")}>
                  <div className="md:grid md:grid-cols-[6.5rem_1fr_7.5rem_7.5rem_8.5rem] md:gap-x-3 md:items-start">
                    <div className="flex items-center justify-between md:block">
                      <span className="text-xs tabular text-slate-500 dark:text-slate-400">{r.date ? formatDate(r.date) : ""}</span>
                      <span className={cn("md:hidden tabular text-sm font-bold", r.balance < 0 ? "text-warning-dark" : "text-navy-900 dark:text-white")}>
                        {ledgerAmount(r.balance, "0")}
                      </span>
                    </div>
                    <div className="min-w-0 mt-0.5 md:mt-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-sm text-navy-900 dark:text-white", r.kind === "opening" ? "font-bold" : "font-medium")}>{r.particulars}</span>
                        {r.kind === "reversal" && <span className="text-[10px] uppercase font-bold text-danger">reversal</span>}
                        {r.reversed && <span className="text-[10px] uppercase font-bold text-danger">reversed</span>}
                        {r.canReverse && (
                          <button type="button" onClick={() => void reverse(r)}
                            className="inline-flex items-center gap-1 text-2xs text-slate-400 hover:text-danger transition-colors">
                            <Undo2 className="size-3" /> Undo
                          </button>
                        )}
                      </div>
                      {r.entryNo && (
                        <div className="text-2xs text-slate-400 tabular mt-0.5">{r.entryNo}{r.account ? ` · ${r.account}` : ""}</div>
                      )}
                    </div>
                    <div className="md:hidden flex gap-4 mt-1.5 text-xs tabular">
                      {r.debit > 0 && <span className="text-slate-500">Dr <span className="font-semibold text-navy-900 dark:text-white">{ledgerAmount(r.debit)}</span></span>}
                      {r.credit > 0 && <span className="text-slate-500">Cr <span className="font-semibold text-success">{ledgerAmount(r.credit)}</span></span>}
                    </div>
                    <div className="hidden md:block text-right tabular text-sm text-navy-900 dark:text-white">{ledgerAmount(r.debit)}</div>
                    <div className="hidden md:block text-right tabular text-sm text-success">{ledgerAmount(r.credit)}</div>
                    <div className={cn("hidden md:block text-right tabular text-sm font-bold", r.balance < 0 ? "text-warning-dark dark:text-warning-light" : "text-navy-900 dark:text-white")}>
                      {ledgerAmount(r.balance, "0")}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {adding && lookups ? (
              <AddStaffRow staffId={id} lookups={lookups} today={today}
                onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); void load(); }} />
            ) : (
              <button type="button" onClick={() => setAdding(true)} disabled={!lookups}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-navy-900 dark:text-brand-yellow border-t border-dashed border-slate-200 dark:border-navy-700 hover:bg-brand-yellow/5 transition-colors">
                <span className="size-6 rounded-full bg-brand-yellow text-navy-900 inline-flex items-center justify-center"><Plus className="size-4" /></span>
                Add a row
              </button>
            )}

            <div className="bg-navy-900 text-white px-4 py-3 md:grid md:grid-cols-[6.5rem_1fr_7.5rem_7.5rem_8.5rem] md:gap-x-3 md:items-center">
              <div className="text-2xs uppercase tracking-wider font-bold text-brand-yellow">Totals</div>
              <div className="text-xs text-slate-300 mt-0.5 md:mt-0">{s.entryCount} {s.entryCount === 1 ? "entry" : "entries"}</div>
              <div className="grid grid-cols-3 gap-2 mt-2 md:contents">
                <Tot label="Debit" v={s.totalDebit} />
                <Tot label="Credit" v={s.totalCredit} />
                <Tot label="Balance" v={s.closingBalance} strong />
              </div>
            </div>
          </div>
        )}
      </Card>

      {lookups && st && (
        <StaffDialog open={editOpen} onOpenChange={setEditOpen} lookups={lookups} editId={id}
          initial={{
            fullName: st.name, categoryId: String(st.categoryId), phone: st.phone ?? "", cnic: st.cnic ?? "",
            monthlySalary: String(st.monthlySalary || ""), openingBalance: String(st.openingBalance || ""),
            joinedOn: st.joinedOn, notes: st.notes ?? "", userId: "", isActive: st.isActive,
          }}
          onSaved={() => { setEditOpen(false); void load(); loadLookups(); }} />
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 truncate">{label}</div>
      <div className="text-lg sm:text-xl tabular font-bold mt-1 text-navy-900 dark:text-white">{value}</div>
    </Card>
  );
}

function Tot({ label, v, strong }: { label: string; v: number; strong?: boolean }) {
  return (
    <div className="text-right">
      <div className="md:hidden text-2xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className={cn("tabular", strong ? "text-brand-yellow font-bold text-base" : "font-semibold text-sm")}>{ledgerAmount(v, "0")}</div>
    </div>
  );
}

/* ─────────────────────────── the "+" row ─────────────────────────── */

function AddStaffRow({
  staffId, lookups, today, onCancel, onSaved,
}: {
  staffId: number; lookups: Lookups; today: string; onCancel: () => void; onSaved: () => void;
}) {
  const [date, setDate] = React.useState(today);
  const [typeKey, setTypeKey] = React.useState("payment");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [eitherSide, setEitherSide] = React.useState<"debit" | "credit">("debit");
  const [accountId, setAccountId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const type = lookups.rowTypes.find((t) => t.key === typeKey) ?? lookups.rowTypes[0];
  const side = type.side === "either" ? eitherSide : type.side;

  /* Money going OUT to them comes from a cash or bank account; salary and a
     deduction sit against Salary Expense. An adjustment may use anything. */
  const options = lookups.accounts.filter((a) =>
    typeKey === "payment" || typeKey === "advance" ? a.type === "Cash & Bank"
      : typeKey === "adjustment" ? true
      : a.group === "Expenses" || a.group === "Revenue");
  const fallback = options.find((a) => a.code === type.defaultAccountCode) ?? options[0];
  const effectiveAccount = accountId && options.some((o) => String(o.id) === accountId) ? accountId : String(fallback?.id ?? "");

  async function save() {
    const value = Number(amount);
    if (!(value > 0)) { toast.error("Enter an amount above zero."); return; }
    setSaving(true);
    try {
      const res = await axios.post<{ message: string }>(`${API_BASE_URL}/ledgers/staff/${staffId}/entries`, {
        date, type: typeKey, description: description.trim() || null,
        debit: side === "debit" ? value : null, credit: side === "credit" ? value : null,
        accountId: effectiveAccount ? Number(effectiveAccount) : null,
      }, { headers: authHeader() });
      toast.success("Row posted", { description: res.data.message });
      onSaved();
    } catch (e) {
      toast.error("Not posted", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t-2 border-brand-yellow bg-brand-yellow/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-navy-900 dark:text-white">New row</div>
        <span className="text-2xs text-slate-500 dark:text-slate-400">Posted to the books at once.</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-12 gap-2.5">
        <div className="col-span-1 md:col-span-2">
          <Label className="text-2xs">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </div>
        <div className="col-span-1 md:col-span-3">
          <Label className="text-2xs">Type</Label>
          <SelectNative value={typeKey} onChange={(e) => { setTypeKey(e.target.value); setAccountId(""); }} className="mt-1">
            {lookups.rowTypes.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </SelectNative>
        </div>
        <div className="col-span-2 md:col-span-7">
          <Label className="text-2xs">Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={250}
            placeholder={typeKey === "salary" ? "e.g. September salary" : typeKey === "advance" ? "e.g. Advance for Eid" : ""} className="mt-1" />
        </div>
        <div className="col-span-1 md:col-span-3">
          <Label className="text-2xs">{side === "debit" ? "Debit" : "Credit"}</Label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="mt-1 tabular font-semibold" />
        </div>
        <div className="col-span-1 md:col-span-2">
          <Label className="text-2xs">Side</Label>
          {type.side === "either" ? (
            <div className="grid grid-cols-2 mt-1 rounded-lg border border-slate-200 dark:border-navy-700 overflow-hidden h-9">
              {(["debit", "credit"] as const).map((k) => (
                <button key={k} type="button" onClick={() => setEitherSide(k)}
                  className={cn("text-xs font-semibold capitalize",
                    eitherSide === k ? (k === "debit" ? "bg-navy-900 text-white" : "bg-success text-white") : "text-slate-500 bg-white dark:bg-navy-800")}>
                  {k}
                </button>
              ))}
            </div>
          ) : (
            <div className={cn("mt-1 h-9 rounded-lg flex items-center justify-center text-xs font-semibold capitalize",
              side === "debit" ? "bg-navy-900 text-white" : "bg-success text-white")}>{side}</div>
          )}
        </div>
        <div className="col-span-2 md:col-span-7">
          <Label className="text-2xs">{typeKey === "payment" || typeKey === "advance" ? "Paid from" : "Other side of the entry"}</Label>
          <SelectNative value={effectiveAccount} onChange={(e) => setAccountId(e.target.value)} className="mt-1">
            {options.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
          </SelectNative>
        </div>
        <div className="col-span-2 md:col-span-12 flex items-end justify-end gap-2">
          <Button variant="ghost" className="gap-1" onClick={onCancel}><X />Cancel</Button>
          <Button variant="accent" className="gap-1.5" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />} Post row
          </Button>
        </div>
      </div>
    </div>
  );
}
