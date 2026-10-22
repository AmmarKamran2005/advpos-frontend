"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { AlertCircle, ArrowLeft, Loader2, Minus, Plus, Search, Send, ShoppingCart, Trash2, User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ProductImage } from "@/components/products/product-image";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { apiMessage } from "@/components/ledgers/ledger-kit";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   THE ORDER DESK TAKES AN ORDER -- for any customer, on behalf of the
   salesperson it belongs to (the owner, 26 September).

   Two boxes that fill each other, like Packing's: pick the SALESPERSON and
   their customers come first in the customer list; pick the CUSTOMER first
   and, when they belong to exactly one rep, that rep fills itself in. Any
   customer may be chosen -- a shop nobody has been assigned to is still a
   customer -- but the order always names a rep, and the API refuses one that
   does not (SalesController.ValidateOrderRequest).

   The rate is FIXED at the product's selling price; a margin of 0-10% may be
   added on top, the same rule a salesperson has, checked again by the API.
   No cost, no limit, no balance anywhere on this screen -- GET
   /packing/order-lookups does not send them.
   ─────────────────────────────────────────────────────────────────────────── */

type Rep = { id: number; name: string };
type Customer = { id: number; code: string; name: string; city: string; phone: string | null; repIds: number[] };
type Method = { id: number; key: string; name: string };
type Product = {
  id: number; sku: string; name: string; packing: number; salePrice: number;
  taxRatePercent: number; imageUrl: string | null; stock: number;
};
type Lookups = { salesPeople: Rep[]; customers: Customer[]; methods: Method[]; products: Product[]; maxMarginPercent: number };
type Line = { product: Product; qty: number; marginText: string };

export default function OrderDeskNewOrderPage() {
  const router = useRouter();
  const [lk, setLk] = React.useState<Lookups | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [repId, setRepId] = React.useState<number | "">("");
  const [customerId, setCustomerId] = React.useState<number | "">("");
  const [methodId, setMethodId] = React.useState<number>(0);
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>([]);
  const [custOpen, setCustOpen] = React.useState(false);
  const [prodOpen, setProdOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    axios.get<Lookups>(`${API_BASE_URL}/packing/order-lookups`, { headers: authHeader() })
      .then((r) => {
        setLk(r.data);
        setMethodId(r.data.methods.find((m) => m.key === "CREDIT")?.id ?? r.data.methods[0]?.id ?? 0);
      })
      .catch((e) => setError(apiMessage(e, "Could not load the order form.")));
  }, []);

  const maxMargin = lk?.maxMarginPercent ?? 10;
  const customer = lk?.customers.find((c) => c.id === customerId) ?? null;
  const rep = lk?.salesPeople.find((r) => r.id === repId) ?? null;

  function pickCustomer(c: Customer) {
    setCustomerId(c.id);
    setCustOpen(false);
    /* The reverse fill: set the rep only when there is exactly one to set,
       and never over a rep somebody already chose. */
    if (repId === "" && c.repIds.length === 1) setRepId(c.repIds[0]);
  }

  function addProduct(p: Product) {
    setProdOpen(false);
    setLines((cur) => cur.some((l) => l.product.id === p.id)
      ? cur.map((l) => l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l)
      : [...cur, { product: p, qty: 1, marginText: "" }]);
  }

  const priced = lines.map((l) => {
    const m = Math.min(maxMargin, Math.max(0, Number(l.marginText) || 0));
    const rate = Math.round(l.product.salePrice * (1 + m / 100) * 100) / 100;
    return { ...l, margin: m, rate, total: Math.round(rate * l.qty * 100) / 100 };
  });
  const total = priced.reduce((s, l) => s + l.total, 0);
  const units = priced.reduce((s, l) => s + l.qty, 0);

  async function submit() {
    if (repId === "") { toast.error("Pick the salesperson this order belongs to."); return; }
    if (customerId === "") { toast.error("Pick the customer."); return; }
    if (priced.length === 0) { toast.error("Add at least one item."); return; }
    setSaving(true);
    try {
      const res = await axios.post<{ id: number; orderNo: string; message: string; onCreditHold: boolean }>(`${API_BASE_URL}/sales/orders`, {
        customerId, salesPersonUserId: repId, methodId, notes: notes.trim() || null,
        saveAsDraft: false, raiseInvoice: false,
        lines: priced.map((l) => ({
          productId: l.product.id, qty: l.qty, rate: l.rate, discountPercent: 0, taxPercent: l.product.taxRatePercent,
        })),
      }, { headers: authHeader() });
      (res.data.onCreditHold ? toast.warning : toast.success)(res.data.orderNo, { description: res.data.message });
      router.push(`/packing/orders/${res.data.id}`);
    } catch (e) {
      toast.error("Order not saved", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="size-8 text-danger mx-auto mb-2" />
        <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
      </Card>
    );
  }
  if (!lk) return <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-40" /></div>;

  const mine = repId === "" ? [] : lk.customers.filter((c) => c.repIds.includes(repId));
  const others = repId === "" ? lk.customers : lk.customers.filter((c) => !c.repIds.includes(repId));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Packing", href: "/packing" }, { label: "New order" }]}
        title="New order"
        subtitle="Taken by the order desk, for a salesperson's customer."
        actions={<Button variant="ghost" size="md" className="gap-1.5" asChild><Link href="/packing"><ArrowLeft />Packing</Link></Button>}
      />

      <div className="space-y-4 pb-28">
        <Card>
          <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label required>Salesperson</Label>
              <SelectNative value={repId === "" ? "" : String(repId)} className="mt-1"
                onChange={(e) => setRepId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">Pick the salesperson…</option>
                {lk.salesPeople.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </SelectNative>
            </div>
            <div>
              <Label required>Customer</Label>
              <Popover open={custOpen} onOpenChange={setCustOpen}>
                <PopoverTrigger asChild>
                  <button type="button"
                    className="mt-1 w-full flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-3 h-9 text-sm hover:border-brand-yellow focus:outline-none focus:ring-2 focus:ring-brand-yellow">
                    <span className={cn("truncate text-left", !customer && "text-slate-400")}>
                      {customer ? `${customer.name} · ${customer.code}` : "Search the customer…"}
                    </span>
                    <Search className="size-4 text-slate-400 shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(94vw,28rem)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Name, code or city…" />
                    <CommandList className="max-h-[60vh]">
                      <CommandEmpty>No customer by that name.</CommandEmpty>
                      {mine.length > 0 && (
                        <CommandGroup heading={`${rep?.name}'s customers`}>
                          {mine.map((c) => <CustomerItem key={c.id} c={c} onPick={pickCustomer} />)}
                        </CommandGroup>
                      )}
                      <CommandGroup heading={repId === "" ? "Every customer" : "Other customers"}>
                        {others.map((c) => <CustomerItem key={c.id} c={c} onPick={pickCustomer} />)}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {customer && repId !== "" && !customer.repIds.includes(repId) && (
                <p className="text-2xs text-warning-dark dark:text-warning-light mt-1">
                  {customer.repIds.length === 0 ? "No salesperson is assigned to this shop" : "This shop is usually another salesperson's"} -- the order will be {rep?.name}&apos;s.
                </p>
              )}
            </div>
            <div>
              <Label>Payment</Label>
              <SelectNative value={methodId} onChange={(e) => setMethodId(Number(e.target.value))} className="mt-1">
                {lk.methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </SelectNative>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the office should know" className="mt-1" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Items</h3>
              <Popover open={prodOpen} onOpenChange={setProdOpen}>
                <PopoverTrigger asChild>
                  <Button variant="accent" size="md" className="gap-1.5"><Plus />Add item</Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(94vw,32rem)] p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Item name or code…" />
                    <CommandList className="max-h-[65vh]">
                      <CommandEmpty>No item by that name.</CommandEmpty>
                      <CommandGroup>
                        {lk.products.map((p) => (
                          <CommandItem key={p.id} value={`${p.name} ${p.sku}`} onSelect={() => addProduct(p)} className="gap-3 py-2">
                            <ProductImage url={p.imageUrl} name={p.name} size="md" zoom={false} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-navy-900 dark:text-white line-clamp-2">{p.name}</div>
                              <div className="text-2xs tabular text-slate-500 mt-0.5">{p.sku} · {p.stock} in stock</div>
                            </div>
                            <div className="tabular text-sm font-bold text-navy-900 dark:text-white shrink-0">{formatMoney(p.salePrice)}</div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {priced.length === 0 ? (
              <div className="text-center py-10 text-sm text-slate-500 dark:text-slate-400">
                <ShoppingCart className="size-8 mx-auto mb-2 text-slate-300" />
                No items yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {priced.map((l, i) => (
                  <li key={l.product.id} className="p-2.5 rounded-lg border border-slate-200 dark:border-navy-700">
                    <div className="flex items-start gap-3">
                      <ProductImage url={l.product.imageUrl} name={l.product.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-navy-900 dark:text-white line-clamp-2">{l.product.name}</div>
                        <div className="text-2xs tabular text-slate-500 mt-0.5">
                          {l.product.sku} · rate {formatMoney(l.product.salePrice)} · {l.product.stock} in stock
                        </div>
                      </div>
                      <button type="button" aria-label="Remove" onClick={() => setLines((cur) => cur.filter((_, j) => j !== i))}
                        className="text-slate-400 hover:text-danger p-1"><Trash2 className="size-4" /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 items-end">
                      <div>
                        <Label className="text-2xs">Qty</Label>
                        <div className="flex items-center mt-1 rounded-lg border border-slate-200 dark:border-navy-700 h-9 overflow-hidden">
                          <button type="button" className="px-2 h-full text-slate-500" aria-label="Less"
                            onClick={() => setLines((cur) => cur.map((x, j) => j === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x))}><Minus className="size-3.5" /></button>
                          <input value={l.qty} inputMode="numeric" aria-label="Quantity"
                            onChange={(e) => { const n = Math.max(1, Math.floor(Number(e.target.value) || 1)); setLines((cur) => cur.map((x, j) => j === i ? { ...x, qty: n } : x)); }}
                            className="w-full min-w-0 text-center tabular text-sm bg-transparent outline-none" />
                          <button type="button" className="px-2 h-full text-slate-500" aria-label="More"
                            onClick={() => setLines((cur) => cur.map((x, j) => j === i ? { ...x, qty: x.qty + 1 } : x))}><Plus className="size-3.5" /></button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-2xs">Margin % (0–{maxMargin})</Label>
                        <Input value={lines[i].marginText} inputMode="decimal" placeholder="0" className="mt-1 tabular text-center"
                          onChange={(e) => setLines((cur) => cur.map((x, j) => j === i ? { ...x, marginText: e.target.value } : x))}
                          onBlur={() => setLines((cur) => cur.map((x, j) => j === i ? { ...x, marginText: x.marginText === "" ? "" : String(Math.min(maxMargin, Math.max(0, Number(x.marginText) || 0))) } : x))} />
                      </div>
                      <div className="text-right">
                        <div className="text-2xs text-slate-500">{formatMoney(l.rate, { decimals: l.rate % 1 ? 2 : 0 })} each</div>
                        <div className="tabular text-base font-bold text-navy-900 dark:text-white">{formatMoney(l.total)}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Sticky footer on a phone: the total and the one button. */}
      <div className="fixed bottom-0 inset-x-0 lg:left-auto lg:right-6 lg:bottom-6 lg:w-[26rem] z-30 bg-white dark:bg-navy-800 border-t lg:border lg:rounded-xl border-slate-200 dark:border-navy-700 shadow-elevated px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-2xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
              <User className="size-3" />{rep?.name ?? "No salesperson"} · {priced.length} item{priced.length === 1 ? "" : "s"}, {units} pcs
            </div>
            <div className="tabular text-lg font-bold text-navy-900 dark:text-white">{formatMoney(total)}</div>
          </div>
          <Button variant="accent" size="lg" className="gap-1.5" disabled={saving} onClick={() => void submit()}>
            {saving ? <Loader2 className="animate-spin" /> : <Send />} Submit order
          </Button>
        </div>
      </div>
    </>
  );
}

function CustomerItem({ c, onPick }: { c: Customer; onPick: (c: Customer) => void }) {
  return (
    <CommandItem value={`${c.name} ${c.code} ${c.city}`} onSelect={() => onPick(c)} className="py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{c.name}</div>
        <div className="text-2xs text-slate-500 truncate">{c.code} · {c.city.replace(" - Pakistan", "")}</div>
      </div>
    </CommandItem>
  );
}
