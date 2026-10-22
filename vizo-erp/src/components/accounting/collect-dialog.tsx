"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { Check, Loader2, BookOpen, Receipt, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate } from "@/lib/format";
import { todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   COLLECT ON AN ORDER — the Confirm Collections modal (27 Sep)

   The owner: open a row, and a modal asks how much is being collected and
   confirmed now; confirming writes it to the customer's account so that his
   ledger shows what he has paid and what he still owes, debit and credit.

   GET  /accounting/collections/orders/{id}  -> the order, its receipts, the
                                               customer's account, the ways in
   POST /accounting/collections/collect      -> a confirmed collection + a posted
                                               receipt voucher (Dr cash/bank,
                                               Cr the customer), allocated to
                                               the order's invoice
   ─────────────────────────────────────────────────────────────────────────── */

type OrderRow = {
  id: number; orderNo: string; statusName: string; customerId: number; customerName: string; customerCode: string;
  salesPerson: string | null; invoiceNo: string; invoiceDate: string; dueDate: string;
  total: number; received: number; awaiting: number; balance: number; paymentStatus: string; daysOverdue: number;
};
type Detail = {
  order: OrderRow;
  receipts: { id: number; receiptNo: string; date: string; amount: number; method: string; status: string; statusName: string; collectedBy: string; voucherNo: string | null; reference: string | null }[];
  account: { code: string; name: string; opening: number; billed: number; paid: number; balance: number; creditLimit: number };
  methods: { id: number; key: string; name: string; account: string; needsReference: boolean; isCheque: boolean }[];
  /** Every active Cash & Bank account in the chart (2 Oct) -- what money is received INTO. */
  accounts: { id: number; code: string; name: string; isCash: boolean }[];
  collectors: { id: number; name: string; role: string }[];
  defaultCollectorId: number | null;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) return (e.response.data as { message?: string })?.message ?? fallback;
  return "Cannot reach the server.";
}

export function CollectDialog({ orderId, open, onOpenChange, onDone }: {
  orderId: number | null; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void;
}) {
  const [d, setD] = React.useState<Detail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [amount, setAmount] = React.useState("");
  const [accountId, setAccountId] = React.useState("");
  const [byCheque, setByCheque] = React.useState(false);
  const [date, setDate] = React.useState(todayISO());
  const [collector, setCollector] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [bank, setBank] = React.useState("");
  const [chequeDate, setChequeDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !orderId) return;
    let alive = true;
    /* eslint-disable react-hooks/set-state-in-effect -- load-on-open, axios in the component, as everywhere here. */
    setD(null); setError(null); setReference(""); setBank(""); setChequeDate(""); setNote(""); setDate(todayISO()); setByCheque(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    axios.get<Detail>(`${API_BASE_URL}/accounting/collections/orders/${orderId}`, { headers: authHeader() })
      .then((r) => {
        if (!alive) return;
        setD(r.data);
        setAmount(String(r.data.order.balance));
        setAccountId(String(r.data.accounts[0]?.id ?? ""));
        setCollector(String(r.data.defaultCollectorId ?? r.data.collectors[0]?.id ?? ""));
      })
      .catch((e) => alive && setError(apiMessage(e, "Could not load this order.")));
    return () => { alive = false; };
  }, [open, orderId]);

  /* RECEIVED INTO AN ACCOUNT FROM THE CHART (the owner, 2 Oct). The list used
     to be a fixed set of payment methods (Cash, Bank, Easypaisa, JazzCash ...);
     it is now every Cash & Bank account on the Account List, so a bank added
     there can be picked here at once. A non-cash account needs a reference;
     a cheque is a tick, not a separate "method". */
  const account = d?.accounts.find((a) => String(a.id) === accountId);
  const needsReference = Boolean(account && !account.isCash);
  const isCheque = needsReference && byCheque;
  const amt = parseFloat(amount) || 0;
  const left = d ? Math.max(0, d.order.balance - amt) : 0;
  const pctPaid = d && d.order.total > 0 ? Math.min(100, ((d.order.received + amt) / d.order.total) * 100) : 0;
  const pctBefore = d && d.order.total > 0 ? Math.min(100, (d.order.received / d.order.total) * 100) : 0;
  const problem =
    !d ? null
    : amt <= 0 ? "Enter the amount received."
    : amt > d.order.balance + 0.001 ? `This order only owes ${formatMoney(d.order.balance)}.`
    : !account ? "Pick the account the money went into."
    : needsReference && !reference.trim() ? `Money into ${account.name} needs its reference number.`
    : date > todayISO() ? "The date cannot be in the future."
    : null;

  async function confirm() {
    if (!d || problem) return;
    setSaving(true);
    try {
      const r = await axios.post<{ message: string; balance: number }>(`${API_BASE_URL}/accounting/collections/collect`, {
        orderId: d.order.id, amount: amt, depositAccountId: Number(accountId), byCheque: isCheque, collectedOn: date,
        collectedByUserId: collector ? Number(collector) : null,
        referenceNo: reference.trim() || null, bankName: bank.trim() || null,
        chequeDate: isCheque && chequeDate ? chequeDate : null, note: note.trim() || null,
      }, { headers: authHeader() });
      toast.success("Collection confirmed", { description: r.data.message });
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error("Not saved", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Collect & confirm</DialogTitle>
          <DialogDescription>
            How much is being received now? Confirming posts it to the customer&apos;s account straight away.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error ? <p className="text-sm text-danger">{error}</p> : !d ? (
            <div className="py-12 text-center"><Loader2 className="inline size-5 animate-spin text-slate-400" /></div>
          ) : (
            <>
              {/* The order, and how much of it is paid */}
              <div className="rounded-xl border border-slate-200 p-4 dark:border-navy-700">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-navy-900 dark:text-white">{d.order.customerName}</div>
                    <div className="text-xs text-slate-500">
                      {d.order.orderNo} · {d.order.invoiceNo} · {d.order.statusName}
                      {d.order.salesPerson && <> · {d.order.salesPerson}</>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xs uppercase tracking-wider text-slate-500">Owed on this order</div>
                    <div className="tabular text-xl font-bold text-navy-900 dark:text-white">{formatMoney(d.order.balance)}</div>
                    {d.order.daysOverdue > 0 && <Badge variant="danger">{d.order.daysOverdue} days overdue</Badge>}
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-navy-700">
                  <div className="flex h-full">
                    <div className="h-full bg-success transition-all duration-500" style={{ width: `${pctBefore}%` }} />
                    <div className="h-full bg-brand-yellow transition-all duration-500" style={{ width: `${Math.max(0, pctPaid - pctBefore)}%` }} />
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-2xs text-slate-500 tabular">
                  <span>Invoice {formatMoney(d.order.total)} · received {formatMoney(d.order.received)}</span>
                  <span>After this: {left <= 0 ? <span className="font-semibold text-success">paid in full</span> : <>{formatMoney(left)} left</>}</span>
                </div>
                {d.order.awaiting > 0 && (
                  <p className="mt-2 text-2xs text-warning-dark dark:text-warning-light">
                    A rep has recorded {formatMoney(d.order.awaiting)} on this order that is not confirmed yet — see the Rep collections tab.
                  </p>
                )}
              </div>

              {/* The form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">Amount received now <span className="text-danger">*</span></Label>
                  <div className="flex flex-wrap gap-2">
                    <Input type="number" inputMode="decimal" min={0} step="0.01" autoFocus
                      className="max-w-56 text-right tabular text-lg font-semibold"
                      value={amount} onChange={(e) => setAmount(e.target.value)} />
                    <Button type="button" size="sm" variant="secondary" className="h-10" onClick={() => setAmount(String(d.order.balance))}>Full</Button>
                    <Button type="button" size="sm" variant="secondary" className="h-10" onClick={() => setAmount(String(Math.round(d.order.balance / 2)))}>Half</Button>
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block">Received into <span className="text-danger">*</span></Label>
                  <SelectNative value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                    {d.accounts.length === 0 && <option value="">No Cash &amp; Bank account in the chart</option>}
                    {d.accounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
                  </SelectNative>
                  {account && !account.isCash && (
                    <label className="mt-1.5 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <input type="checkbox" className="size-4 accent-brand-yellow" checked={byCheque}
                        onChange={(e) => setByCheque(e.target.checked)} />
                      Paid by cheque
                    </label>
                  )}
                </div>
                <div>
                  <Label className="mb-1.5 block">Received on</Label>
                  <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
                </div>
                {needsReference && (
                  <>
                    <div>
                      <Label className="mb-1.5 block">{isCheque ? "Cheque no." : "Transaction / slip no."} <span className="text-danger">*</span></Label>
                      <Input value={reference} maxLength={50} onChange={(e) => setReference(e.target.value)} />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Bank / wallet name</Label>
                      <Input value={bank} maxLength={60} onChange={(e) => setBank(e.target.value)} placeholder="Optional" />
                    </div>
                    {isCheque && (
                      <div>
                        <Label className="mb-1.5 block">Cheque date</Label>
                        <Input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
                      </div>
                    )}
                  </>
                )}
                <div>
                  <Label className="mb-1.5 block">Collected by</Label>
                  <SelectNative value={collector} onChange={(e) => setCollector(e.target.value)}>
                    {d.collectors.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.role}</option>)}
                  </SelectNative>
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">Note</Label>
                  <Textarea rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional — printed on the receipt" />
                </div>
              </div>

              {/* The customer's whole account */}
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-navy-900">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 dark:text-white">
                    <Wallet className="size-4" /> {d.account.name} <span className="text-xs font-normal text-slate-500">{d.account.code}</span>
                  </div>
                  <Link href={`/ledgers/customers/${d.order.customerId}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-yellow-700 hover:underline dark:text-brand-yellow">
                    <BookOpen className="size-3.5" /> Open ledger
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <Fig label="Opening" v={d.account.opening} />
                  <Fig label="Billed (Dr)" v={d.account.billed} />
                  <Fig label="Paid (Cr)" v={d.account.paid} />
                  <Fig label="Balance owed" v={d.account.balance} strong
                    after={amt > 0 && !problem ? d.account.balance - amt : undefined} />
                </div>
                {d.account.creditLimit > 0 && (
                  <p className="mt-2 text-2xs text-slate-500">Credit limit {formatMoney(d.account.creditLimit)}</p>
                )}
              </div>

              {d.receipts.length > 0 && (
                <div>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Received on this order</div>
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm dark:divide-navy-700 dark:border-navy-700">
                    {d.receipts.map((r) => (
                      <div key={`${r.id}-${r.receiptNo}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                        <Receipt className="size-3.5 text-slate-400" />
                        <span className="tabular font-medium">{r.receiptNo}</span>
                        <span className="text-xs text-slate-500">{formatDate(r.date)} · {r.method} · {r.collectedBy}{r.voucherNo ? ` · ${r.voucherNo}` : ""}</span>
                        <Badge variant={r.status === "CONFIRMED" ? "success" : r.status === "AWAITING" ? "warning" : "danger"} className="ml-auto">{r.statusName}</Badge>
                        <span className="tabular w-28 text-right font-semibold">{formatMoney(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter className="items-center">
          {problem && d && <p className="mr-auto text-xs text-danger">{problem}</p>}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="accent" onClick={() => void confirm()} disabled={!d || !!problem || saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            Confirm {amt > 0 ? formatMoney(amt) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fig({ label, v, strong, after }: { label: string; v: number; strong?: boolean; after?: number }) {
  return (
    <div className="rounded-lg bg-white px-2.5 py-2 dark:bg-navy-800">
      <div className="text-2xs text-slate-500">{label}</div>
      <div className={cn("tabular text-navy-900 dark:text-white", strong ? "font-bold" : "font-medium")}>{formatMoney(v)}</div>
      {after !== undefined && <div className="tabular text-2xs text-success">→ {formatMoney(after)}</div>}
    </div>
  );
}
