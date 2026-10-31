"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Save, Loader2, Banknote, Landmark, Check, AlertCircle } from "lucide-react";
import { usePageRefresh } from "@/lib/page-refresh";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   NEW PAYMENT COLLECTION -- as few inputs as the job allows (the owner, 1 Nov)

   1. Customer   -- a dropdown of the rep's customers who owe on an invoiced order
   2. Order      -- a dropdown of that customer's open orders; the items and what
                    is still owed show underneath
   3. Amount     -- filled in with everything that can be collected
   4. Paid by    -- Cash or Bank, two buttons. Bank asks the bank's name and the
                    transaction / cheque number (and the cheque date if a cheque).

   Saved as "Awaiting confirmation": the Super Admin and the accountant are told
   at once, and the accountant confirms it into the right account.
   POST /sales/collections (SalesCollectionsController.Record).
   ─────────────────────────────────────────────────────────────────────────── */

type Customer = { id: number; name: string; code: string; city: string | null; openOrders: number; owed: number; awaiting: number };
type Line = { name: string; qty: number; rate: number; total: number };
type Order = {
  id: number; orderNo: string; invoiceNo: string; invoiceDate: string; dueDate: string;
  total: number; received: number; awaiting: number; balance: number; collectable: number; lines: Line[];
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function NewCollectionPage() {
  const router = useRouter();

  const [customers, setCustomers] = React.useState<Customer[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [customerId, setCustomerId] = React.useState(0);
  const [orders, setOrders] = React.useState<Order[] | null>(null);
  const [orderId, setOrderId] = React.useState(0);

  const [amount, setAmount] = React.useState("");
  const [paidBy, setPaidBy] = React.useState<"CASH" | "BANK">("CASH");
  const [bankName, setBankName] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [isCheque, setIsCheque] = React.useState(false);
  const [chequeDate, setChequeDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const loadCustomers = React.useCallback(async () => {
    try {
      const res = await axios.get<{ items: Customer[] }>(`${API_BASE_URL}/sales/collections/customers`, { headers: authHeader() });
      setCustomers(res.data.items);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load your customers."));
    }
  }, []);

  usePageRefresh(loadCustomers);   // the top bar's Refresh button -- lib/page-refresh.ts

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void loadCustomers();
  }, [loadCustomers]);

  /* Picking a customer loads their open orders, and picks the oldest. */
  React.useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       clearing the previous customer's orders while the next load runs. */
    setOrders(null);
    axios.get<{ items: Order[] }>(`${API_BASE_URL}/sales/collections/customers/${customerId}/orders`, { headers: authHeader() })
      .then((res) => {
        if (cancelled) return;
        setOrders(res.data.items);
        const first = res.data.items[0];
        setOrderId(first?.id ?? 0);
        setAmount(first ? String(first.collectable) : "");
      })
      .catch((e) => { if (!cancelled) { setOrders([]); toast.error(apiMessage(e, "Could not load the orders.")); } });
    return () => { cancelled = true; };
  }, [customerId]);

  const customer = customers?.find((c) => c.id === customerId) ?? null;
  const order = orders?.find((o) => o.id === orderId) ?? null;
  const amt = Number.parseFloat(amount) || 0;

  const problem =
    !customerId ? "Pick the customer."
    : !order ? "Pick the order the money is for."
    : amt <= 0 ? "Enter the amount collected."
    : amt > order.collectable ? `At most ${formatMoney(order.collectable)} can be collected on ${order.orderNo}.`
    : paidBy === "BANK" && !bankName.trim() ? "Enter the bank the customer paid from."
    : paidBy === "BANK" && !reference.trim() ? "Enter the transaction or cheque number."
    : paidBy === "BANK" && isCheque && !chequeDate ? "Enter the cheque date."
    : null;

  async function save() {
    if (problem || !order) { if (problem) toast.error(problem); return; }
    setSaving(true);
    try {
      const res = await axios.post<{ message: string }>(`${API_BASE_URL}/sales/collections`, {
        orderId: order.id,
        amount: amt,
        paidBy,
        bankName: paidBy === "BANK" ? bankName.trim() : null,
        referenceNo: paidBy === "BANK" ? reference.trim() : null,
        chequeDate: paidBy === "BANK" && isCheque ? chequeDate : null,
        note: note.trim() || null,
      }, { headers: authHeader() });
      toast.success("Collection recorded", { description: res.data.message });
      router.push("/sales/collections");
    } catch (e) {
      toast.error("Not saved", { description: apiMessage(e, "Please try again.") });
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Payment Collection", href: "/sales/collections" }, { label: "New" }]}
        title="New Collection"
        subtitle="Record money a customer paid you."
        actions={
          <Button variant="ghost" size="md" asChild>
            <Link href="/sales/collections"><ArrowLeft />Back</Link>
          </Button>
        }
      />

      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5 max-w-3xl">
          <CardBody className="flex items-center gap-2 text-sm text-danger">
            <AlertCircle className="size-4" />{error}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void loadCustomers()}>Try again</Button>
          </CardBody>
        </Card>
      )}

      <div className="max-w-3xl space-y-4">
        {/* ── 1 + 2: who and which order ── */}
        <Card>
          <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Customer <span className="text-danger">*</span></Label>
              {!customers ? <Skeleton className="h-9" /> : (
                <SelectNative value={customerId || ""} onChange={(e) => { setCustomerId(Number(e.target.value)); setOrderId(0); setOrders(null); setAmount(""); }}>
                  <option value="">{customers.length === 0 ? "No customer owes anything" : "Choose customer…"}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} · {c.code} — owes {formatMoney(c.owed)}</option>
                  ))}
                </SelectNative>
              )}
            </div>
            <div>
              <Label className="mb-1.5 block">Order <span className="text-danger">*</span></Label>
              {customerId && !orders ? <Skeleton className="h-9" /> : (
                <SelectNative value={orderId || ""} disabled={!customerId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setOrderId(id);
                    setAmount(String(orders?.find((o) => o.id === id)?.collectable ?? ""));
                  }}>
                  <option value="">{!customerId ? "Pick a customer first" : orders?.length === 0 ? "No open order" : "Choose order…"}</option>
                  {(orders ?? []).map((o) => (
                    <option key={o.id} value={o.id}>{o.orderNo} · {o.invoiceNo} — {formatMoney(o.collectable)} due</option>
                  ))}
                </SelectNative>
              )}
            </div>
          </CardBody>
        </Card>

        {/* ── what the order is ── */}
        {order && customer && (
          <Card>
            <div className="px-4 pt-4 pb-2 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-navy-900 dark:text-white">{customer.name}</div>
                <div className="text-2xs text-slate-500 dark:text-slate-400">
                  <span className="tabular">{order.orderNo}</span> · invoice <span className="tabular">{order.invoiceNo}</span>
                  {" "}of {formatDate(order.invoiceDate)} · due {formatDate(order.dueDate)}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[32rem]">
                <thead className="bg-slate-50 dark:bg-navy-800 text-2xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Item</th>
                    <th className="px-2 py-2 text-right w-16">Qty</th>
                    <th className="px-2 py-2 text-right w-28">Rate</th>
                    <th className="px-4 py-2 text-right w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((l, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-navy-700">
                      <td className="px-4 py-2 text-navy-900 dark:text-white">{l.name}</td>
                      <td className="px-2 py-2 text-right tabular">{l.qty}</td>
                      <td className="px-2 py-2 text-right tabular text-slate-600 dark:text-slate-300">{formatMoney(l.rate)}</td>
                      <td className="px-4 py-2 text-right tabular font-medium text-navy-900 dark:text-white">{formatMoney(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CardBody className="border-t border-slate-200 dark:border-navy-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Figure label="Invoice total" value={formatMoney(order.total)} />
              <Figure label="Received" value={formatMoney(order.received)} tone="text-success" />
              <Figure label="Waiting to confirm" value={formatMoney(order.awaiting)} tone="text-warning-dark dark:text-warning-light" />
              <Figure label="Can collect" value={formatMoney(order.collectable)} strong />
            </CardBody>
          </Card>
        )}

        {/* ── 3 + 4: how much and how ── */}
        <Card>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Amount collected (PKR) <span className="text-danger">*</span></Label>
                <div className="flex gap-2">
                  <Input type="number" inputMode="decimal" min={0} step="0.01" className="text-right tabular font-semibold"
                    value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!order} />
                  <Button type="button" variant="secondary" size="md" disabled={!order}
                    onClick={() => order && setAmount(String(order.collectable))}>Full</Button>
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">Paid by <span className="text-danger">*</span></Label>
                <div className="grid grid-cols-2 gap-2">
                  {([["CASH", "Cash", Banknote], ["BANK", "Bank", Landmark]] as const).map(([key, label, Icon]) => (
                    <button key={key} type="button" onClick={() => setPaidBy(key)}
                      className={cn(
                        "h-9 rounded-lg border-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                        paidBy === key
                          ? "border-brand-yellow bg-brand-yellow/5 text-navy-900 dark:text-white"
                          : "border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 hover:border-brand-yellow/40"
                      )}>
                      <Icon className="size-4" />{label}
                      {paidBy === key && <Check className="size-3.5 text-brand-yellow" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {paidBy === "BANK" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block">Customer&apos;s bank <span className="text-danger">*</span></Label>
                  <Input value={bankName} maxLength={60} placeholder="e.g. HBL, Meezan, UBL" onChange={(e) => setBankName(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1.5 block">{isCheque ? "Cheque number" : "Transaction / slip number"} <span className="text-danger">*</span></Label>
                  <Input value={reference} maxLength={50} onChange={(e) => setReference(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input type="checkbox" className="size-4 accent-brand-yellow" checked={isCheque} onChange={(e) => setIsCheque(e.target.checked)} />
                  Paid by cheque
                </label>
                {isCheque && (
                  <div>
                    <Label className="mb-1.5 block">Cheque date <span className="text-danger">*</span></Label>
                    <Input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
                  </div>
                )}
              </div>
            )}

            <div>
              <Label className="mb-1.5 block">Note</Label>
              <Textarea rows={2} maxLength={300} value={note} placeholder="Optional" onChange={(e) => setNote(e.target.value)} />
            </div>
          </CardBody>
          <CardBody className="border-t border-slate-200 dark:border-navy-700 flex flex-wrap items-center justify-between gap-3">
            <p className={cn("text-xs", problem ? "text-slate-500 dark:text-slate-400" : "text-success")}>
              {problem ?? "Ready. The accountant and the Super Admin will be told at once."}
            </p>
            <Button variant="accent" size="md" className="gap-1.5" onClick={() => void save()} disabled={!!problem || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save />}
              Record {amt > 0 ? formatMoney(amt) : "collection"}
            </Button>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Figure({ label, value, tone, strong }: { label: string; value: string; tone?: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cn("tabular mt-0.5", strong ? "text-base font-bold text-navy-900 dark:text-white" : "font-semibold", tone)}>{value}</div>
    </div>
  );
}
