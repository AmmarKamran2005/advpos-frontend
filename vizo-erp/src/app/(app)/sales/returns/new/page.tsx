"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  AlertCircle, ArrowLeft, Check, Loader2, Minus, Plus, RefreshCw, RotateCcw,
  Save, Search, Trash2, Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   A SALES RETURN, THE WAY THE OWNER ASKED FOR IT

   The old screen made you find the ONE invoice the goods were sold on first,
   and would only ever offer that invoice's lines. Real returns do not arrive
   that way: a shopkeeper hands back six pieces that went out on three
   different orders over two months, and nobody at the counter knows which.

   So the question this screen asks is about the CUSTOMER, not about a bill:

     1  salesperson   optional, and only a filter -- it narrows the customer list
     2  customer      required, and everything below follows from it
     3  items         only what this customer has ever been billed for, each one
                      capped at bought minus already returned
     4  where         which shelf the goods go back onto -- asked, never guessed
     5  save          the date is today, the credit note is written, the stock
                      is on the shelf before the page navigates

   TWO LIVE CALLS, both small on purpose:

     GET /sales/returns/lookups            salespeople, customers, locations
     GET /sales/returns/customer/{id}      the last five orders, and every item
                                           that customer has ever bought

   The second one is also where the returnable ceiling comes from. It is shown
   on every line and on every + button, and the API recomputes it inside the
   transaction that writes the return, so the number on screen being stale
   cannot let a return through.
   ─────────────────────────────────────────────────────────────────────────── */

type SalesPerson = { id: number; name: string };

type CustomerRow = {
  id: number; code: string; name: string; city: string | null; phone: string | null;
  repId: number | null; openedById: number | null;
  /** Null when they have never been billed -- nothing can come back. */
  lastPurchase: string | null;
};

type LocationRow = {
  id: number; code: string; name: string; kind: string; kindLabel: string;
  city: string; isSellable: boolean;
};

type Method = { id: number; key: string; name: string; kind: string };

type Lookups = {
  salesPeople: SalesPerson[];
  customers: CustomerRow[];
  locations: LocationRow[];
  refundMethods: Method[];
  defaultRefundMethodId: number | null;
  today: string;
};

type BoughtItem = {
  productId: number; name: string; sku: string; packing: string | null;
  purchased: number; returned: number; returnable: number;
  unitPrice: number; spent: number;
  firstBought: string; lastBought: string; invoices: number;
};

type RecentOrder = {
  invoiceId: number; invoiceNo: string;
  orderId: number | null; orderNo: string | null;
  date: string; total: number; status: string;
  lines: { productId: number; name: string; sku: string; qty: number }[];
};

type History = {
  customer: {
    id: number; code: string; name: string; city: string | null;
    phone: string | null; address: string | null; rep: string | null;
    defaultLocationId: number | null;
  };
  recentOrders: RecentOrder[];
  items: BoughtItem[];
  summary: {
    products: number; unitsBought: number; unitsReturned: number;
    unitsReturnable: number; spent: number;
    firstBought: string | null; lastBought: string | null;
  };
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/* Four reasons cover almost every return that walks in. They are buttons
   rather than a list to type, because the person doing this is usually holding
   the goods in the other hand. */
const QUICK_REASONS = [
  "Damaged piece",
  "Wrong item supplied",
  "Not selling — stock return",
  "Customer changed the order",
];

export default function NewSalesReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [repId, setRepId] = React.useState(0);
  const [customerId, setCustomerId] = React.useState(0);
  const [pickCustomer, setPickCustomer] = React.useState(false);

  const [history, setHistory] = React.useState<History | null>(null);
  const [loadingHistory, setLoadingHistory] = React.useState(false);

  /* productId -> quantity coming back. A map rather than an array so adding the
     same item twice -- from a recent order and again from the whole list -- adds to
     the line that is already there instead of making a second one. */
  const [qty, setQty] = React.useState<Record<number, number>>({});
  const [addOpen, setAddOpen] = React.useState(false);

  const [locationId, setLocationId] = React.useState(0);
  const [refundMethodId, setRefundMethodId] = React.useState(0);
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/sales/returns/lookups`, { headers: authHeader() });
      setLookups(res.data);
      setRefundMethodId(res.data.defaultRefundMethodId ?? 0);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the customers and locations."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const openCustomer = React.useCallback(async (id: number) => {
    setPickCustomer(false);
    setCustomerId(id);
    setQty({});
    setLoadingHistory(true);
    try {
      const res = await axios.get<History>(`${API_BASE_URL}/sales/returns/customer/${id}`, { headers: authHeader() });
      setHistory(res.data);
    } catch (e) {
      setHistory(null);
      toast.error("Could not open that customer", { description: apiMessage(e, "Please try again.") });
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  /* Deep link from the customer screen: /sales/returns/new?customerId=12 */
  const [prefilled, setPrefilled] = React.useState(false);
  const preselect = Number(searchParams.get("customerId") ?? 0);
  if (preselect > 0 && !prefilled && !loading) {
    setPrefilled(true);
    void openCustomer(preselect);
  }

  const customers = React.useMemo(() => {
    const all = lookups?.customers ?? [];
    if (!repId) return all;
    return all.filter((c) => c.repId === repId || c.openedById === repId);
  }, [lookups, repId]);

  const customer = history?.customer ?? null;
  /* Memoised so the Map below is not rebuilt on every keystroke in the reason
     box: `history?.items ?? []` is a fresh array each render otherwise. */
  const items = React.useMemo(() => history?.items ?? [], [history]);
  const byId = React.useMemo(() => new Map(items.map((i) => [i.productId, i])), [items]);

  /* The lines actually on the return, in the order they were added. */
  const lines = React.useMemo(
    () => Object.entries(qty)
      .map(([id, q]) => ({ item: byId.get(Number(id)), q }))
      .filter((l): l is { item: BoughtItem; q: number } => Boolean(l.item) && l.q > 0),
    [qty, byId]
  );

  const units = lines.reduce((s, l) => s + l.q, 0);
  const credit = lines.reduce((s, l) => s + l.q * l.item.unitPrice, 0);
  const overLimit = lines.filter((l) => l.q > l.item.returnable);
  const location = lookups?.locations.find((l) => l.id === locationId) ?? null;

  const problem =
    !customerId ? "Pick the customer first."
    : lines.length === 0 ? "Add at least one item."
    : overLimit.length > 0 ? `${overLimit[0].item.name}: only ${overLimit[0].item.returnable} can come back.`
    : !locationId ? "Say which location the goods go back into."
    : null;

  function setQuantity(productId: number, next: number) {
    const cap = byId.get(productId)?.returnable ?? 0;
    const clamped = Math.max(0, Math.min(Math.floor(next || 0), cap));
    setQty((q) => {
      const copy = { ...q };
      if (clamped <= 0) delete copy[productId];
      else copy[productId] = clamped;
      return copy;
    });
  }

  /* Adding from the right-hand panels: one tap puts the item on the return
     with the quantity that was sold on that order, capped at what may still
     come back. Tapping again adds that much more. */
  function addUnits(productId: number, add: number) {
    const item = byId.get(productId);
    if (!item) return;
    if (item.returnable <= 0) {
      toast.error(`${item.name} has already come back in full`);
      return;
    }
    setQuantity(productId, (qty[productId] ?? 0) + add);
  }

  async function save() {
    if (problem) { toast.error(problem); return; }
    setSaving(true);
    try {
      const res = await axios.post<{ id: number; returnNo: string; message: string }>(
        `${API_BASE_URL}/sales/returns`,
        {
          customerId,
          locationId,
          refundMethodId: refundMethodId || null,
          reason: reason.trim() || null,
          lines: lines.map((l) => ({ productId: l.item.productId, qty: l.q })),
        },
        { headers: authHeader() });

      toast.success(`Return ${res.data.returnNo} saved`, { description: res.data.message });
      router.push(`/sales/returns/${res.data.id}`);
    } catch (e) {
      toast.error("Return not saved", { description: apiMessage(e, "Please try again.") });
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Returns", href: "/sales/returns" }, { label: "New Return" }]}
        title={<><RotateCcw className="size-6 inline-block mr-2 text-brand-yellow" />Sales Return</>}
        subtitle="Pick the customer, add what is coming back, say where it goes. Dated today, credited at what they paid."
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/sales/returns"><ArrowLeft />Back</Link></Button>
            {/* Hidden on a phone -- the sticky bar at the foot of the screen is
                the one you can reach with a thumb. */}
            <Button variant="accent" className="hidden sm:inline-flex" onClick={save} disabled={saving || Boolean(problem)}>
              {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save />Save return</>}
            </Button>
          </>
        }
      />

      {error && (
        <Card className="mb-6 border-danger/40">
          <CardBody className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" className="gap-1.5"
              onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" />Try again
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24 sm:pb-0">
        <div className="lg:col-span-2 space-y-6">
          {/* ── 1. WHO ───────────────────────────────────────────────── */}
          <Card>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">
                    Salesperson <span className="text-slate-400">(optional)</span>
                  </label>
                  {loading ? <Skeleton className="h-10" /> : (
                    <SelectNative value={repId} onChange={(e) => {
                      setRepId(Number(e.target.value));
                      /* Changing the filter must not leave a customer selected
                         who is no longer in the list under it. */
                      setCustomerId(0); setHistory(null); setQty({});
                    }}>
                      <option value={0}>All salespeople</option>
                      {lookups?.salesPeople.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </SelectNative>
                  )}
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1">
                    Narrows the customer list to theirs. Nothing is stored against it.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">
                    Customer <span className="text-danger">*</span>
                  </label>
                  {loading ? <Skeleton className="h-10" /> : customer ? (
                    <div className="flex items-center justify-between gap-2 p-2.5 border border-slate-200 dark:border-navy-700 rounded-lg">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-navy-900 dark:text-white truncate">{customer.name}</div>
                        <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">
                          {customer.code}{customer.city ? ` · ${customer.city}` : ""}
                          {customer.rep ? ` · rep ${customer.rep}` : ""}
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => { setCustomerId(0); setHistory(null); setQty({}); }}>
                        Change
                      </Button>
                    </div>
                  ) : (
                    <Popover open={pickCustomer} onOpenChange={setPickCustomer}>
                      <PopoverTrigger asChild>
                        <button type="button"
                          className="w-full p-2.5 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 text-left hover:border-brand-yellow transition-colors">
                          <Search className="size-4 inline-block mr-2" />
                          Search {customers.length} customer{customers.length === 1 ? "" : "s"}…
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[min(90vw,32rem)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Name, code or city…" />
                          <CommandList>
                            <CommandEmpty>No customer found.</CommandEmpty>
                            <CommandGroup heading={repId ? "This salesperson's customers" : "All customers"}>
                              {customers.map((c) => (
                                <CommandItem key={c.id} value={`${c.name} ${c.code} ${c.city ?? ""}`}
                                  disabled={!c.lastPurchase}
                                  onSelect={() => void openCustomer(c.id)}>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{c.name}</div>
                                    <div className="text-2xs text-slate-500 dark:text-slate-400">
                                      {c.code}{c.city ? ` · ${c.city}` : ""}
                                    </div>
                                  </div>
                                  <span className="text-2xs text-slate-500 dark:text-slate-400 shrink-0">
                                    {c.lastPurchase ? `last ${formatDate(c.lastPurchase)}` : "never billed"}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>

              {customer && history && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-navy-700 pt-3">
                  <span><b className="text-navy-900 dark:text-white tabular">{history.summary.products}</b> items ever bought</span>
                  <span><b className="text-navy-900 dark:text-white tabular">{history.summary.unitsBought.toLocaleString()}</b> units</span>
                  <span><b className="text-navy-900 dark:text-white tabular">{history.summary.unitsReturned.toLocaleString()}</b> already returned</span>
                  <span className="text-success"><b className="tabular">{history.summary.unitsReturnable.toLocaleString()}</b> can still come back</span>
                  {history.summary.firstBought && (
                    <span>since {formatDate(history.summary.firstBought)}</span>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* ── 2. WHAT IS COMING BACK ───────────────────────────────── */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Items coming back</h3>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Only what this customer has been billed for, and never more than is left to return.
                  </p>
                </div>

                <Popover open={addOpen} onOpenChange={setAddOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="secondary" size="sm" className="gap-1.5 shrink-0"
                      disabled={!customer || loadingHistory}>
                      <Plus className="size-4" />Add product
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(92vw,34rem)] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search what they bought…" />
                      <CommandList>
                        <CommandEmpty>Nothing matches.</CommandEmpty>
                        <CommandGroup heading={`${items.length} item${items.length === 1 ? "" : "s"} ever bought`}>
                          {items.map((i) => (
                            <CommandItem key={i.productId} value={`${i.name} ${i.sku}`}
                              disabled={i.returnable <= 0}
                              onSelect={() => { addUnits(i.productId, 1); setAddOpen(false); }}>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{i.name}</div>
                                <div className="text-2xs tabular text-slate-500 dark:text-slate-400">
                                  {i.sku} · bought {i.purchased}
                                  {i.returned > 0 && ` · ${i.returned} back already`}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className={cn("text-2xs font-semibold tabular",
                                  i.returnable > 0 ? "text-success" : "text-slate-400")}>
                                  {i.returnable > 0 ? `${i.returnable} left` : "none left"}
                                </div>
                                <div className="text-2xs tabular text-slate-500">{formatMoney(i.unitPrice)}</div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {!customer ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                  <Users className="size-5 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  Pick a customer and their purchases appear here.
                </p>
              ) : loadingHistory ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : lines.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                  Nothing added yet. Use <b>Add product</b>, or tap an item in the
                  orders on the right.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {lines.map(({ item, q }) => (
                    <div key={item.productId}
                      className="rounded-lg border border-slate-200 dark:border-navy-700 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{item.name}</div>
                          <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.sku} · bought {item.purchased}
                            {item.returned > 0 && <span className="text-warning"> · {item.returned} already back</span>}
                            <span className="text-success"> · {item.returnable} can come back</span>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${item.name}`}
                          onClick={() => setQuantity(item.productId, 0)}>
                          <Trash2 className="size-4 text-danger" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between gap-3 mt-2">
                        <div className="flex items-center gap-1.5">
                          {/* Big enough to hit with a thumb, which is how this
                              screen is actually used on a phone. */}
                          <Button type="button" variant="secondary" size="icon-sm" aria-label="One less"
                            onClick={() => setQuantity(item.productId, q - 1)}>
                            <Minus className="size-4" />
                          </Button>
                          <Input type="number" inputMode="numeric" min={0} max={item.returnable}
                            className="w-20 text-center tabular" value={q}
                            onChange={(e) => setQuantity(item.productId, Number(e.target.value))} />
                          <Button type="button" variant="secondary" size="icon-sm" aria-label="One more"
                            onClick={() => setQuantity(item.productId, q + 1)}>
                            <Plus className="size-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="text-2xs"
                            onClick={() => setQuantity(item.productId, item.returnable)}>
                            All {item.returnable}
                          </Button>
                        </div>
                        <div className="text-right">
                          <div className="tabular text-sm font-bold text-navy-900 dark:text-white">
                            {formatMoney(q * item.unitPrice)}
                          </div>
                          <div className="text-2xs tabular text-slate-500 dark:text-slate-400">
                            at {formatMoney(item.unitPrice)} each
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <p className="text-2xs text-slate-500 dark:text-slate-400 pt-1">
                    The rate is what this customer actually paid on average for that
                    item — discount taken off, tax on — across every bill they have had.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* ── 3. WHERE THE GOODS GO ────────────────────────────────── */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white">
                Where do the goods go? <span className="text-danger">*</span>
              </h3>
              <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                Every returned piece is added to this location the moment the return is saved.
              </p>

              {loading ? <Skeleton className="h-20" /> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {lookups?.locations.map((l) => (
                    <button key={l.id} type="button" onClick={() => setLocationId(l.id)}
                      className={cn(
                        "text-left p-3 rounded-lg border-2 transition-colors",
                        locationId === l.id
                          ? "border-brand-yellow bg-brand-yellow/5"
                          : "border-slate-200 dark:border-navy-700 hover:border-brand-yellow/40"
                      )}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-navy-900 dark:text-white truncate">{l.name}</span>
                        {locationId === l.id && <Check className="size-4 text-brand-yellow shrink-0" />}
                      </div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {l.city} · {l.kindLabel}
                      </div>
                      {!l.isSellable && (
                        <Badge variant="danger" className="mt-1.5 text-2xs">Not for sale</Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {location && !location.isSellable && (
                <p className="text-2xs text-warning-dark dark:text-warning-light mt-3">
                  {location.name} is a hold shelf, so these pieces are recorded as
                  damaged and will not be offered for sale again.
                </p>
              )}
            </CardBody>
          </Card>

          {/* ── 4. REFUND AND REASON ─────────────────────────────────── */}
          <Card>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">
                    Credit given as
                  </label>
                  {loading ? <Skeleton className="h-10" /> : (
                    <SelectNative value={refundMethodId} onChange={(e) => setRefundMethodId(Number(e.target.value))}>
                      {lookups?.refundMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </SelectNative>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">
                    Return date
                  </label>
                  <div className="h-10 flex items-center px-3 rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 text-sm text-slate-600 dark:text-slate-300">
                    {lookups ? formatDate(lookups.today) : "—"}
                    <span className="text-2xs text-slate-400 ml-2">set by the system</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">
                  Reason <span className="text-slate-400">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {QUICK_REASONS.map((r) => (
                    <button key={r} type="button" onClick={() => setReason(r)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-2xs font-medium transition-colors",
                        reason === r
                          ? "border-brand-yellow bg-brand-yellow/10 text-navy-900 dark:text-white"
                          : "border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 hover:border-brand-yellow/40"
                      )}>
                      {r}
                    </button>
                  ))}
                </div>
                <Textarea rows={2} value={reason} maxLength={300}
                  placeholder="Anything worth recording on the credit note"
                  onChange={(e) => setReason(e.target.value)} />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* ── THE RIGHT-HAND PANELS: what they bought ─────────────────── */}
        <div className="space-y-6">
          <Card className="lg:sticky lg:top-20">
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-1">This return</h3>
              <dl className="space-y-1.5 text-sm mt-3">
                <Row label="Items" v={`${lines.length}`} />
                <Row label="Units coming back" v={units.toLocaleString()} />
                <Row label="Going into" v={location?.name ?? "—"} />
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200 dark:border-navy-700">
                  <span className="font-bold text-navy-900 dark:text-white">Credit</span>
                  <span className="tabular text-lg font-bold text-warning">{formatMoney(credit)}</span>
                </div>
              </dl>
              {problem && (
                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-3">{problem}</p>
              )}
            </CardBody>
          </Card>

          {customer && (
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Last 5 orders</h3>
                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                  Tap a line to put that item on the return.
                </p>

                {loadingHistory ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : (history?.recentOrders.length ?? 0) === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                    Nothing has been billed to this customer yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {history?.recentOrders.map((o) => (
                      <div key={o.invoiceId} className="rounded-lg border border-slate-200 dark:border-navy-700 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="tabular text-xs font-semibold text-navy-900 dark:text-white truncate">
                              {o.orderNo ?? o.invoiceNo}
                            </div>
                            <div className="text-2xs text-slate-500 dark:text-slate-400">
                              {formatDate(o.date)} · {o.orderNo ? o.invoiceNo : "counter sale"}
                            </div>
                          </div>
                          <span className="tabular text-xs font-semibold text-navy-900 dark:text-white shrink-0">
                            {formatMoney(o.total)}
                          </span>
                        </div>

                        <div className="mt-2 space-y-1">
                          {o.lines.map((l) => {
                            const left = byId.get(l.productId)?.returnable ?? 0;
                            return (
                              <button key={`${o.invoiceId}-${l.productId}`} type="button"
                                disabled={left <= 0}
                                onClick={() => addUnits(l.productId, l.qty)}
                                className={cn(
                                  "w-full flex items-center justify-between gap-2 rounded-md px-2 py-1 text-left transition-colors",
                                  left > 0
                                    ? "hover:bg-brand-yellow/10"
                                    : "opacity-50 cursor-not-allowed"
                                )}>
                                <span className="text-2xs text-slate-600 dark:text-slate-300 truncate">{l.name}</span>
                                <span className="text-2xs tabular text-slate-500 dark:text-slate-400 shrink-0">
                                  {l.qty}{left > 0 && <Plus className="size-3 inline-block ml-1 text-brand-yellow" />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {customer && (
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Everything ever bought</h3>
                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                  From their first bill to their last — no date window.
                </p>

                {loadingHistory ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                  </div>
                ) : items.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">Nothing yet.</p>
                ) : (
                  <div className="max-h-96 overflow-y-auto -mx-1 px-1 divide-y divide-slate-100 dark:divide-navy-700">
                    {items.map((i) => (
                      <button key={i.productId} type="button" disabled={i.returnable <= 0}
                        onClick={() => addUnits(i.productId, 1)}
                        className={cn(
                          "w-full flex items-center justify-between gap-2 py-2 text-left transition-colors rounded-md px-1",
                          i.returnable > 0 ? "hover:bg-brand-yellow/10" : "opacity-50 cursor-not-allowed"
                        )}>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-navy-900 dark:text-white truncate">{i.name}</div>
                          <div className="text-2xs tabular text-slate-500 dark:text-slate-400">
                            {i.invoices} bill{i.invoices === 1 ? "" : "s"} · {formatMoney(i.unitPrice)} each
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs tabular font-semibold text-navy-900 dark:text-white">{i.purchased}</div>
                          <div className={cn("text-2xs tabular", i.returnable > 0 ? "text-success" : "text-slate-400")}>
                            {i.returned > 0 ? `${i.returned} back · ` : ""}{i.returnable} left
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* THE PHONE'S SAVE BAR. The header button is off-screen by the time
          anybody has added three items on a handset, and this screen is used
          on one. */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="min-w-0">
          <div className="tabular text-base font-bold text-warning leading-tight">{formatMoney(credit)}</div>
          <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">
            {units} unit{units === 1 ? "" : "s"}{location ? ` → ${location.name}` : ""}
          </div>
        </div>
        <Button variant="accent" className="ml-auto" onClick={save} disabled={saving || Boolean(problem)}>
          {saving ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <><Save />Save return</>}
        </Button>
      </div>
    </>
  );
}

function Row({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="tabular font-medium text-navy-900 dark:text-white truncate">{v}</span>
    </div>
  );
}
