"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  AlertCircle, AlertTriangle, ArrowLeft, Check, Loader2, Pencil, Phone, Plus, Undo2, X,
} from "lucide-react";
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
import { apiMessage, defaultFrom, pkToday, ledgerAmount, monthStart, qtyText, yearStart } from "@/components/ledgers/ledger-kit";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   STATEMENT OF ACCOUNT -- one customer, a From-To range.

   Laid out the way the owner's old statements read (the four samples he sent
   are the brief): the account's code and name, Balance B/F at the start date,
   each sale as ONE debit line with its items indented under it, each receipt
   as "RV-no · bank" on a credit line, a running balance, and a totals row
   with the entry count and the Ledger Limit. Drawn in this system's own
   design, not FoxPro's.

   The "+" adds a row by hand -- date, description, optionally an item with a
   quantity and a price -- and posts it to the books as a manual journal entry
   with the customer on the Accounts Receivable line. Ledger-only: no invoice,
   no stock. A hand-written row can be undone (reversed, never deleted).
   ─────────────────────────────────────────────────────────────────────────── */

type Item = { name: string; qty: number; rate: number; amount: number };
type Row = {
  key: string; date: string | null; kind: string; reference: string | null; particulars: string;
  detail: string | null; debit: number; credit: number; balance: number;
  entryId: number | null; entryNo: string | null; documentId: number | null;
  reversed: boolean; canReverse: boolean; items: Item[];
};
type AccountInfo = {
  id: number; code: string; name: string; legalName: string; category: string; categoryId: number;
  city: string; phone: string | null; address: string | null; creditLimit: number; creditDays: number;
  openingBalance: number; salesPerson: string | null; isActive: boolean;
};
type Statement = {
  account: AccountInfo; from: string; to: string; balanceBroughtForward: number; rows: Row[];
  entryCount: number; totalDebit: number; totalCredit: number; closingBalance: number;
  creditLimit: number; unpostedDocuments: number;
};
type Counter = { id: number; code: string; name: string; group: string };
type Product = { id: number; name: string; sku: string; price: number };
type Lookups = {
  counterAccounts: Counter[]; products: Product[];
  defaultDebitAccountCode: string; defaultCreditAccountCode: string;
};

const KIND_TONE: Record<string, string> = {
  sale: "bg-info/10 text-info-dark dark:text-info-light",
  receipt: "bg-success/10 text-success-dark dark:text-success-light",
  return: "bg-warning/10 text-warning-dark dark:text-warning-light",
  manual: "bg-brand-yellow/15 text-brand-yellow-700 dark:text-brand-yellow-300",
  reversal: "bg-danger/10 text-danger",
  journal: "bg-slate-100 text-slate-600 dark:bg-navy-700 dark:text-slate-300",
};
const KIND_LABEL: Record<string, string> = {
  sale: "Sale", receipt: "Receipt", return: "Return", manual: "Manual", reversal: "Reversal", journal: "Journal",
};

export default function CustomerStatementPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const today = pkToday();

  const [from, setFrom] = React.useState(defaultFrom(today));
  const [to, setTo] = React.useState(today);
  const [s, setS] = React.useState<Statement | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [adding, setAdding] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<Statement>(`${API_BASE_URL}/ledgers/customers/${id}/statement`, {
        params: { from, to }, headers: authHeader(),
      });
      setS(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load this statement."));
    } finally {
      setLoading(false);
    }
  }, [id, from, to]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  React.useEffect(() => {
    axios.get<Lookups>(`${API_BASE_URL}/ledgers/customers/lookups`, { headers: authHeader() })
      .then((r) => setLookups(r.data))
      .catch(() => undefined);
  }, []);

  async function reverse(row: Row) {
    if (!row.entryId) return;
    const reason = window.prompt(`Undo ${row.entryNo}? It will be reversed by a new entry dated today.\n\nReason (optional):`, "");
    if (reason === null) return;
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/ledgers/customers/${id}/entries/${row.entryId}/reverse`,
        { reason: reason || null }, { headers: authHeader() });
      toast.success("Reversed", { description: res.data.message });
      void load();
    } catch (e) {
      toast.error("Not reversed", { description: apiMessage(e, "Please try again.") });
    }
  }

  const presets = [
    { label: "This month", from: monthStart(today), to: today },
    { label: "Last 2 months", from: defaultFrom(today), to: today },
    { label: "This year", from: yearStart(today), to: today },
    { label: "All time", from: "2020-01-01", to: today },
  ];

  if (error && !s) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="size-8 text-danger mx-auto mb-2" />
        <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
        <div className="flex justify-center gap-2 mt-3">
          <Button variant="ghost" asChild><Link href="/ledgers/customers"><ArrowLeft />Back</Link></Button>
          <Button variant="secondary" onClick={() => void load()}>Try again</Button>
        </div>
      </Card>
    );
  }

  const a = s?.account;
  const limitUsed = s && s.creditLimit > 0 ? Math.min(100, Math.max(0, (s.closingBalance / s.creditLimit) * 100)) : 0;
  const overLimit = !!s && s.creditLimit > 0 && s.closingBalance > s.creditLimit;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Money" }, { label: "Customer Ledgers", href: "/ledgers/customers" }, { label: a?.code ?? "…" }]}
        title={a ? (
          <span className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm font-bold tabular px-2 py-0.5 rounded-md bg-navy-900 text-brand-yellow dark:bg-brand-yellow dark:text-navy-900">{a.code}</span>
            <span>{a.name}</span>
          </span>
        ) : <Skeleton className="h-8 w-64" />}
        subtitle={a ? (
          <span className="flex items-center gap-x-2 gap-y-0.5 flex-wrap">
            <span>{a.category}</span><span>·</span><span>{a.city.replace(" - Pakistan", "")}</span>
            {a.phone && <><span>·</span><span className="inline-flex items-center gap-1"><Phone className="size-3" />{a.phone}</span></>}
            {a.salesPerson && <><span>·</span><span>{a.salesPerson}</span></>}
            {!a.isActive && <span className="text-danger font-medium">· closed</span>}
          </span>
        ) : undefined}
        actions={s && a ? (
          <div className="flex items-center gap-2 flex-wrap">
            <StatementPdfActions path={`ledgers/customers/${id}/statement/pdf`} from={s.from} to={s.to}
              fileName={`SOA-${a.code}-${s.from}-${s.to}.pdf`} />
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href={`/parties/${id}/edit`}><Pencil /><span className="hidden sm:inline">Edit account</span></Link>
            </Button>
          </div>
        ) : undefined}
      />

      {/* RANGE */}
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
              <button key={p.label} type="button" onClick={() => { setFrom(p.from); setTo(p.to); }}
                className={cn("shrink-0 px-3 h-9 rounded-lg text-xs font-medium border transition-colors",
                  from === p.from && to === p.to
                    ? "bg-navy-900 text-white border-navy-900 dark:bg-brand-yellow dark:text-navy-900 dark:border-brand-yellow"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-navy-700 dark:text-slate-300")}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {s && s.unpostedDocuments > 0 && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-lg border border-warning/40 bg-warning/5 text-xs text-warning-dark dark:text-warning-light">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>
            {s.unpostedDocuments} of this customer&apos;s documents from before the books were connected are not posted yet,
            so they are missing below. The Super Admin posts them from <Link href="/ledgers/customers" className="underline">Customer Ledgers</Link>.
          </span>
        </div>
      )}

      {/* SUMMARY */}
      {s ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Stat label={`Balance B/F · ${formatDate(s.from)}`} value={formatMoney(s.balanceBroughtForward)} />
          <Stat label="Debit in period" value={formatMoney(s.totalDebit - Math.max(0, s.balanceBroughtForward))} />
          <Stat label="Credit in period" value={formatMoney(s.totalCredit - Math.max(0, -s.balanceBroughtForward))} tone="success" />
          <Card className={cn("p-4", overLimit ? "border-danger/40 bg-danger/5" : "bg-navy-900 dark:bg-navy-800 border-navy-900")}>
            <div className={cn("text-2xs uppercase font-semibold tracking-wider", overLimit ? "text-danger" : "text-brand-yellow")}>
              {s.closingBalance >= 0 ? "Balance due" : "In credit"} · {formatDate(s.to)}
            </div>
            <div className={cn("text-xl sm:text-2xl tabular font-bold mt-1", overLimit ? "text-danger" : "text-white")}>
              {formatMoney(Math.abs(s.closingBalance))}
            </div>
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div className={cn("h-full rounded-full", overLimit ? "bg-danger" : "bg-brand-yellow")} style={{ width: `${limitUsed}%` }} />
              </div>
              <div className={cn("text-2xs mt-1 tabular", overLimit ? "text-danger" : "text-slate-300")}>
                {s.creditLimit > 0 ? `Ledger limit ${formatMoney(s.creditLimit)}` : "No ledger limit"}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      )}

      {/* THE STATEMENT */}
      <Card className="p-0 overflow-hidden">
        {!s ? (
          <div className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : (
          <div className={cn(loading && "opacity-60 transition-opacity")}>
            {/* column heads, desktop */}
            <div className="hidden md:grid grid-cols-[6.5rem_1fr_7.5rem_7.5rem_8.5rem] gap-x-3 px-4 py-2.5 bg-navy-900 text-white text-2xs uppercase tracking-wider font-semibold">
              <div>Date</div><div>Particulars</div>
              <div className="text-right">Debit</div><div className="text-right">Credit</div><div className="text-right">Balance</div>
            </div>

            <ul className="divide-y divide-slate-100 dark:divide-navy-700/60">
              {s.rows.map((r) => <StatementLine key={r.key} row={r} onReverse={() => void reverse(r)} />)}
            </ul>

            {adding && lookups ? (
              <AddRow customerId={id} lookups={lookups} today={today}
                onCancel={() => setAdding(false)}
                onSaved={() => { setAdding(false); void load(); }} />
            ) : (
              <button type="button" onClick={() => setAdding(true)} disabled={!lookups}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-navy-900 dark:text-brand-yellow border-t border-dashed border-slate-200 dark:border-navy-700 hover:bg-brand-yellow/5 transition-colors">
                <span className="size-6 rounded-full bg-brand-yellow text-navy-900 inline-flex items-center justify-center"><Plus className="size-4" /></span>
                Add a row
              </button>
            )}

            {/* TOTALS -- entry count, the ledger limit, and the three sums. */}
            <div className="bg-navy-900 text-white px-4 py-3 md:grid md:grid-cols-[6.5rem_1fr_7.5rem_7.5rem_8.5rem] md:gap-x-3 md:items-center">
              <div className="text-2xs uppercase tracking-wider font-bold text-brand-yellow">Totals</div>
              <div className="text-xs text-slate-300 mt-0.5 md:mt-0">
                {s.entryCount} {s.entryCount === 1 ? "entry" : "entries"} · Ledger limit {s.creditLimit > 0 ? ledgerAmount(s.creditLimit) : "none"}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 md:contents">
                <Money label="Debit" v={s.totalDebit} />
                <Money label="Credit" v={s.totalCredit} />
                <Money label="Balance" v={s.closingBalance} strong />
              </div>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <Card className="p-4">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 truncate">{label}</div>
      <div className={cn("text-lg sm:text-xl tabular font-bold mt-1", tone === "success" ? "text-success" : "text-navy-900 dark:text-white")}>{value}</div>
    </Card>
  );
}

function Money({ label, v, strong }: { label: string; v: number; strong?: boolean }) {
  return (
    <div className="text-right">
      <div className="md:hidden text-2xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className={cn("tabular", strong ? "text-brand-yellow font-bold text-base" : "font-semibold text-sm")}>{ledgerAmount(v, "0")}</div>
    </div>
  );
}

/* ─────────────────────────── one line ─────────────────────────── */

function StatementLine({ row: r, onReverse }: { row: Row; onReverse: () => void }) {
  const opening = r.kind === "opening";
  return (
    <li className={cn("px-4 py-2.5", opening && "bg-slate-50 dark:bg-navy-700/30", r.reversed && "opacity-60")}>
      <div className="md:grid md:grid-cols-[6.5rem_1fr_7.5rem_7.5rem_8.5rem] md:gap-x-3 md:items-start">
        <div className="flex items-center justify-between md:block">
          <span className="text-xs tabular text-slate-500 dark:text-slate-400">{r.date ? formatDate(r.date) : ""}</span>
          <span className={cn("md:hidden tabular text-sm font-bold", r.balance < 0 ? "text-success" : "text-navy-900 dark:text-white")}>
            {ledgerAmount(r.balance, "0")}
          </span>
        </div>

        <div className="min-w-0 mt-0.5 md:mt-0">
          <div className="flex items-center gap-2 flex-wrap">
            {!opening && (
              <span className={cn("text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded", KIND_TONE[r.kind] ?? KIND_TONE.journal)}>
                {KIND_LABEL[r.kind] ?? r.kind}
              </span>
            )}
            <span className={cn("text-sm text-navy-900 dark:text-white", opening ? "font-bold" : "font-medium")}>{r.particulars}</span>
            {r.reversed && <span className="text-[10px] uppercase font-bold text-danger">reversed</span>}
            {r.canReverse && (
              <button type="button" onClick={onReverse}
                className="inline-flex items-center gap-1 text-2xs text-slate-400 hover:text-danger transition-colors">
                <Undo2 className="size-3" /> Undo
              </button>
            )}
          </div>
          {r.entryNo && !opening && (
            <div className="text-2xs text-slate-400 tabular mt-0.5">{r.entryNo}{r.detail && r.detail !== r.entryNo ? ` · ${r.detail}` : ""}</div>
          )}

          {r.items.length > 0 && (
            <ul className="mt-1.5 border-l-2 border-brand-yellow pl-3 space-y-0.5">
              {r.items.map((it, i) => (
                <li key={i} className="flex items-baseline gap-2 text-xs">
                  <span className="flex-1 min-w-0 truncate text-slate-600 dark:text-slate-300">{it.name}</span>
                  <span className="tabular text-slate-400 shrink-0">{qtyText(it.qty)} × {ledgerAmount(it.rate)}</span>
                  <span className="tabular text-slate-700 dark:text-slate-200 font-medium shrink-0 w-20 text-right">{ledgerAmount(it.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Phone: debit / credit side by side under the text. */}
        <div className="md:hidden flex gap-4 mt-1.5 text-xs tabular">
          {r.debit > 0 && <span className="text-slate-500">Dr <span className="font-semibold text-navy-900 dark:text-white">{ledgerAmount(r.debit)}</span></span>}
          {r.credit > 0 && <span className="text-slate-500">Cr <span className="font-semibold text-success">{ledgerAmount(r.credit)}</span></span>}
        </div>

        <div className="hidden md:block text-right tabular text-sm text-navy-900 dark:text-white">{ledgerAmount(r.debit)}</div>
        <div className="hidden md:block text-right tabular text-sm text-success">{ledgerAmount(r.credit)}</div>
        <div className={cn("hidden md:block text-right tabular text-sm font-bold", r.balance < 0 ? "text-success" : "text-navy-900 dark:text-white")}>
          {ledgerAmount(r.balance, "0")}
        </div>
      </div>
    </li>
  );
}

/* ─────────────────────────── the "+" row ─────────────────────────── */

function AddRow({
  customerId, lookups, today, onCancel, onSaved,
}: {
  customerId: number;
  lookups: Lookups;
  today: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = React.useState(today);
  const [description, setDescription] = React.useState("");
  const [item, setItem] = React.useState("");
  const [qty, setQty] = React.useState("");
  const [rate, setRate] = React.useState("");
  const [side, setSide] = React.useState<"debit" | "credit">("debit");
  const [amount, setAmount] = React.useState("");
  const [counterId, setCounterId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const product = lookups.products.find((p) => p.name.toLowerCase() === item.trim().toLowerCase()) ?? null;
  const hasItem = item.trim().length > 0;
  const computed = hasItem && Number(qty) > 0 && rate !== "" ? Math.round(Number(qty) * Number(rate) * 100) / 100 : null;

  /* Default the other side as the owner asked: Sale for a debit, Cash for a
     credit -- until somebody picks one themselves. */
  const defaultCode = side === "debit" ? lookups.defaultDebitAccountCode : lookups.defaultCreditAccountCode;
  const effectiveCounter = counterId || String(lookups.counterAccounts.find((c) => c.code === defaultCode)?.id ?? "");

  function pickItem(v: string) {
    setItem(v);
    const p = lookups.products.find((x) => x.name.toLowerCase() === v.trim().toLowerCase());
    if (p && !rate) setRate(String(p.price));
  }

  async function save() {
    const value = computed ?? Number(amount);
    if (!(value > 0)) { toast.error("Enter an amount -- or a quantity and a price."); return; }
    if (!hasItem && !description.trim()) { toast.error("Say what the row is for."); return; }
    setSaving(true);
    try {
      const res = await axios.post<{ message: string }>(`${API_BASE_URL}/ledgers/customers/${customerId}/entries`, {
        date,
        description: description.trim() || null,
        productId: product?.id ?? null,
        itemName: hasItem && !product ? item.trim() : null,
        qty: hasItem ? Number(qty) : null,
        rate: hasItem ? Number(rate) : null,
        debit: side === "debit" ? value : null,
        credit: side === "credit" ? value : null,
        counterAccountId: effectiveCounter ? Number(effectiveCounter) : null,
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
        <span className="text-2xs text-slate-500 dark:text-slate-400">Posted to the books. No invoice, no stock.</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-12 gap-2.5">
        <div className="col-span-1 md:col-span-2">
          <Label className="text-2xs">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </div>
        <div className="col-span-1 md:col-span-2">
          <Label className="text-2xs">Side</Label>
          <div className="grid grid-cols-2 mt-1 rounded-lg border border-slate-200 dark:border-navy-700 overflow-hidden h-9">
            {(["debit", "credit"] as const).map((k) => (
              <button key={k} type="button" onClick={() => { setSide(k); setCounterId(""); }}
                className={cn("text-xs font-semibold capitalize",
                  side === k ? (k === "debit" ? "bg-navy-900 text-white" : "bg-success text-white") : "text-slate-500 bg-white dark:bg-navy-800")}>
                {k}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2 md:col-span-8">
          <Label className="text-2xs">Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={250}
            placeholder={side === "debit" ? "e.g. Old balance adjustment" : "e.g. Cash received by hand"} className="mt-1" />
        </div>

        <div className="col-span-2 md:col-span-5">
          <Label className="text-2xs">Item (optional)</Label>
          <Input list="ledger-products" value={item} onChange={(e) => pickItem(e.target.value)}
            placeholder="Pick from the catalogue or type" className="mt-1" />
          <datalist id="ledger-products">
            {lookups.products.map((p) => <option key={p.id} value={p.name}>{p.sku}</option>)}
          </datalist>
        </div>
        <div className="col-span-1 md:col-span-2">
          <Label className="text-2xs">Qty</Label>
          <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" disabled={!hasItem} className="mt-1 tabular" />
        </div>
        <div className="col-span-1 md:col-span-2">
          <Label className="text-2xs">Price</Label>
          <Input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" disabled={!hasItem} className="mt-1 tabular" />
        </div>
        <div className="col-span-2 md:col-span-3">
          <Label className="text-2xs">{side === "debit" ? "Debit" : "Credit"} amount</Label>
          <Input value={computed !== null ? String(computed) : amount} onChange={(e) => setAmount(e.target.value)}
            readOnly={computed !== null} inputMode="decimal"
            className={cn("mt-1 tabular font-semibold", computed !== null && "bg-slate-50 dark:bg-navy-700")} />
          {computed !== null && <p className="text-2xs text-slate-500 mt-0.5">Qty × price</p>}
        </div>

        <div className="col-span-2 md:col-span-7">
          <Label className="text-2xs">Other side of the entry</Label>
          <SelectNative value={effectiveCounter} onChange={(e) => setCounterId(e.target.value)} className="mt-1">
            {lookups.counterAccounts.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
          </SelectNative>
        </div>
        <div className="col-span-2 md:col-span-5 flex items-end justify-end gap-2">
          <Button variant="ghost" className="gap-1" onClick={onCancel}><X />Cancel</Button>
          <Button variant="accent" className="gap-1.5" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />} Post row
          </Button>
        </div>
      </div>
    </div>
  );
}
