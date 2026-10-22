"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Plus, Trash2, Save, Loader2, Search, ChevronsUpDown, AlertCircle } from "lucide-react";
import { usePageRefresh } from "@/lib/page-refresh";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { StatusPill } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { toast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/format";
import { isPastDate, PAST_DATE_MESSAGE, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* ───────────────────────────────────────────────────────────────────────────
   THE VOUCHER BOOK -- a day's vouchers typed into one table

   The owner, 22 Oct, with photographs of the client's old "Receipt Vouchers
   Book": the entry date at the top, then one row per entry -- the account
   credited, the particulars, the amount, the account debited -- and the day's
   entries listed for whatever date is picked. The single New Voucher form is
   unchanged; this is the second way in, for a whole day at once.

   Every row has a CODE, chosen from a dropdown, and the code decides what the
   two account columns mean:

     CR / BR  receipt   Ac CR = the party who paid,  Ac DR = cash / bank
     CP / BP  payment   Ac DR = the party paid,      Ac CR = cash / bank
     JV       journal   Ac DR and Ac CR = any two accounts (a party lands on
                        its receivable or payable account)

   The codes come from the API (GET /accounting/voucher-book): the Super Admin
   gets all five, the accountant CR and BR only, and the day's list shows the
   accountant receipts only. Saving sends the whole table at once and the API
   saves all of it or none (AccountingController.SaveVoucherBook).
   ─────────────────────────────────────────────────────────────────────────── */

type Code = { code: string; name: string; kind: "receipt" | "payment" | "journal" };

type BookLine = {
  kind: "voucher" | "journal";
  id: number;
  no: string;
  code: string;
  accountCr: string;
  accountDr: string;
  particulars: string | null;
  amount: number;
  status: string;
  statusName: string;
  method: string | null;
  createdBy: string | null;
  url: string;
};

type Book = {
  date: string;
  codes: Code[];
  canSeePayments: boolean;
  rows: BookLine[];
  receiptTotal: number;
  paymentTotal: number;
  journalTotal: number;
};

/* GET /accounting/lookups -- only the parts this page reads. */
type LookupAccount = { id: number; code: string; name: string; isGroup: boolean; type: string };
type LookupParty = { id: number; code: string; name: string; type: "CUSTOMER" | "SUPPLIER" | "BOTH" };
type LookupMethod = { id: number; key: string; name: string; kind: string };
type Lookups = {
  accounts: LookupAccount[];
  parties: LookupParty[];
  paymentMethods: LookupMethod[];
  receivingMethods: LookupMethod[];
  locations: { id: number; name: string }[];
};

/** One choice in an account cell: a party, a ledger account, or a party on its control account. */
type Pick = { key: string; label: string; hint: string; accountId: number | null; partyId: number | null };

/** A row being typed. Only the fields its code uses are sent. */
type Draft = {
  uid: number;
  code: string;
  party: string;        // Pick key -- receipts and payments
  cashBank: number;     // receipts and payments
  methodId: number;     // bank receipts and payments
  debit: string;        // Pick key -- JV
  credit: string;       // Pick key -- JV
  particulars: string;
  amount: string;
};

const STATUS_VARIANT: Record<string, "success" | "muted" | "warning" | "danger" | "info"> = {
  POSTED: "success", DRAFT: "muted", REVERSED: "warning", REJECTED: "danger", CANCELLED: "danger", RECONCILED: "info",
};

const CODE_TONE: Record<string, string> = {
  receipt: "text-success", payment: "text-danger", journal: "text-info",
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

let nextUid = 1;

export default function VoucherBookPage() {
  const search = useSearchParams();
  const [date, setDate] = React.useState(() => search.get("date") || todayISO());
  const [query, setQuery] = React.useState("");
  const [q, setQ] = React.useState("");

  const [book, setBook] = React.useState<Book | null>(null);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [locationId, setLocationId] = React.useState(0);
  const [post, setPost] = React.useState(true);
  const [drafts, setDrafts] = React.useState<Draft[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [badRow, setBadRow] = React.useState<number | null>(null);

  /* Typing in the search box asks the API 300 ms after the last key. */
  React.useEffect(() => {
    const t = setTimeout(() => setQ(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const loadBook = React.useCallback(async () => {
    try {
      const res = await axios.get<Book>(`${API_BASE_URL}/accounting/voucher-book`, {
        headers: authHeader(), params: { date, q: q || undefined },
      });
      setBook(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the vouchers for that date."));
    } finally {
      setLoading(false);
    }
  }, [date, q]);

  const loadLookups = React.useCallback(async () => {
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/accounting/lookups`, { headers: authHeader() });
      setLookups(res.data);
      /* Not Claim Stock, which sorts first and is where damaged goods sit --
         nobody takes money "at" it. */
      setLocationId((cur) => cur
        || (res.data.locations.find((l) => !/claim/i.test(l.name)) ?? res.data.locations[0])?.id || 0);
    } catch (e) {
      setError(apiMessage(e, "Could not load the accounts."));
    }
  }, []);

  const reload = React.useCallback(async () => {
    await Promise.all([loadBook(), loadLookups()]);
  }, [loadBook, loadLookups]);
  usePageRefresh(reload);   // the top bar's Refresh button -- lib/page-refresh.ts

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void loadBook();
  }, [loadBook]);
  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void loadLookups();
  }, [loadLookups]);

  const codes = React.useMemo(() => book?.codes ?? [], [book]);
  const kindOf = React.useCallback((code: string) => codes.find((c) => c.code === code)?.kind ?? "receipt", [codes]);

  /* ── what each account cell may offer ── */
  const cashBank = React.useMemo(
    () => (lookups?.accounts ?? []).filter((a) => !a.isGroup && a.type === "Cash & Bank"),
    [lookups]
  );
  const partyPicks = React.useMemo<Pick[]>(
    () => (lookups?.parties ?? []).map((p) => ({
      key: `p:${p.id}`, label: p.name, hint: `${p.code} · ${p.type.toLowerCase()}`, accountId: null, partyId: p.id,
    })),
    [lookups]
  );
  /* A JV side: any postable account, or a party -- which lands on its control
     account (receivable 1130 for a customer, payable 2101 for a supplier), the
     same two accounts every receipt and payment voucher posts through. */
  const journalPicks = React.useMemo<Pick[]>(() => {
    const accounts = (lookups?.accounts ?? []).filter((a) => !a.isGroup);
    const ar = accounts.find((a) => a.code === "1130");
    const ap = accounts.find((a) => a.code === "2101");
    const parties = (lookups?.parties ?? []).flatMap((p) => {
      const control = p.type === "SUPPLIER" ? ap : ar;
      return control ? [{
        key: `p:${p.id}`, label: p.name, hint: `${p.code} · on ${control.code} ${control.name}`,
        accountId: control.id, partyId: p.id,
      }] : [];
    });
    return [
      ...accounts.map((a) => ({ key: `a:${a.id}`, label: `${a.code} ${a.name}`, hint: a.type, accountId: a.id, partyId: null })),
      ...parties,
    ];
  }, [lookups]);

  function methodsFor(code: string) {
    if (!lookups) return [];
    if (code === "BR") return lookups.receivingMethods.filter((m) => m.kind === "bank");
    if (code === "BP") return lookups.paymentMethods.filter((m) => m.kind === "bank");
    return lookups.paymentMethods.filter((m) => m.key === "CASH");
  }

  /** The cash account for a cash code, a bank account for a bank code -- by name, the best guess the chart allows. */
  function defaultCashBank(code: string) {
    const cash = cashBank.find((a) => /cash/i.test(a.name));
    const bank = cashBank.find((a) => !/cash/i.test(a.name));
    return ((code === "CR" || code === "CP") ? cash ?? bank : bank ?? cash)?.id ?? 0;
  }

  function blankRow(code?: string): Draft {
    const c = code ?? drafts[drafts.length - 1]?.code ?? codes[0]?.code ?? "CR";
    return {
      uid: nextUid++, code: c, party: "", cashBank: defaultCashBank(c),
      methodId: methodsFor(c)[0]?.id ?? 0, debit: "", credit: "", particulars: "", amount: "",
    };
  }

  /* Start with one empty row once the codes and accounts are known. */
  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       one empty row, once, when the codes and accounts first arrive. */
    if (drafts.length === 0 && codes.length > 0 && lookups) setDrafts([blankRow()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately only on their arrival
  }, [codes, lookups]);

  function setRow(uid: number, patch: Partial<Draft>) {
    setBadRow(null);
    setDrafts((rows) => rows.map((r) => {
      if (r.uid !== uid) return r;
      const next = { ...r, ...patch };
      /* A new code resets what the old one meant. */
      if (patch.code && patch.code !== r.code) {
        next.cashBank = defaultCashBank(patch.code);
        next.methodId = methodsFor(patch.code)[0]?.id ?? 0;
        if (kindOf(patch.code) !== kindOf(r.code)) { next.party = ""; next.debit = ""; next.credit = ""; }
      }
      return next;
    }));
  }

  function addRow() {
    setDrafts((rows) => [...rows, blankRow()]);
  }

  const newTotal = drafts.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const filled = drafts.filter((r) => Number(r.amount) > 0);

  async function save() {
    if (filled.length === 0) { toast.error("Type at least one row with an amount."); return; }
    if (isPastDate(date)) { toast.error(PAST_DATE_MESSAGE, { description: "New entries are dated today or later; past dates can only be viewed." }); return; }
    if (!locationId) { toast.error("Pick a location."); return; }

    const find = (list: Pick[], key: string) => list.find((p) => p.key === key) ?? null;
    const rows = filled.map((r) => {
      const kind = kindOf(r.code);
      if (kind === "journal") {
        const dr = find(journalPicks, r.debit);
        const cr = find(journalPicks, r.credit);
        return {
          code: r.code, amount: Number(r.amount), particulars: r.particulars || null,
          debitAccountId: dr?.accountId ?? null, debitPartyId: dr?.partyId ?? null,
          creditAccountId: cr?.accountId ?? null, creditPartyId: cr?.partyId ?? null,
        };
      }
      return {
        code: r.code, amount: Number(r.amount), particulars: r.particulars || null,
        partyId: find(partyPicks, r.party)?.partyId ?? null,
        cashBankAccountId: r.cashBank || null,
        methodId: r.methodId || null,
      };
    });

    setSaving(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/accounting/voucher-book`,
        { date, locationId, post, rows },
        { headers: authHeader() }
      );
      toast.success("Saved", { description: res.data.message });
      setDrafts([blankRow()]);
      await loadBook();
    } catch (e) {
      /* The API names the row by its place in what was SENT -- map it back to
         the table, where empty rows were skipped. */
      const at = axios.isAxiosError(e) ? (e.response?.data as { row?: number })?.row : undefined;
      if (typeof at === "number" && filled[at]) setBadRow(filled[at].uid);
      toast.error("Nothing was saved", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  const saved = book?.rows ?? [];
  const pastDay = isPastDate(date);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Vouchers", href: "/accounting/vouchers" }, { label: "Table Entry" }]}
        title="Voucher Book"
        subtitle={book && !book.canSeePayments
          ? "Receipts for one date, entered as a table"
          : "Receipts, payments and journal vouchers for one date, entered as a table"}
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href="/accounting/vouchers"><ArrowLeft /><span>Back</span></Link>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" onClick={() => void save()}
              disabled={saving || filled.length === 0 || pastDay}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save />}
              <span>Save {filled.length > 0 ? `${filled.length} ${filled.length === 1 ? "entry" : "entries"}` : "entries"}</span>
            </Button>
          </>
        }
      />

      {/* The header strip -- the old screen's ENTRY DATE line. */}
      <Card className="mb-4">
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Entry date</span>
            <Input type="date" value={date} onChange={(e) => { if (e.target.value) { setLoading(true); setDate(e.target.value); } }} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Location</span>
            <SelectNative value={locationId || ""} onChange={(e) => setLocationId(Number(e.target.value))}>
              {(lookups?.locations ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </SelectNative>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Search this date</span>
            <div className="relative">
              <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input className="pl-8" placeholder="Number, account or particulars" value={query}
                onChange={(e) => setQuery(e.target.value)} />
            </div>
          </label>
          <label className="flex items-center gap-2 h-10 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" className="size-4 accent-brand-yellow" checked={post} onChange={(e) => setPost(e.target.checked)} />
            Post on save
            <span className="text-2xs text-slate-400">(untick to save as drafts)</span>
          </label>
        </CardBody>
      </Card>

      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5">
          <CardBody className="flex items-center gap-2 text-sm text-danger"><AlertCircle className="size-4" />{error}</CardBody>
        </Card>
      )}

      {/* The code legend -- which code is which, as the dropdown offers them. */}
      {codes.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-2xs text-slate-500 dark:text-slate-400">
          {codes.map((c) => (
            <span key={c.code}><b className={cn("tabular", CODE_TONE[c.kind])}>{c.code}</b> {c.name}</span>
          ))}
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[92rem] table-fixed">
            <thead className="bg-slate-50 dark:bg-navy-800 text-2xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2 text-left w-10">#</th>
                <th className="px-2 py-2 text-left w-48">Code</th>
                <th className="px-2 py-2 text-left w-64">Ac CR</th>
                <th className="px-2 py-2 text-left">Particulars</th>
                <th className="px-2 py-2 text-right w-36">Amount</th>
                <th className="px-2 py-2 text-left w-64">Ac DR</th>
                <th className="px-2 py-2 text-left w-36">Method</th>
                <th className="px-2 py-2 text-left w-24">Status</th>
                <th className="px-2 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {/* ── what is already in the book for this date ── */}
              {loading && !book ? (
                [0, 1, 2].map((i) => (
                  <tr key={i}><td colSpan={9} className="px-2 py-1.5"><Skeleton className="h-8" /></td></tr>
                ))
              ) : saved.map((r, i) => (
                <tr key={`${r.kind}-${r.id}`} className="border-t border-slate-100 dark:border-navy-700 bg-slate-50/40 dark:bg-navy-900/30">
                  <td className="px-2 py-2 tabular text-slate-400">{i + 1}</td>
                  <td className="px-2 py-2">
                    <span className={cn("font-bold tabular", CODE_TONE[kindOf(r.code)] ?? "text-slate-600")}>{r.code}</span>{" "}
                    <Link href={r.url} className="text-2xs tabular text-brand-yellow hover:underline">{r.no}</Link>
                  </td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-200">{r.accountCr}</td>
                  <td className="px-2 py-2 text-slate-500 dark:text-slate-400">{r.particulars || "—"}</td>
                  <td className="px-2 py-2 text-right tabular font-semibold text-navy-900 dark:text-white">{formatMoney(r.amount)}</td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-200">{r.accountDr}</td>
                  <td className="px-2 py-2 text-slate-500 dark:text-slate-400">{r.method ?? "—"}</td>
                  <td className="px-2 py-2"><StatusPill variant={STATUS_VARIANT[r.status] ?? "muted"}>{r.statusName}</StatusPill></td>
                  <td />
                </tr>
              ))}
              {book && saved.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-3 text-center text-xs text-slate-400">
                  {q ? "Nothing on this date matches the search." : "Nothing entered on this date yet."}
                </td></tr>
              )}

              {/* ── the rows being typed ── */}
              {!pastDay && drafts.map((r, i) => {
                const kind = kindOf(r.code);
                const cashCell = (
                  <SelectNative value={r.cashBank || ""} onChange={(e) => setRow(r.uid, { cashBank: Number(e.target.value) })}>
                    {cashBank.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                  </SelectNative>
                );
                const partyCell = (
                  <AccountPicker picks={partyPicks} value={r.party} onChange={(k) => setRow(r.uid, { party: k })}
                    placeholder={kind === "receipt" ? "Received from…" : "Paid to…"} />
                );
                return (
                  <tr key={r.uid} className={cn("border-t border-slate-100 dark:border-navy-700 align-top",
                    badRow === r.uid && "bg-danger/5 outline outline-1 outline-danger/40")}>
                    <td className="px-2 py-1.5 tabular text-slate-400 pt-3">{saved.length + i + 1}</td>
                    <td className="px-2 py-1.5">
                      <SelectNative value={r.code} onChange={(e) => setRow(r.uid, { code: e.target.value })}>
                        {codes.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                      </SelectNative>
                    </td>
                    <td className="px-2 py-1.5">
                      {kind === "receipt" ? partyCell
                        : kind === "payment" ? cashCell
                        : <AccountPicker picks={journalPicks} value={r.credit} onChange={(k) => setRow(r.uid, { credit: k })} placeholder="Account to credit…" />}
                    </td>
                    <td className="px-2 py-1.5">
                      <Input value={r.particulars} placeholder="Particulars"
                        onChange={(e) => setRow(r.uid, { particulars: e.target.value })} />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" min={0} step="0.01" className="text-right tabular" value={r.amount}
                        onChange={(e) => setRow(r.uid, { amount: e.target.value })}
                        /* Enter on the last amount starts the next row, the
                           way the old book moved down the grid. */
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (i === drafts.length - 1) addRow(); } }} />
                    </td>
                    <td className="px-2 py-1.5">
                      {kind === "receipt" ? cashCell
                        : kind === "payment" ? partyCell
                        : <AccountPicker picks={journalPicks} value={r.debit} onChange={(k) => setRow(r.uid, { debit: k })} placeholder="Account to debit…" />}
                    </td>
                    <td className="px-2 py-1.5">
                      {kind === "journal" ? <span className="text-2xs text-slate-400 leading-10">no cash</span>
                        : r.code === "BR" || r.code === "BP" ? (
                          <SelectNative value={r.methodId || ""} onChange={(e) => setRow(r.uid, { methodId: Number(e.target.value) })}>
                            {methodsFor(r.code).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </SelectNative>
                        ) : <span className="text-xs text-slate-500 leading-10">Cash</span>}
                    </td>
                    <td className="px-2 py-1.5 text-2xs text-slate-400 pt-3">{post ? "will post" : "draft"}</td>
                    <td className="px-2 py-1.5">
                      <Button variant="ghost" size="icon-sm" aria-label="Remove row"
                        onClick={() => setDrafts((rows) => rows.length === 1 ? [blankRow(r.code)] : rows.filter((x) => x.uid !== r.uid))}>
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <CardBody className="border-t border-slate-200 dark:border-navy-700 flex flex-wrap items-center justify-between gap-3">
          {pastDay ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {PAST_DATE_MESSAGE} for new entries &mdash; this date&apos;s book is shown read-only.
            </p>
          ) : (
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={addRow} disabled={codes.length === 0}>
              <Plus /> Add row
            </Button>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs tabular">
            <span className="text-slate-500">Receipts <b className="text-success">{formatMoney(book?.receiptTotal ?? 0)}</b></span>
            {book?.canSeePayments && (
              <>
                <span className="text-slate-500">Payments <b className="text-danger">{formatMoney(book.paymentTotal)}</b></span>
                <span className="text-slate-500">Journal <b className="text-info">{formatMoney(book.journalTotal)}</b></span>
              </>
            )}
            {!pastDay && <span className="text-slate-500">New rows <b className="text-navy-900 dark:text-white">{formatMoney(newTotal)}</b></span>}
          </div>
        </CardBody>
      </Card>
    </>
  );
}

/** A searchable account cell: type a name or code, pick one. */
function AccountPicker({
  picks, value, onChange, placeholder,
}: {
  picks: Pick[];
  value: string;
  onChange: (key: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = React.useState(false);
  const chosen = picks.find((p) => p.key === value) ?? null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button"
          className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-left text-sm flex items-center gap-2 hover:border-brand-yellow">
          <span className={cn("flex-1 truncate", !chosen && "text-slate-400")}>{chosen?.label ?? placeholder}</span>
          <ChevronsUpDown className="size-3.5 text-slate-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,26rem)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Type a name or code…" />
          <CommandList className="max-h-72">
            <CommandEmpty>None found.</CommandEmpty>
            <CommandGroup>
              {picks.map((p) => (
                <CommandItem key={p.key} value={`${p.label} ${p.hint}`} onSelect={() => { onChange(p.key); setOpen(false); }}>
                  <span className="flex-1 truncate text-sm">{p.label}</span>
                  <span className="text-2xs text-slate-400 shrink-0">{p.hint}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
