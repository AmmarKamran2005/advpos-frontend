"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  ShoppingBag, Plus, Trash2, Banknote, CreditCard, Printer,
  MessageCircle, Check, Users, AlertCircle, RefreshCw, Loader2,
  Percent, ExternalLink, FileText,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { WhatsAppShareDialog } from "@/components/dialogs/whatsapp-share-dialog";
import { toast } from "@/components/ui/toaster";
import { useSession, API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /sales/lookups?locationId= -- customers, locations, payment methods and
   the live catalogue with stock at the till you are standing at. This screen
   used to import frozen arrays from @/data, so nothing created through the app
   could be sold at the counter, and "Take payment" only produced a toast. */
type LookupCustomer = {
  id: number; code: string; name: string; displayName: string | null;
  city: string; phone: string | null;
  creditLimit: number; creditDays: number; holdPolicy: string; outstanding: number;
};
type LookupProduct = {
  id: number; sku: string; name: string; packing: number;
  salePrice: number; taxRatePercent: number; totalStock: number; stockHere: number | null;
};
type Lookups = {
  locations: { id: number; code: string; name: string; kind: string; isSellable: boolean }[];
  paymentMethods: { id: number; key: string; name: string; kind: string }[];
  customers: LookupCustomer[];
  products: LookupProduct[];
  defaultTaxPercent: number;
  company: { name: string } | null;
};

type Line = {
  key: number;
  productId: number;
  name: string;
  sku: string;
  qty: number;
  rate: number;
  discount: number;
  stockHere: number | null;
};

/** POST /sales/direct. One call raises the order, the invoice, the stock movement and the bill. */
type SaleResult = {
  orderId: number; orderNo: string;
  invoiceId: number; invoiceNo: string;
  isWalkIn: boolean;
  customerName: string; customerPhone: string | null;
  subtotal: number; discount: number; tax: number; total: number;
  pdfUrl: string | null; shareUrl: string | null;
  message: string;
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/**
 * A shop walks up to the counter, or rings the office direct. No sales rep in
 * the middle, so the order department raises and settles it in one screen --
 * cash in the drawer, or on the customer's account.
 */
export default function CounterSalePage() {
  const { user } = useSession();

  const [lookups, setLookups] = React.useState<Lookups>({
    locations: [], paymentMethods: [], customers: [], products: [],
    defaultTaxPercent: 0, company: null,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [lines, setLines] = React.useState<Line[]>([]);
  const [nextKey, setNextKey] = React.useState(1);
  const [isWalkIn, setIsWalkIn] = React.useState(true);
  const [customerId, setCustomerId] = React.useState(0);
  const [walkInName, setWalkInName] = React.useState("");
  const [walkInPhone, setWalkInPhone] = React.useState("");
  const [locationId, setLocationId] = React.useState(0);
  const [methodId, setMethodId] = React.useState(0);
  const [received, setReceived] = React.useState(0);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [notes, setNotes] = React.useState("");

  /* The tax rate is asked for, not assumed. It seeds from the catalogue -- the
     rate most items actually carry -- and the operator can change it for this
     sale. It used to be the literal 18 written into the markup, which meant a
     budget changing the rate was a code change and a redeploy. */
  const [taxPercent, setTaxPercent] = React.useState(0);
  const [taxTouched, setTaxTouched] = React.useState(false);

  /* The completed sale, held so the receipt strip can print and share it. */
  const [sale, setSale] = React.useState<SaleResult | null>(null);
  const [shareOpen, setShareOpen] = React.useState(false);

  const load = React.useCallback(async (forLocation?: number) => {
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/sales/lookups`, {
        params: forLocation ? { locationId: forLocation } : undefined,
        headers: authHeader(),
      });
      setLookups({
        locations: res.data.locations ?? [],
        paymentMethods: res.data.paymentMethods ?? [],
        customers: res.data.customers ?? [],
        products: res.data.products ?? [],
        defaultTaxPercent: res.data.defaultTaxPercent ?? 0,
        company: res.data.company ?? null,
      });
      /* The till the operator actually stands at, when they have one. Falling
         back to the first list entry once put "Claim Stock" -- damaged goods --
         on the counter screen by default. */
      const sellable = (res.data.locations ?? []).filter((l) => l.isSellable);
      const mine = sellable.find((l) => l.id === user?.primaryLocationId);
      setLocationId((prev) => prev || mine?.id || sellable[0]?.id || res.data.locations?.[0]?.id || 0);
      setMethodId((prev) => prev || res.data.paymentMethods?.find((m) => m.key === "CASH")?.id
        || res.data.paymentMethods?.[0]?.id || 0);
      setTaxPercent((prev) => (taxTouched ? prev : res.data.defaultTaxPercent ?? 0));
      setCustomerId((prev) => prev || res.data.customers?.[0]?.id || 0);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the catalogue and customers."));
    } finally {
      setLoading(false);
    }
  }, [taxTouched, user?.primaryLocationId]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  /* Re-read stock when the till changes: "12 on the shelf" has to mean this
     shelf, not the total across every location. */
  React.useEffect(() => {
    if (!locationId) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load(locationId);
  }, [locationId, load]);

  const customer = isWalkIn ? null : lookups.customers.find((c) => c.id === customerId) ?? null;
  const method = lookups.paymentMethods.find((m) => m.id === methodId);
  const onCredit = method?.key === "CREDIT";

  const subtotal = lines.reduce((s, l) => s + l.rate * l.qty, 0);
  const discountAmount = lines.reduce((s, l) => s + l.rate * l.qty * (l.discount / 100), 0);
  const net = subtotal - discountAmount;
  const tax = net * (taxPercent / 100);
  const total = net + tax;
  const change = Math.max(0, received - total);

  function addProduct(id: number) {
    const p = lookups.products.find((x) => x.id === id);
    if (!p) return;
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === id);
      if (existing) return prev.map((l) => (l.productId === id ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, {
        key: nextKey, productId: id, name: p.name, sku: p.sku,
        qty: 1, rate: p.salePrice, discount: 0, stockHere: p.stockHere,
      }];
    });
    setNextKey((k) => k + 1);
    setPickerOpen(false);
  }

  function update(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function remove(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function clearSale() {
    setLines([]);
    setReceived(0);
    setWalkInName("");
    setWalkInPhone("");
    setNotes("");
    setSale(null);
  }

  async function complete() {
    if (lines.length === 0) {
      toast.error("Nothing to sell", { description: "Add at least one item." });
      return;
    }
    if (!locationId) { toast.error("Pick the location to sell from."); return; }
    if (!methodId) { toast.error("Pick a payment method."); return; }
    if (onCredit && isWalkIn) {
      toast.error("Credit needs an account", {
        description: "A walk-in sale has to be paid now. Pick the shop's account for credit.",
      });
      return;
    }
    if (!onCredit && received < total) {
      toast.error("Not enough received", { description: `Short by ${formatMoney(total - received)}.` });
      return;
    }

    setSaving(true);
    try {
      const res = await axios.post<SaleResult>(`${API_BASE_URL}/sales/direct`, {
        customerId: isWalkIn ? 0 : customerId,
        isWalkIn,
        walkInName: isWalkIn ? (walkInName.trim() || null) : null,
        walkInPhone: isWalkIn ? (walkInPhone.trim() || null) : null,
        locationId,
        methodId,
        notes: notes.trim() || null,
        lines: lines.map((l) => ({
          productId: l.productId,
          qty: Number(l.qty) || 0,
          rate: Number(l.rate) || 0,
          discountPercent: Number(l.discount) || 0,
          taxPercent: Number(taxPercent) || 0,
        })),
      }, { headers: authHeader() });

      setSale(res.data);
      toast.success("Sale completed", {
        description: `${res.data.invoiceNo} · ${formatMoney(res.data.total)}` +
          (!onCredit && change > 0 ? ` · change ${formatMoney(change)}` : ""),
      });

      if (!res.data.pdfUrl) {
        toast.warning("Bill not archived", {
          description: "The sale is saved. The document store did not accept the PDF — you can still print it.",
        });
      }

      setLines([]);
      setReceived(0);
      setNotes("");
      /* Stock just moved, so the picker's figures are stale. */
      void load(locationId);
    } catch (e) {
      toast.error("Sale not completed", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  /** Opens the bill in a new tab, where the browser's own print dialog takes over. */
  function printBill(invoiceId: number) {
    window.open(`${API_BASE_URL}/sales/invoices/${invoiceId}/pdf`, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Counter Sale" }]}
        title="Counter Sale"
        subtitle="Sell straight from the desk — cash now, or on the shop's account."
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href="/sales/direct/walkin"><Users />Show all walk-in orders</Link>
            </Button>
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href="/sales/orders">Orders</Link>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" onClick={complete} disabled={saving || loading}>
              {saving ? <><Loader2 className="size-4 animate-spin" />Completing…</> : <><Check />Complete Sale</>}
            </Button>
          </>
        }
      />

      {error && (
        <Card className="mb-6 border-danger/40">
          <CardBody className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy-900 dark:text-white">{error}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">The API must be running on {API_BASE_URL}.</div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(locationId); }}>
              <RefreshCw className="size-4" />Try again
            </Button>
          </CardBody>
        </Card>
      )}

      {/* The receipt strip: appears the moment a sale goes through, and stays
          until the next one is rung up. Print and WhatsApp both act on THIS
          sale, so the operator is never guessing which bill they are sending. */}
      {sale && (
        <Card className="mb-6 bg-success/5 border-success/30">
          <CardBody>
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="size-10 rounded-lg bg-success/15 flex items-center justify-center flex-shrink-0">
                <Check className="size-5 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-success-dark dark:text-success-light">Sale completed</h3>
                  <Link href={`/sales/invoices/${sale.invoiceId}`} className="tabular text-sm font-bold text-navy-900 dark:text-white hover:text-brand-yellow">
                    {sale.invoiceNo}
                  </Link>
                </div>
                <p className="text-sm text-success-dark/80 dark:text-success-light/80 mt-0.5">
                  {sale.customerName} · <span className="tabular font-semibold">{formatMoney(sale.total)}</span>
                  {sale.isWalkIn ? " · walk-in" : " · shop account"}
                </p>
                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1">
                  {sale.pdfUrl
                    ? "Bill saved to the document store."
                    : "Bill could not be archived — print or share still work."}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="secondary" size="md" className="gap-1.5" onClick={() => printBill(sale.invoiceId)}>
                  <Printer />Print
                </Button>
                <Button variant="accent" size="md" className="gap-1.5" onClick={() => setShareOpen(true)}>
                  <MessageCircle />WhatsApp
                </Button>
                <Button variant="ghost" size="md" asChild>
                  <Link href={`/sales/invoices/${sale.invoiceId}`}><FileText />Invoice</Link>
                </Button>
                <Button variant="ghost" size="md" onClick={clearSale}>New sale</Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Items ({lines.length})</h3>
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="accent" size="sm" className="gap-1" disabled={loading}>
                      <Plus />Add Item
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[480px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Scan a barcode, or search by code or name…" />
                      <CommandList>
                        <CommandEmpty>No item found.</CommandEmpty>
                        <CommandGroup heading={`${lookups.products.length} items`}>
                          {lookups.products.map((p) => {
                            const here = p.stockHere ?? p.totalStock;
                            return (
                              <CommandItem key={p.id} value={`${p.sku} ${p.name}`} onSelect={() => addProduct(p.id)}>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{p.name}</div>
                                  <div className={cn("tabular text-2xs", here > 0 ? "text-slate-500 dark:text-slate-400" : "text-danger")}>
                                    {p.sku} · {here > 0 ? `${here} here` : "none here"}
                                  </div>
                                </div>
                                <span className="tabular text-sm font-bold text-navy-900 dark:text-white">
                                  {formatMoney(p.salePrice)}
                                </span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {loading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
              ) : lines.length === 0 ? (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg">
                  <ShoppingBag className="size-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">
                    Nothing added yet. Hit <span className="font-semibold">Add Item</span> or scan a barcode.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-2 pb-1">
                    <div className="col-span-5 text-2xs font-semibold uppercase tracking-wider text-slate-400">Item</div>
                    <div className="col-span-2 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Qty</div>
                    <div className="col-span-2 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Rate</div>
                    <div className="col-span-1 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Disc %</div>
                    <div className="col-span-1 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Amount</div>
                    <div className="col-span-1" />
                  </div>

                  {lines.map((l) => {
                    const amount = l.rate * l.qty * (1 - l.discount / 100);
                    const short = l.stockHere !== null && l.qty > l.stockHere;
                    return (
                      <div key={l.key} className={cn(
                        "grid grid-cols-12 gap-2 items-center p-2 border rounded-lg",
                        short ? "border-danger/40 bg-danger/5" : "border-slate-200 dark:border-navy-700"
                      )}>
                        <div className="col-span-12 sm:col-span-5 min-w-0">
                          <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{l.name}</div>
                          <div className={cn("tabular text-2xs", short ? "text-danger" : "text-slate-500 dark:text-slate-400")}>
                            {l.sku}
                            {l.stockHere !== null && ` · ${l.stockHere} here`}
                            {short && " — not enough stock"}
                          </div>
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <Input type="number" min={1} value={l.qty} className="text-right tabular h-9"
                            aria-label="Quantity"
                            onChange={(e) => update(l.key, { qty: Number(e.target.value) })} />
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <Input type="number" min={0} step="0.01" value={l.rate} className="text-right tabular h-9"
                            aria-label="Rate"
                            onChange={(e) => update(l.key, { rate: Number(e.target.value) })} />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <Input type="number" min={0} max={100} value={l.discount} className="text-right tabular h-9"
                            aria-label="Discount percent"
                            onChange={(e) => update(l.key, { discount: Number(e.target.value) })} />
                        </div>
                        <div className="col-span-3 sm:col-span-1 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">
                          {Math.round(amount).toLocaleString("en-PK")}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button variant="ghost" size="icon-sm" className="text-danger"
                            aria-label={`Remove ${l.name}`} onClick={() => remove(l.key)}>
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4">
                <Label htmlFor="sale-notes">Note on the bill (optional)</Label>
                <Input id="sale-notes" value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Delivered to shop by Bilal" className="mt-1.5" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Who and how */}
        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Customer</h3>

              <div className="flex gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => setIsWalkIn(true)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-colors",
                    isWalkIn
                      ? "border-brand-yellow bg-brand-yellow/5 text-navy-900 dark:text-white"
                      : "border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-400"
                  )}
                >
                  Walk-in
                </button>
                <button
                  type="button"
                  onClick={() => setIsWalkIn(false)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-colors",
                    !isWalkIn
                      ? "border-brand-yellow bg-brand-yellow/5 text-navy-900 dark:text-white"
                      : "border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-400"
                  )}
                >
                  Existing shop
                </button>
              </div>

              {isWalkIn ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="walkin-name">Name</Label>
                    <Input
                      id="walkin-name"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      placeholder="Cash Customer"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="walkin-phone">WhatsApp number</Label>
                    <Input
                      id="walkin-phone"
                      value={walkInPhone}
                      onChange={(e) => setWalkInPhone(e.target.value)}
                      placeholder="0300 1234567"
                      className="mt-1.5 tabular"
                    />
                    <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1.5">
                      Only needed if they want the bill sent. A walk-in has to pay now — there is
                      no account to put it on.
                    </p>
                  </div>
                </div>
              ) : loading ? (
                <Skeleton className="h-10" />
              ) : (
                <>
                  <SelectNative
                    value={String(customerId)}
                    onChange={(e) => setCustomerId(Number(e.target.value))}
                    aria-label="Pick a customer"
                  >
                    {lookups.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName ?? c.name} · {c.code}
                      </option>
                    ))}
                  </SelectNative>
                  {customer && (
                    <div className="flex items-center gap-2.5 mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-navy-900">
                      <Avatar initials={customer.name.slice(0, 2).toUpperCase()} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-navy-900 dark:text-white truncate">
                          {customer.name}
                        </div>
                        <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                          owes {formatMoney(customer.outstanding)}
                          {customer.creditLimit > 0 && ` of ${formatMoney(customer.creditLimit)}`}
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-2">
                    A shop sale is invoiced to their account and shows in Sale Invoices.
                  </p>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Payment</h3>

              {loading ? (
                <Skeleton className="h-16 mb-3" />
              ) : (
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {lookups.paymentMethods.map((m) => {
                    const active = methodId === m.id;
                    const disabled = m.key === "CREDIT" && isWalkIn;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setMethodId(m.id)}
                        className={cn(
                          "px-2 py-2 rounded-lg border-2 text-2xs font-medium transition-colors",
                          active
                            ? "border-brand-yellow bg-brand-yellow/5 text-navy-900 dark:text-white"
                            : "border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-400",
                          disabled && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tax rate — asked for, not baked in. */}
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tax-percent" className="!mb-0 inline-flex items-center gap-1.5">
                    <Percent className="size-3 text-slate-400" />Sales tax rate
                  </Label>
                  {taxPercent !== lookups.defaultTaxPercent && (
                    <button
                      type="button"
                      onClick={() => { setTaxPercent(lookups.defaultTaxPercent); setTaxTouched(false); }}
                      className="text-2xs text-brand-yellow hover:underline font-medium"
                    >
                      Back to {lookups.defaultTaxPercent}%
                    </button>
                  )}
                </div>
                <div className="relative mt-1.5">
                  <Input
                    id="tax-percent"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={taxPercent}
                    onChange={(e) => { setTaxPercent(Number(e.target.value)); setTaxTouched(true); }}
                    className="tabular pr-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">%</span>
                </div>
                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1.5">
                  Applies to every line on this sale. Starts at {lookups.defaultTaxPercent}%, the rate most
                  items in the catalogue carry.
                </p>
              </div>

              {!onCredit && (
                <div className="mb-3">
                  <Label htmlFor="received">Received</Label>
                  <Input
                    id="received"
                    type="number"
                    min={0}
                    value={received}
                    onChange={(e) => setReceived(Number(e.target.value))}
                    className="mt-1.5 tabular text-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setReceived(Math.round(total * 100) / 100)}
                    className="text-2xs text-brand-yellow hover:underline font-medium mt-1.5"
                  >
                    Exact amount
                  </button>
                </div>
              )}

              <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-navy-800">
                <Row label="Subtotal" value={formatMoney(subtotal)} />
                {discountAmount > 0 && <Row label="Discount" value={`- ${formatMoney(discountAmount)}`} />}
                <Row label={`Sales tax (${taxPercent}%)`} value={formatMoney(tax)} />
                <Row label="Total" value={formatMoney(total)} bold />
                {!onCredit && received > 0 && (
                  <Row label="Change" value={formatMoney(change)} tone="success" />
                )}
                {onCredit && (
                  <p className="text-2xs text-warning pt-1">
                    Goes on the shop&rsquo;s account. Accounts will chase it.
                  </p>
                )}
              </div>

              <Button variant="accent" size="lg" className="w-full justify-center gap-1.5 mt-4"
                onClick={complete} disabled={saving || loading}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : onCredit ? <CreditCard /> : <Banknote />}
                {saving ? "Completing…" : onCredit ? "Put on account" : "Take payment"}
              </Button>

              <div className="flex gap-1.5 mt-2">
                <Button variant="secondary" size="sm" className="flex-1 gap-1"
                  disabled={!sale}
                  onClick={() => sale && printBill(sale.invoiceId)}>
                  <Printer /> Print
                </Button>
                <Button variant="secondary" size="sm" className="flex-1 gap-1"
                  disabled={!sale}
                  onClick={() => setShareOpen(true)}>
                  <MessageCircle /> Send
                </Button>
              </div>
              {!sale && (
                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1.5 text-center">
                  Print and Send become available once the sale is taken.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-2">Selling from</h3>
              {loading ? <Skeleton className="h-10" /> : (
                <SelectNative
                  value={locationId}
                  onChange={(e) => setLocationId(Number(e.target.value))}
                  aria-label="Stock location"
                >
                  {lookups.locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}{l.isSellable ? "" : " (held stock)"}
                    </option>
                  ))}
                </SelectNative>
              )}
              <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1.5">
                Stock comes out of this location, and the item list shows what is on that shelf.
              </p>
              <Button variant="ghost" size="sm" className="w-full mt-3 gap-1.5" asChild>
                <Link href="/sales/direct/walkin"><ExternalLink />All walk-in bills</Link>
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      {sale && (
        <WhatsAppShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          docNo={sale.invoiceNo}
          docLabel="Invoice"
          customerName={sale.customerName}
          customerPhone={sale.customerPhone ?? ""}
          total={sale.total}
          billLink={sale.shareUrl ?? sale.pdfUrl}
          companyName={lookups.company?.name}
        />
      )}
    </>
  );
}

function Row({
  label, value, bold, tone,
}: {
  label: string; value: string; bold?: boolean; tone?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-sm text-slate-500 dark:text-slate-400", bold && "font-bold text-navy-900 dark:text-white")}>
        {label}
      </span>
      <span
        className={cn(
          "tabular text-sm font-semibold text-navy-900 dark:text-white",
          bold && "text-base font-bold",
          tone === "success" && "text-success"
        )}
      >
        {value}
      </span>
    </div>
  );
}
