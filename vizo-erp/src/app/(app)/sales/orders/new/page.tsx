"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  AlertCircle, AlertTriangle, FileText, Loader2,
  Minus, Plus, RefreshCw, Save, Search, ShoppingCart, Trash2, X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { DateInput } from "@/components/ui/date-input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProductImage } from "@/components/products/product-image";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader, useSession } from "@/components/providers/session-provider";
import { formatMoney, formatCompact } from "@/lib/format";
import { todayISO, addDaysISO } from "@/lib/dates";
import { landedCost, round2 } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   TAKING AN ORDER, IN ONE SCREEN

   This was a three-step wizard that asked for two things nobody knows when the
   order is written and one thing nobody is allowed to choose:

     "Selling from"  -- which shelf it would go out of, asked on the day the
                        order was taken. It is asked at DISPATCH now, where it
                        is both knowable and consequential: that is the moment
                        the stock comes off (SalesController.SetOrderStatus).
     "Sales rep"     -- a dropdown of everybody. The order belongs to whoever
                        is signed in; the API records that and ignores anything
                        the browser sends.
     Disc % / Tax %  -- per line, typed. The rate is what the shopkeeper agrees
                        and the tax is the product's own rate; neither is a
                        decision for the order screen.

   WHAT REPLACED THE DISCOUNT AND TAX BOXES: the margin, in money and in
   percent, over what the piece cost to land (cost + duty). They are linked --
   type either and the other follows, and both move the RATE, because the rate
   IS landed cost plus margin. Same arithmetic as the product screen, from the
   same file (lib/pricing.ts), so the two can never tell different stories
   about the same item.

   AND THE PICTURES. A rep takes an order by showing the shopkeeper a photo and
   the shopkeeper pointing at it, so the picker leads with the image and every
   line carries its own.
   ─────────────────────────────────────────────────────────────────────────── */

type LookupCustomer = {
  id: number; code: string; name: string; displayName: string | null;
  city: string; phone: string | null;
  creditLimit: number; creditDays: number; holdPolicy: string; outstanding: number;
};

type LookupProduct = {
  id: number; sku: string; name: string; packing: number;
  salePrice: number; costPrice: number; dutyPrice: number;
  taxRatePercent: number; totalStock: number; imageUrl: string | null;
};

type Method = { id: number; key: string; name: string; kind: string };

type Lookups = {
  paymentMethods: Method[];
  receivingMethods: Method[];
  customers: LookupCustomer[];
  products: LookupProduct[];
  defaultTaxPercent: number;
};

/* THE RATE IS FIXED; THE MARGIN IS WHAT A SALESPERSON ADDS.

   The owner, 21 September (second message about this screen):

     Rate    -- fills itself with the selling price the Super Admin set for the
                item, and cannot be edited.
     Margin  -- in rupees, added ON TOP of that rate.
     Margin % -- a percentage OF THAT RATE: Rs. 100 at 10% adds Rs. 10, so the
                piece is sold at Rs. 110.
     The line then shows the final price per piece (rate + margin).

   The base never moves. Typing a margin used to re-derive the rate from the
   landed cost, which is why entering one appeared to shift everything: the two
   boxes were fighting over which of them was the truth. Now there is one fixed
   figure and one added figure, and the final price is their sum.

   Earlier the same day: "salesperson cannot exceed margin percent above 10". That
   stands, and is now measured against the fixed rate. It is the SALES role's --
   the accountant editing at Invoiced/Edit and the Super Admin are not "the
   salesperson" -- and the API enforces the same limits
   (SalesController.ValidateOrderRequest), because a rate that is only locked in
   the browser is a suggestion. A margin cannot be negative: the rate is the
   floor. An item with no selling price on file has nothing to take a percentage
   of, so it is not capped. */
const MAX_SALES_MARGIN_PERCENT = 10;

/** One line on the order, with everything the margin boxes need. */
type Line = {
  productId: number;
  name: string;
  sku: string;
  imageUrl: string | null;
  cost: number;
  duty: number;
  taxPercent: number;
  stock: number;
  qty: number;
  /** The selling price set by the Super Admin. Fixed for the life of the line. */
  base: number;
  /** The FINAL price per piece: base + margin. This is what is sent as the rate. */
  rate: number;
  marginPrice: number;
  marginPercent: number;
  /** What is in the two margin boxes, as typed -- so "0." and an empty box survive. */
  marginPriceText: string;
  marginPercentText: string;
  /** Set when the last thing typed was over the cap and was pulled back to it. */
  capped?: boolean;
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/** What a customer is called everywhere in this project: their display name. */
const shownAs = (c: { name: string; displayName: string | null }) => c.displayName?.trim() || c.name;

export default function NewOrderPage() {
  const router = useRouter();
  const { role } = useSession();
  /* Billing is the back office's since 21 September, so the "invoice it now"
     switch is only drawn for the two roles that may actually do it. */
  const mayInvoice = role === "super-admin" || role === "accountant";
  /* Only a salesperson is held to the margin cap -- see MAX_SALES_MARGIN_PERCENT. */
  const marginCapped = role === "sales";

  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [customerId, setCustomerId] = React.useState(0);
  const [pickCustomer, setPickCustomer] = React.useState(false);
  const [pickProduct, setPickProduct] = React.useState(false);

  const [lines, setLines] = React.useState<Line[]>([]);
  const [methodId, setMethodId] = React.useState(0);
  const [orderDate, setOrderDate] = React.useState(todayISO());
  const [deliveryDate, setDeliveryDate] = React.useState(addDaysISO(todayISO(), 1));
  const [notes, setNotes] = React.useState("");
  const [raiseInvoice, setRaiseInvoice] = React.useState(false);

  const [saving, setSaving] = React.useState<"" | "draft" | "submit">("");

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/sales/lookups`, { headers: authHeader() });
      setLookups(res.data);
      /* Credit by default: an order taken by a rep is on the shop's account
         unless somebody says otherwise. Cash sales go through Counter Sale. */
      const list = res.data.receivingMethods?.length ? res.data.receivingMethods : res.data.paymentMethods;
      setMethodId(list?.find((m) => m.key === "CREDIT")?.id ?? list?.[0]?.id ?? 0);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load your customers and the item list."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const customers = lookups?.customers ?? [];
  const products = lookups?.products ?? [];
  const methods = (lookups?.receivingMethods?.length ? lookups.receivingMethods : lookups?.paymentMethods) ?? [];
  const customer = customers.find((c) => c.id === customerId) ?? null;

  /* The same arithmetic the API runs on the way in: tax on the line, on the
     product's own rate. Nothing is discounted here any more -- a lower price
     IS the discount, and it is typed as the rate. */
  const subtotal = round2(lines.reduce((s, l) => s + l.rate * l.qty, 0));
  const tax = round2(lines.reduce((s, l) => s + l.rate * l.qty * (l.taxPercent / 100), 0));
  const total = round2(subtotal + tax);
  const units = lines.reduce((s, l) => s + l.qty, 0);
  const margin = round2(lines.reduce((s, l) => s + l.marginPrice * l.qty, 0));

  const willExceed = !!customer && customer.creditLimit > 0 && customer.outstanding + total > customer.creditLimit;

  function addProduct(p: LookupProduct) {
    setPickProduct(false);
    setLines((prev) => {
      const at = prev.findIndex((l) => l.productId === p.id);
      if (at >= 0) {
        const copy = [...prev];
        copy[at] = { ...copy[at], qty: copy[at].qty + 1 };
        return copy;
      }
      /* The rate is the selling price the Super Admin set, and margin starts at
         nothing, so the final price is that price. */
      return [...prev, {
        productId: p.id, name: p.name, sku: p.sku, imageUrl: p.imageUrl,
        cost: p.costPrice, duty: p.dutyPrice,
        taxPercent: p.taxRatePercent ?? lookups?.defaultTaxPercent ?? 0,
        stock: p.totalStock, qty: 1,
        base: p.salePrice, rate: p.salePrice,
        marginPrice: 0, marginPercent: 0, marginPriceText: "", marginPercentText: "",
      }];
    });
  }

  /** A quantity changed. */
  function setLine(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  /** A margin box was typed in. `lead` says which one; the other follows, and the base never moves. */
  function setMargin(idx: number, lead: "price" | "percent", text: string) {
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l;

      const typed = parseFloat(text);
      const n = Number.isFinite(typed) && typed > 0 ? typed : 0;     // the rate is the floor

      let rs = lead === "price" ? n : round2((l.base * n) / 100);
      let pct = lead === "percent" ? n : l.base > 0 ? round2((rs / l.base) * 100) : 0;

      /* Over the cap: whichever box was typed in, the answer is the same --
         the most the rep may add. Only where there is a rate to take a
         percentage of. */
      let capped = false;
      if (marginCapped && l.base > 0 && (rs / l.base) * 100 > MAX_SALES_MARGIN_PERCENT) {
        rs = round2((l.base * MAX_SALES_MARGIN_PERCENT) / 100);
        pct = MAX_SALES_MARGIN_PERCENT;
        capped = true;
      }

      const pretty = (v: number) => (v > 0 ? String(v) : "");
      return {
        ...l,
        marginPrice: rs, marginPercent: pct,
        rate: round2(l.base + rs),
        /* The box being typed in keeps exactly what was typed, unless it was
           pulled back to the cap; the other one shows the result. */
        marginPriceText: lead === "price" && !capped ? text : pretty(rs),
        marginPercentText: lead === "percent" && !capped ? text : pretty(pct),
        capped,
      };
    }));
  }

  const problem =
    !customerId ? "Pick the customer."
    : lines.length === 0 ? "Add at least one item."
    : lines.some((l) => l.qty <= 0) ? "Every item needs a quantity."
    : lines.some((l) => l.rate < 0) ? "A rate cannot be negative."
    : marginCapped && lines.some((l) => l.base > 0 && l.marginPercent > MAX_SALES_MARGIN_PERCENT + 0.005)
      ? `Margin cannot be more than ${MAX_SALES_MARGIN_PERCENT}%.`
    : !methodId ? "Pick how this is being paid."
    : null;

  async function save(asDraft: boolean) {
    if (!asDraft && problem) { toast.error(problem); return; }
    if (asDraft && (!customerId || lines.length === 0)) {
      toast.error("Pick a customer and add an item before saving a draft");
      return;
    }

    setSaving(asDraft ? "draft" : "submit");
    try {
      const res = await axios.post<{
        id: number; orderNo: string; onCreditHold: boolean;
        invoiceNo: string | null; message: string;
      }>(`${API_BASE_URL}/sales/orders`, {
        customerId,
        methodId,
        orderDate,
        deliveryDate,
        notes: notes.trim() || null,
        saveAsDraft: asDraft,
        raiseInvoice: asDraft ? false : raiseInvoice,
        lines: lines.map((l) => ({
          productId: l.productId,
          qty: l.qty,
          rate: l.rate,
          discountPercent: 0,
          /* The product's own rate, carried from the catalogue rather than
             typed: the box is gone from the form, the tax is not. */
          taxPercent: l.taxPercent,
        })),
      }, { headers: authHeader() });

      if (res.data.onCreditHold) toast.warning("Order placed on credit hold", { description: res.data.message });
      else toast.success(`Order ${res.data.orderNo} ${asDraft ? "saved as draft" : "submitted"}`, {
        description: res.data.message,
      });
      router.push(`/sales/orders/${res.data.id}`);
    } catch (e) {
      toast.error(asDraft ? "Draft not saved" : "Order not created", {
        description: apiMessage(e, "Please try again."),
      });
      setSaving("");
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Orders", href: "/sales/orders" }, { label: "New Order" }]}
        title="New Sales Order"
        subtitle="Pick the shop, add what they want, send it in."
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/sales/orders"><X />Cancel</Link></Button>
            <Button variant="secondary" onClick={() => void save(true)} disabled={saving !== "" || loading}>
              {saving === "draft" ? <><Loader2 className="size-4 animate-spin" />Saving…</> : "Save as draft"}
            </Button>
            <Button variant="accent" className="hidden sm:inline-flex" onClick={() => void save(false)}
              disabled={saving !== "" || loading || Boolean(problem)}>
              {saving === "submit"
                ? <><Loader2 className="size-4 animate-spin" />Sending…</>
                : raiseInvoice ? <><FileText />Submit &amp; invoice</> : <><Save />Submit order</>}
            </Button>
          </>
        }
      />

      {error && (
        <Card className="mb-6 border-danger/40">
          <CardBody className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" />Try again
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24 sm:pb-0">
        <div className="lg:col-span-2 space-y-6">
          {/* ── 1. THE SHOP ──────────────────────────────────────────── */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">
                Customer <span className="text-danger">*</span>
              </h3>

              {loading ? <Skeleton className="h-16" /> : customer ? (
                <div className="flex items-center justify-between gap-3 p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar initials={shownAs(customer).slice(0, 2).toUpperCase()} size="md" />
                    <div className="min-w-0">
                      {/* THE DISPLAY NAME, whole and not cut short: it carries
                          the shop and the market, which is how the rep knows
                          which of four Ahmeds this is. */}
                      <div className="font-semibold text-navy-900 dark:text-white break-words">
                        {shownAs(customer)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {customer.code} · {customer.city}
                        {customer.creditDays > 0 && ` · NET ${customer.creditDays}`}
                      </div>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="shrink-0"
                    onClick={() => setCustomerId(0)}>Change</Button>
                </div>
              ) : (
                <Popover open={pickCustomer} onOpenChange={setPickCustomer}>
                  <PopoverTrigger asChild>
                    <button type="button"
                      className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 text-left hover:border-brand-yellow transition-colors">
                      <Search className="size-4 inline-block mr-2" />
                      Search {customers.length} customer{customers.length === 1 ? "" : "s"}…
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(92vw,34rem)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Shop name, code or city…" />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup heading="Your customers">
                          {customers.map((c) => (
                            <CommandItem key={c.id} value={`${shownAs(c)} ${c.name} ${c.code} ${c.city}`}
                              onSelect={() => { setCustomerId(c.id); setPickCustomer(false); }}>
                              <Avatar initials={shownAs(c).slice(0, 2).toUpperCase()} size="sm" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-navy-900 dark:text-white break-words">
                                  {shownAs(c)}
                                </div>
                                <div className="text-2xs text-slate-500 dark:text-slate-400">{c.code} · {c.city}</div>
                              </div>
                              {c.creditLimit > 0 && (
                                <Badge variant="muted" className="text-2xs tabular ml-auto shrink-0">
                                  Limit {formatCompact(c.creditLimit, false)}
                                </Badge>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </CardBody>
          </Card>

          {/* ── 2. THE ITEMS ─────────────────────────────────────────── */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white">
                    Items <span className="text-danger">*</span>
                    {lines.length > 0 && <span className="text-slate-400 font-normal"> · {lines.length}</span>}
                  </h3>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Rate is what the shop pays. The margin is over cost and duty.
                  </p>
                </div>

                <Popover open={pickProduct} onOpenChange={setPickProduct}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="accent" size="sm" className="gap-1.5 shrink-0" disabled={loading}>
                      <Plus className="size-4" />Add product
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(96vw,44rem)] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search by name or code…" />
                      <CommandList className="max-h-[72vh]">
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup heading={`${products.length} items`}>
                          {products.map((p) => (
                            <CommandItem key={p.id} value={`${p.name} ${p.sku}`} onSelect={() => addProduct(p)}
                              className="gap-4 py-3">
                              <ProductImage url={p.imageUrl} name={p.name} size="xl" zoom={false} />
                              <div className="flex-1 min-w-0">
                                <div className="text-base font-semibold text-navy-900 dark:text-white line-clamp-3">
                                  {p.name}
                                </div>
                                <div className="text-xs tabular text-slate-500 dark:text-slate-400 mt-1">
                                  {p.sku} · {p.totalStock} in stock
                                </div>
                              </div>
                              <span className="tabular text-base font-bold text-navy-900 dark:text-white shrink-0">
                                {formatMoney(p.salePrice)}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {lines.length === 0 ? (
                <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg">
                  <ShoppingCart className="size-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nothing on the order yet. Press <b>Add product</b>.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lines.map((l, idx) => (
                    <LineCard key={l.productId} line={l} idx={idx}
                      marginCapped={marginCapped}
                      onChange={setLine}
                      onMargin={setMargin}
                      onRemove={() => setLines((prev) => prev.filter((_, i) => i !== idx))} />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* ── 3. WHEN AND HOW ──────────────────────────────────────── */}
          <Card>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">
                    Paying by <span className="text-danger">*</span>
                  </label>
                  {loading ? <Skeleton className="h-10" /> : (
                    <SelectNative value={methodId} onChange={(e) => setMethodId(Number(e.target.value))}>
                      {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </SelectNative>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">
                    Order date <span className="text-danger">*</span>
                  </label>
                  <DateInput value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">
                    Wanted by <span className="text-danger">*</span>
                  </label>
                  <DateInput value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">
                  Notes for the order desk
                </label>
                <Textarea rows={2} value={notes} maxLength={500}
                  placeholder="Anything they need to know when they pack it"
                  onChange={(e) => setNotes(e.target.value)} />
              </div>

              {/* Only the two roles that may bill see this at all. */}
              {mayInvoice && (
                <div className="flex items-start justify-between gap-4 pt-3 border-t border-slate-200 dark:border-navy-700">
                  <div>
                    <div className="text-sm font-medium text-navy-900 dark:text-white">Invoice it straight away</div>
                    <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-md">
                      Cuts the bill with the order instead of at the Invoiced/Edit step. An order
                      that lands on credit hold is never invoiced.
                    </p>
                  </div>
                  <Switch checked={raiseInvoice} onCheckedChange={setRaiseInvoice} />
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ── THE RUNNING TOTAL ──────────────────────────────────────── */}
        <div className="space-y-6">
          <Card className="lg:sticky lg:top-20">
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Order</h3>
              <dl className="space-y-1.5 text-sm">
                <Row label="Items" v={`${lines.length}`} />
                <Row label="Units" v={units.toLocaleString()} />
                <Row label="Goods" v={formatMoney(subtotal)} />
                <Row label="Sales tax" v={formatMoney(tax)} />
                <Row label="Margin on this order" v={formatMoney(margin)} tone={margin < 0 ? "danger" : "success"} />
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200 dark:border-navy-700">
                  <span className="font-bold text-navy-900 dark:text-white">Total</span>
                  <span className="tabular text-lg font-bold text-navy-900 dark:text-white">{formatMoney(total)}</span>
                </div>
              </dl>
              {problem && <p className="text-2xs text-slate-500 dark:text-slate-400 mt-3">{problem}</p>}
            </CardBody>
          </Card>

          {customer && (
            <Card className={cn(willExceed && "border-warning/40")}>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">This shop</h3>
                <dl className="space-y-1.5 text-sm">
                  <Row label="Credit limit" v={customer.creditLimit > 0 ? formatMoney(customer.creditLimit) : "No limit"} />
                  <Row label="Owes now" v={formatMoney(customer.outstanding)} tone={customer.outstanding > 0 ? "warning" : undefined} />
                  <Row label="After this order" v={formatMoney(customer.outstanding + total)} tone={willExceed ? "danger" : undefined} />
                </dl>
                {willExceed && (
                  <div className="flex items-start gap-2 mt-3 text-2xs text-warning-dark dark:text-warning-light">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <span>
                      Over the limit, so this order is saved on hold and lands on the owner&rsquo;s
                      Limit Alerts queue. No invoice is cut until it is released.
                    </span>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* The phone's submit bar -- the header button is off-screen by the time
          anybody has added three items on a handset. */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="min-w-0">
          <div className="tabular text-base font-bold text-navy-900 dark:text-white leading-tight">
            {formatMoney(total)}
          </div>
          <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">
            {lines.length} item{lines.length === 1 ? "" : "s"} · {units} unit{units === 1 ? "" : "s"}
          </div>
        </div>
        <Button variant="accent" className="ml-auto" onClick={() => void save(false)}
          disabled={saving !== "" || loading || Boolean(problem)}>
          {saving === "submit" ? <><Loader2 className="size-4 animate-spin" />Sending…</> : <><Save />Submit</>}
        </Button>
      </div>
    </>
  );
}

/* ─────────────────────────────── one line ─────────────────────────────── */

function LineCard({
  line, idx, onChange, onMargin, onRemove, marginCapped,
}: {
  line: Line;
  idx: number;
  /** True for a salesperson: the margin boxes stop at MAX_SALES_MARGIN_PERCENT. */
  marginCapped: boolean;
  onChange: (idx: number, patch: Partial<Line>) => void;
  onMargin: (idx: number, lead: "price" | "percent", text: string) => void;
  onRemove: () => void;
}) {
  const landed = landedCost(line.cost, line.duty);
  const amount = round2(line.rate * line.qty);
  /* The base is the Super Admin's number; if it is under what the piece cost to
     land, say so -- the rep cannot change it, but the owner would want to know. */
  const belowCost = landed > 0 && line.base > 0 && line.base < landed;

  return (
    <div className={cn(
      "rounded-lg border p-3",
      belowCost ? "border-danger/40 bg-danger/5" : "border-slate-200 dark:border-navy-700"
    )}>
      <div className="flex items-start gap-3">
        <ProductImage url={line.imageUrl} name={line.name} size="xl" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-navy-900 dark:text-white line-clamp-2">{line.name}</div>
          <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">
            {line.sku} · {line.stock} in stock
            {landed > 0 && <> · lands at {formatMoney(landed)}</>}
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${line.name}`} onClick={onRemove}>
          <Trash2 className="size-4 text-danger" />
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        <Field label="Qty">
          <div className="flex items-center gap-1">
            <Button type="button" variant="secondary" size="icon-sm" aria-label="One less"
              onClick={() => onChange(idx, { qty: Math.max(1, line.qty - 1) })}>
              <Minus className="size-4" />
            </Button>
            <Input type="number" inputMode="numeric" min={1} className="text-center tabular"
              value={line.qty}
              onChange={(e) => onChange(idx, { qty: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
            <Button type="button" variant="secondary" size="icon-sm" aria-label="One more"
              onClick={() => onChange(idx, { qty: line.qty + 1 })}>
              <Plus className="size-4" />
            </Button>
          </div>
        </Field>

        <Field label="Rate">
          {/* Fixed: the selling price the Super Admin set. Not editable. */}
          <Input type="number" className="text-right tabular bg-slate-50 dark:bg-navy-800 cursor-not-allowed"
            value={line.base} disabled readOnly aria-readonly title="Set by the Super Admin" />
        </Field>

        <Field label="Margin (in Rs.)">
          <Input type="number" inputMode="decimal" step="0.01" min={0} placeholder="e.g. 10"
            className="text-right tabular"
            value={line.marginPriceText}
            onChange={(e) => onMargin(idx, "price", e.target.value)} />
        </Field>

        <Field label={marginCapped && line.base > 0 ? `Margin % (max ${MAX_SALES_MARGIN_PERCENT})` : "Margin %"}>
          <Input type="number" inputMode="decimal" step="0.01" min={0} placeholder="e.g. 10"
            className="text-right tabular"
            value={line.marginPercentText}
            max={marginCapped && line.base > 0 ? MAX_SALES_MARGIN_PERCENT : undefined}
            disabled={line.base <= 0}
            onChange={(e) => onMargin(idx, "percent", e.target.value)} />
        </Field>
      </div>

      {line.capped && (
        <p role="alert" className="mt-2 text-2xs font-medium text-danger">
          The most you can add is {MAX_SALES_MARGIN_PERCENT}%. It has been set to {MAX_SALES_MARGIN_PERCENT}%.
        </p>
      )}

      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-navy-700">
        <span className={cn("text-xs", belowCost ? "text-danger" : "text-slate-600 dark:text-slate-300")}>
          {/* The number the rep is really selling at, per piece, before the order is made. */}
          Final price: <b className="tabular text-navy-900 dark:text-white">{formatMoney(line.rate)} / piece</b>
          {line.marginPrice > 0 && (
            <span className="text-2xs text-slate-500 dark:text-slate-400">
              {" "}({formatMoney(line.base)} + {formatMoney(line.marginPrice)} margin)
            </span>
          )}
          {belowCost && <span className="block text-2xs">The fixed rate is below what this piece cost to land</span>}
        </span>
        <span className="tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(amount)}</span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">{label}</div>
      {children}
    </div>
  );
}

function Row({ label, v, tone }: { label: string; v: string; tone?: "success" | "warning" | "danger" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn("tabular font-medium text-navy-900 dark:text-white",
        tone === "success" && "text-success", tone === "warning" && "text-warning", tone === "danger" && "text-danger")}>
        {v}
      </span>
    </div>
  );
}
