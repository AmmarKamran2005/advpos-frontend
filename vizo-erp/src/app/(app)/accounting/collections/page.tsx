"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  Search, Check, X, Banknote, FileText, Landmark, Smartphone, Clock, AlertCircle, HandCoins,
  TrendingDown, Users, CalendarCheck, ChevronRight, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { CollectDialog } from "@/components/accounting/collect-dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   CONFIRM COLLECTIONS — made live, 27 Sep

   The owner: every order that has moved on ("status patch ho chuka hai") is a
   row here; opening it asks how much is being collected and confirmed now;
   confirming reflects in the customer's account — what he has paid, what he
   still owes, debit and credit in his ledger.

   Tabs:
   * To collect   — GET /accounting/collections/receivables: every invoiced
                    order with money still owed (or paid, or all). A row opens
                    CollectDialog, which posts the receipt.
   * Rep collections — money a salesperson says he took, AWAITING the
                    accountant's word. Confirm asks how much actually arrived
                    (never more than recorded); Bounced asks why.
   * Confirmed / Bounced — the record.

   Before this, the Confirm and Bounced buttons only showed a toast, and
   nothing in the system could create a collection at all.
   ─────────────────────────────────────────────────────────────────────────── */

type Receivable = {
  id: number; orderNo: string; status: string; statusName: string; orderDate: string;
  customerId: number; customerName: string; customerInitials: string; customerCode: string; city: string | null;
  salesPerson: string | null; invoiceId: number; invoiceNo: string; invoiceDate: string; dueDate: string;
  total: number; received: number; awaiting: number; balance: number;
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID"; daysOverdue: number;
};
type ReceivablesResponse = {
  total: number; page: number; pageSize: number;
  summary: { openOrders: number; outstanding: number; overdue: number; heldByReps: number; receivedThisMonth: number };
  items: Receivable[];
};

type CollectionStatus = "AWAITING" | "CONFIRMED" | "BOUNCED";
type Collection = {
  id: number; receiptNo: string; customerId: number; customerName: string; customerInitials: string;
  collectedBy: string; collectedOn: string; amount: number; method: string; methodName: string;
  reference: string | null; bank: string | null; chequeDate: string | null;
  status: CollectionStatus; statusName: string; confirmedOn: string | null; confirmedBy: string | null;
  note: string | null; against: string[];
};
type CollectionsResponse = { awaitingCount: number; awaitingTotal: number; items: Collection[] };

const METHOD_ICON: Record<string, typeof Banknote> = {
  CASH: Banknote, PETTY_CASH: Banknote, CHEQUE: FileText, BANK: Landmark, MEEZAN: Landmark, FAISAL: Landmark,
  JAZZCASH: Smartphone, EASYPAISA: Smartphone,
};

type Tab = "TO_COLLECT" | CollectionStatus;
const PAGE_SIZE = 30;

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) return (e.response.data as { message?: string })?.message ?? fallback;
  return "Cannot reach the server.";
}

export default function ConfirmCollectionsPage() {
  const [tab, setTab] = React.useState<Tab>("TO_COLLECT");
  const [search, setSearch] = React.useState("");
  const [show, setShow] = React.useState<"open" | "paid" | "all">("open");
  const [page, setPage] = React.useState(1);

  const [recv, setRecv] = React.useState<ReceivablesResponse | null>(null);
  const [cols, setCols] = React.useState<Collection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [collectFor, setCollectFor] = React.useState<number | null>(null);
  const [confirming, setConfirming] = React.useState<Collection | null>(null);
  const [bouncing, setBouncing] = React.useState<Collection | null>(null);

  /* Debounced search for the server-side list. */
  const [q, setQ] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = React.useCallback(async () => {
    try {
      const [r, c] = await Promise.all([
        axios.get<ReceivablesResponse>(`${API_BASE_URL}/accounting/collections/receivables`, {
          headers: authHeader(), params: { q: q || undefined, show, page, pageSize: PAGE_SIZE },
        }),
        axios.get<CollectionsResponse>(`${API_BASE_URL}/accounting/collections`, { headers: authHeader() }),
      ]);
      setRecv(r.data);
      setCols(c.data.items);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load collections."));
    } finally {
      setLoading(false);
    }
  }, [q, show, page]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. */
    void load();
  }, [load]);

  async function bounce(c: Collection, reason: string) {
    try {
      const r = await axios.post<{ message: string }>(`${API_BASE_URL}/accounting/collections/${c.id}/bounce`, { reason }, { headers: authHeader() });
      toast.success("Marked bounced", { description: r.data.message });
      setBouncing(null);
      await load();
    } catch (e) {
      toast.error("Not saved", { description: apiMessage(e, "Please try again.") });
    }
  }

  const term = search.trim().toLowerCase();
  const colRows = cols.filter((c) => c.status === tab && (!term
    || c.customerName.toLowerCase().includes(term) || c.receiptNo.toLowerCase().includes(term) || c.collectedBy.toLowerCase().includes(term)));
  const awaiting = cols.filter((c) => c.status === "AWAITING");
  const s = recv?.summary;
  const pages = recv ? Math.max(1, Math.ceil(recv.total / PAGE_SIZE)) : 1;

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "TO_COLLECT", label: "To collect", count: s?.openOrders ?? 0 },
    { key: "AWAITING", label: "Rep collections", count: awaiting.length },
    { key: "CONFIRMED", label: "Confirmed", count: cols.filter((c) => c.status === "CONFIRMED").length },
    { key: "BOUNCED", label: "Bounced", count: cols.filter((c) => c.status === "BOUNCED").length },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Money" }, { label: "Confirm Collections" }]}
        title="Confirm Collections"
        subtitle="Every invoiced order still owing, and the money reps say they hold — confirm it and the customer's account moves."
      />

      {error && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        </Card>
      )}

      {/* ── the money, at a glance ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <Stat icon={HandCoins} label="Still to collect" value={s ? formatCompact(s.outstanding) : null} sub={s ? `${s.openOrders} orders` : ""} tone="text-navy-900 dark:text-white" />
        <Stat icon={TrendingDown} label="Overdue" value={s ? formatCompact(s.overdue) : null} sub="past the due date" tone="text-danger" />
        <Stat icon={Users} label="Held by reps" value={s ? formatCompact(s.heldByReps) : null} sub={`${awaiting.length} unconfirmed`} tone="text-warning" />
        <Stat icon={CalendarCheck} label="Received this month" value={s ? formatCompact(s.receivedThisMonth) : null} sub="confirmed" tone="text-success" />
      </div>

      {/* ── tabs + search ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                tab === t.key
                  ? "bg-navy-900 text-brand-yellow dark:bg-navy-800"
                  : "bg-white dark:bg-navy-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-navy-700 hover:border-slate-300")}>
              {t.label} <span className="opacity-60">({t.count})</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {tab === "TO_COLLECT" && (
            <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs dark:border-navy-700">
              {(["open", "paid", "all"] as const).map((k) => (
                <button key={k} type="button" onClick={() => { setShow(k); setPage(1); }}
                  className={cn("rounded-md px-2.5 py-1 capitalize", show === k ? "bg-slate-100 font-semibold dark:bg-navy-700" : "text-slate-500")}>
                  {k === "open" ? "Owing" : k}
                </button>
              ))}
            </div>
          )}
          <div className="relative w-full sm:w-72">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9"
              placeholder={tab === "TO_COLLECT" ? "Customer, order or invoice…" : "Customer, receipt or rep…"} />
          </div>
        </div>
      </div>

      {tab === "TO_COLLECT" ? (
        loading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : !recv || recv.items.length === 0 ? (
          <Card><EmptyState icon={Check} title={show === "open" ? "Nothing owed" : "Nothing here"} description={show === "open" ? "Every invoiced order is paid." : "No orders match."} /></Card>
        ) : (
          <>
            <div className="space-y-2">
              {recv.items.map((r) => <ReceivableRow key={r.id} r={r} onOpen={() => setCollectFor(r.id)} />)}
            </div>
            {pages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span className="tabular text-slate-500">Page {page} of {pages}</span>
                <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            )}
          </>
        )
      ) : (
        <>
          {tab === "AWAITING" && awaiting.length > 0 && (
            <Card className="mb-4 border-warning/40 bg-warning/5">
              <CardBody className="flex items-start gap-3 py-3">
                <Clock className="size-4 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-700 dark:text-slate-200">
                  <span className="font-semibold">{formatMoney(awaiting.reduce((a, c) => a + c.amount, 0))}</span> across {awaiting.length}{" "}
                  {awaiting.length === 1 ? "receipt is" : "receipts are"} with the reps and outside the books until you confirm.
                </p>
              </CardBody>
            </Card>
          )}
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : colRows.length === 0 ? (
            <Card><EmptyState icon={Search} title="Nothing here" description="No receipts match this filter." /></Card>
          ) : (
            <div className="space-y-2">
              {colRows.map((c) => <CollectionCard key={c.id} c={c} onConfirm={() => setConfirming(c)} onBounce={() => setBouncing(c)} />)}
            </div>
          )}
        </>
      )}

      <CollectDialog orderId={collectFor} open={collectFor !== null}
        onOpenChange={(o) => !o && setCollectFor(null)} onDone={() => void load()} />

      <ConfirmRepDialog c={confirming} onOpenChange={(o) => !o && setConfirming(null)} onDone={() => void load()} />

      <ConfirmDialog
        open={bouncing !== null}
        onOpenChange={(o) => !o && setBouncing(null)}
        title={`Mark ${bouncing?.receiptNo} bounced?`}
        description={`It never reached the books, so ${bouncing?.customerName}'s balance does not change. The receipt stays on record as evidence of what was promised.`}
        variant="danger"
        confirmLabel="Yes, it bounced"
        requireReason
        reasonLabel="What happened?"
        reasonPlaceholder="e.g. insufficient funds, cash not handed in…"
        onConfirm={async (reason) => { if (bouncing) await bounce(bouncing, reason ?? ""); }}
      />
    </>
  );
}

function Stat({ icon: Icon, label, value, sub, tone }: { icon: typeof HandCoins; label: string; value: string | null; sub: string; tone: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
          {value === null ? <Skeleton className="mt-1.5 h-7 w-20" /> : <div className={cn("text-2xl tabular font-bold mt-1", tone)}>{value}</div>}
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>
        </div>
        <Icon className="size-5 text-slate-300 dark:text-slate-600 shrink-0" />
      </div>
    </Card>
  );
}

function ReceivableRow({ r, onOpen }: { r: Receivable; onOpen: () => void }) {
  const pct = r.total > 0 ? Math.min(100, (r.received / r.total) * 100) : 0;
  return (
    <Card className="transition-colors hover:border-brand-yellow/50">
      <button type="button" onClick={onOpen} className="w-full text-left">
        <CardBody className="py-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] xl:flex xl:items-center">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar initials={r.customerInitials} size="md" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-navy-900 dark:text-white truncate">{r.customerName}</div>
              <div className="tabular text-2xs text-slate-500 dark:text-slate-400 truncate">
                {r.orderNo} · {r.invoiceNo} · {formatDate(r.invoiceDate)}{r.salesPerson ? ` · ${r.salesPerson}` : ""}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap md:col-span-2 xl:col-span-1">
            <Badge variant="muted">{r.statusName}</Badge>
            {r.daysOverdue > 0 && <Badge variant="danger">{r.daysOverdue}d overdue</Badge>}
            {r.awaiting > 0 && <Badge variant="warning">{formatCompact(r.awaiting)} with rep</Badge>}
          </div>

          <div className="md:col-span-2 xl:col-span-1 xl:w-48 order-last xl:order-none">
            <div className="flex justify-between text-2xs text-slate-500 tabular">
              <span>{formatMoney(r.received)} of {formatMoney(r.total)}</span>
              <span>{Math.round(pct)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-navy-700">
              <div className={cn("h-full rounded-full", r.paymentStatus === "PAID" ? "bg-success" : "bg-brand-yellow")} style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 md:justify-end xl:w-44">
            <div className="text-right">
              <div className="text-2xs uppercase tracking-wider text-slate-500">{r.balance > 0 ? "Owed" : "Paid"}</div>
              <div className={cn("tabular text-base font-bold", r.balance > 0 ? "text-navy-900 dark:text-white" : "text-success")}>
                {formatMoney(r.balance > 0 ? r.balance : r.total)}
              </div>
            </div>
            {r.balance > 0
              ? <span className="inline-flex items-center gap-1 rounded-md bg-brand-yellow px-2.5 py-1.5 text-xs font-semibold text-navy-900">Collect <ChevronRight className="size-3.5" /></span>
              : <StatusPill variant="success">Paid</StatusPill>}
          </div>
        </CardBody>
      </button>
    </Card>
  );
}

function CollectionCard({ c, onConfirm, onBounce }: { c: Collection; onConfirm: () => void; onBounce: () => void }) {
  const Icon = METHOD_ICON[c.method] ?? Banknote;
  return (
    <Card className="hover:border-brand-yellow/40 transition-colors">
      <CardBody className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <Link href={`/ledgers/customers/${c.customerId}`} className="flex items-center gap-3 flex-1 min-w-0 group">
          <Avatar initials={c.customerInitials} size="md" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-navy-900 dark:text-white truncate group-hover:text-brand-yellow transition-colors">{c.customerName}</div>
            <div className="tabular text-2xs text-slate-500 dark:text-slate-400">{c.receiptNo} · {formatDate(c.collectedOn)} · {c.collectedBy}</div>
            {c.note && <div className="text-2xs text-slate-500 truncate">{c.note}</div>}
          </div>
        </Link>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="size-8 rounded-lg bg-slate-100 dark:bg-navy-800 flex items-center justify-center">
            <Icon className="size-4 text-slate-500 dark:text-slate-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-navy-900 dark:text-white">{c.methodName}</div>
            {(c.reference || c.bank) && (
              <div className="tabular text-2xs text-slate-500 dark:text-slate-400">{[c.reference, c.bank].filter(Boolean).join(" · ")}</div>
            )}
            {c.chequeDate && <div className="tabular text-2xs text-warning">dated {formatDate(c.chequeDate)}</div>}
          </div>
        </div>

        {c.against.length > 0 && (
          <Badge variant="muted" className="flex-shrink-0">{c.against.length === 1 ? c.against[0] : `${c.against.length} orders`}</Badge>
        )}

        <div className="tabular text-base font-bold text-navy-900 dark:text-white sm:w-32 sm:text-right flex-shrink-0">{formatMoney(c.amount)}</div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {c.status === "AWAITING" ? (
            <>
              <Button variant="accent" size="sm" className="gap-1" onClick={onConfirm}><Check /> Confirm</Button>
              <Button variant="ghost" size="icon-sm" className="text-danger" aria-label="Mark bounced" onClick={onBounce}><X /></Button>
            </>
          ) : (
            <StatusPill variant={c.status === "CONFIRMED" ? "success" : "danger"}>
              {c.status === "CONFIRMED" ? `Confirmed${c.confirmedOn ? ` ${formatDate(c.confirmedOn)}` : ""}` : "Bounced"}
            </StatusPill>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/** Confirm a rep's collection: how much actually arrived (never more than recorded). */
function ConfirmRepDialog({ c, onOpenChange, onDone }: { c: Collection | null; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- reset the form for the row just opened. */
    if (c) { setAmount(String(c.amount)); setNote(""); }
  }, [c]);

  const amt = parseFloat(amount) || 0;
  const problem = !c ? null : amt <= 0 ? "Enter the amount that arrived." : amt > c.amount ? `${c.receiptNo} recorded ${formatMoney(c.amount)} — no more than that.` : null;

  async function confirm() {
    if (!c || problem) return;
    setSaving(true);
    try {
      const r = await axios.post<{ message: string }>(`${API_BASE_URL}/accounting/collections/${c.id}/confirm`,
        { amount: amt, note: note.trim() || null }, { headers: authHeader() });
      toast.success("Collection confirmed", { description: r.data.message });
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error("Not confirmed", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={c !== null} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Confirm {c?.receiptNo}</DialogTitle>
          <DialogDescription>
            {c?.collectedBy} recorded {formatMoney(c?.amount ?? 0)} from {c?.customerName}. How much actually arrived?
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div>
            <Label className="mb-1.5 block">Amount confirmed</Label>
            <Input type="number" inputMode="decimal" min={0} step="0.01" autoFocus className="text-right tabular text-lg font-semibold"
              value={amount} onChange={(e) => setAmount(e.target.value)} />
            {c && amt > 0 && amt < c.amount && (
              <p className="mt-1 text-2xs text-warning-dark dark:text-warning-light">{formatMoney(c.amount - amt)} short — the orders it covers are trimmed to match.</p>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block">Note</Label>
            <Textarea rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </div>
          <p className="text-2xs text-slate-500">Confirming posts a receipt to the customer&apos;s account at once — his balance drops by this amount.</p>
        </DialogBody>
        <DialogFooter className="items-center">
          {problem && <p className="mr-auto text-xs text-danger">{problem}</p>}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="accent" onClick={() => void confirm()} disabled={!!problem || saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />} Confirm {amt > 0 ? formatMoney(amt) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
