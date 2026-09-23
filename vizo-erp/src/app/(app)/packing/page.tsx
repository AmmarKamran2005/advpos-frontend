"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Package, Search, ChevronRight, ArrowLeft, Loader2, AlertCircle, AlertTriangle,
  Send, Store, Truck, PackageCheck, Check, Hash, Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { DateInput } from "@/components/ui/date-input";
import { todayISO, addDaysISO } from "@/lib/dates";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { ProductImage } from "@/components/products/product-image";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   THE ORDER DEPARTMENT'S HOME PAGE, since 23 September (Role.HomePath -- no
   proxy or login-page code needed, migration 25 is the whole change on that
   side).

   THREE DROPDOWNS THAT NARROW EACH OTHER, in any direction:

     Sales      every rep who currently has an order waiting to be packed.
     Customer   narrows to that rep's customers -- or, picked FIRST, sets the
                rep above it, because a customer belongs to exactly one rep on
                a ready order (the order's own SalesPersonUserId, not
                necessarily the customer's assigned rep, which can differ).
     Order      narrows to whichever of the two is filled in; picking an order
                directly sets both boxes above it from the order's own record.

   Then the ONE thing this screen exists for: an order's lines, with the
   Super Admin's own selling price (never a rep's margin -- Product.SalePrice,
   not the order line's Rate) and an EDITABLE quantity that may only go down.
   Reducing one warns the salesperson, the accountant and the Super Admin, and
   the invoice gains a "Dispatching" page recording it -- both handled by the
   API (SalesController.SetOrderStatus), not by this screen.

   TWO STEPS TO DISPATCH, not one call: Next commits the quantities -- this is
   the moment stock actually leaves the shelf, so it has to be a real step, not
   a page transition with nothing behind it -- and only once that has
   succeeded does the courier step appear, booking through the same endpoint
   /dispatch already uses. If booking the courier fails, the order stays
   dispatched and the screen offers to try booking again rather than repeating
   the part that already worked.
   ─────────────────────────────────────────────────────────────────────────── */

type RepOption = { id: number; name: string };
/** repIds can hold more than one name -- the same shop can have a ready order from more than one rep. */
type CustomerOption = { id: number; name: string; repIds: number[] };

type PackableOrder = {
  id: number;
  orderNo: string;
  customerId: number;
  customerName: string;
  repId: number | null;
  repName: string | null;
  status: string;
  statusName: string;
  orderDate: string;
  total: number;
  itemCount: number;
  totalUnits: number;
  thumbnails: (string | null)[];
};

type OrderLine = {
  orderItemId: number;
  productId: number;
  name: string;
  sku: string;
  imageUrl: string | null;
  packing: number;
  qty: number;
  price: number;
};

type OrderDetail = {
  id: number;
  orderNo: string;
  customerId: number;
  customerName: string;
  repId: number | null;
  repName: string | null;
  status: string;
  statusName: string;
  locationId: number;
  orderDate: string;
  total: number;
  lines: OrderLine[];
};

type Place = { id: number; code: string; name: string; kind: string; isSellable: boolean };

type Carrier = {
  id: number; name: string; shortName: string;
  bookingCharge: number; codFeePercent: number; codSettlementDays: number;
};
type Channel = {
  id: number; key: string; name: string; description: string;
  requiresBilty: boolean; remindAfterDays: number; carriers: Carrier[];
};

const CHANNEL_ICON: Record<string, typeof Truck> = {
  local: Store, online: Send, cargo: Truck, logistics: PackageCheck,
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

type Shortage = { sku: string | null; name: string; needed: number; onHand: number; shortBy: number };

export default function PackingPage() {
  const router = useRouter();

  const [salesPeople, setSalesPeople] = React.useState<RepOption[]>([]);
  const [customers, setCustomers] = React.useState<CustomerOption[]>([]);
  const [repId, setRepId] = React.useState<number | "">("");
  const [customerId, setCustomerId] = React.useState<number | "">("");

  const [orders, setOrders] = React.useState<PackableOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = React.useState(false);
  const [pickOpen, setPickOpen] = React.useState(false);

  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [orderLoading, setOrderLoading] = React.useState(false);
  const [qty, setQty] = React.useState<Record<number, string>>({}); // orderItemId -> text
  const [shortages, setShortages] = React.useState<Shortage[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  /* "Ready to pack" -- how many, in total, right now. Shown once, at the top,
     so an empty desk knows immediately there is nothing waiting. */
  const [readyCount, setReadyCount] = React.useState<number | null>(null);

  const loadLookups = React.useCallback(async () => {
    try {
      const res = await axios.get<{ salesPeople: RepOption[]; customers: CustomerOption[]; count: number }>(
        `${API_BASE_URL}/packing/lookups`, { headers: authHeader() });
      setSalesPeople(res.data.salesPeople);
      setCustomers(res.data.customers);
      setReadyCount(res.data.count);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the packing screen."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void loadLookups();
  }, [loadLookups]);

  const loadOrders = React.useCallback(async (rep: number | "", cust: number | "") => {
    setOrdersLoading(true);
    try {
      const params: Record<string, number> = {};
      if (rep !== "") params.salesPersonId = rep;
      if (cust !== "") params.customerId = cust;
      const res = await axios.get<{ items: PackableOrder[] }>(
        `${API_BASE_URL}/packing/orders`, { headers: authHeader(), params });
      setOrders(res.data.items);
    } catch (e) {
      toast.error("Could not load orders", { description: apiMessage(e, "Please try again.") });
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void loadOrders(repId, customerId);
  }, [repId, customerId, loadOrders]);

  const loadOrder = React.useCallback(async (id: number) => {
    setOrderLoading(true);
    setShortages([]);
    try {
      const res = await axios.get<OrderDetail>(`${API_BASE_URL}/packing/orders/${id}`, { headers: authHeader() });
      setOrder(res.data);
      setQty(Object.fromEntries(res.data.lines.map((l) => [l.orderItemId, String(l.qty)])));
      /* Picking an order sets both boxes above it -- the reverse of the
         reverse flow, and the one case that always has an unambiguous answer:
         an order has exactly one customer and, on a ready order, one rep. */
      setRepId(res.data.repId ?? "");
      setCustomerId(res.data.customerId);
    } catch (e) {
      toast.error("Could not open that order", { description: apiMessage(e, "Please try again.") });
      setOrder(null);
    } finally {
      setOrderLoading(false);
    }
  }, []);

  /* Customer picked first: set the rep above it ONLY when there is exactly
     one name to guess -- a shop with ready orders from two different reps
     leaves the box open rather than picking one of them at random. Never
     overrides a rep already chosen. */
  function pickCustomer(id: number) {
    setCustomerId(id);
    if (repId === "") {
      const found = customers.find((c) => c.id === id);
      if (found?.repIds.length === 1) setRepId(found.repIds[0]);
    }
  }

  function pickRep(id: number | "") {
    setRepId(id);
    /* A customer that no longer belongs to the newly-picked rep is cleared,
       not silently left pointing at somebody else's shop. */
    if (id !== "" && customerId !== "") {
      const stillTheirs = customers.find((c) => c.id === customerId)?.repIds.includes(id);
      if (!stillTheirs) setCustomerId("");
    }
    setOrder(null);
  }

  const visibleCustomers = repId === "" ? customers : customers.filter((c) => c.repIds.includes(repId));

  function setLineQty(orderItemId: number, text: string) {
    setQty((q) => ({ ...q, [orderItemId]: text }));
  }

  /** Whichever lines were typed to less than what was ordered. Empty means "send everything". */
  function reducedLines(): { productId: number; qty: number }[] {
    if (!order) return [];
    const out: { productId: number; qty: number }[] = [];
    for (const l of order.lines) {
      const n = Math.floor(Number(qty[l.orderItemId]) || 0);
      if (n < l.qty) out.push({ productId: l.productId, qty: Math.max(0, n) });
    }
    return out;
  }

  const anyZero = order?.lines.some((l) => (Math.floor(Number(qty[l.orderItemId]) || 0)) <= 0) ?? false;
  const totalAtBase = order
    ? order.lines.reduce((s, l) => s + (Math.floor(Number(qty[l.orderItemId]) || 0)) * l.price, 0)
    : 0;

  const [step, setStep] = React.useState<"lines" | "logistics">("lines");
  const [dispatching, setDispatching] = React.useState(false);
  const [dispatched, setDispatched] = React.useState(false);

  async function commitQuantities() {
    if (!order) return;
    if (anyZero) { toast.error("Every line needs at least one piece, or take it off the order first."); return; }

    setDispatching(true);
    setShortages([]);
    try {
      const lines = reducedLines();
      await axios.patch(
        `${API_BASE_URL}/sales/orders/${order.id}/status`,
        { statusKey: "DISPATCHED", locationId: dispatchLocationId || null, lines: lines.length ? lines : null },
        { headers: authHeader() }
      );
      setDispatched(true);
      setStep("logistics");
      toast.success(`${order.orderNo} dispatched`, {
        description: lines.length
          ? "Sent with a reduced quantity. The salesperson, accountant and Super Admin were told."
          : "Sent in full. Now book how it is going out.",
      });
    } catch (e) {
      const short = axios.isAxiosError(e)
        ? (e.response?.data as { shortages?: Shortage[] })?.shortages
        : undefined;
      if (short?.length) setShortages(short);
      /* "Say which place" comes back with no shortages -- the location box is
         required before anything else is even checked. */
      toast.error("Not dispatched", { description: apiMessage(e, "Please try again.") });
    } finally {
      setDispatching(false);
    }
  }

  /* ── the location the goods go out of -- the same box the order detail
     page's own dispatch dialog asks, from the same GET /sales/lookups. ── */
  const [places, setPlaces] = React.useState<Place[]>([]);
  const [dispatchLocationId, setDispatchLocationId] = React.useState<number>(0);
  React.useEffect(() => {
    axios.get<{ locations: Place[] }>(`${API_BASE_URL}/sales/lookups`, { headers: authHeader() })
      .then((res) => {
        const sellable = (res.data.locations ?? []).filter((l) => l.isSellable);
        setPlaces(sellable);
        setDispatchLocationId((cur) => cur || sellable[0]?.id || 0);
      })
      .catch(() => undefined);
  }, []);

  function reset() {
    setOrder(null);
    setStep("lines");
    setDispatched(false);
    setShortages([]);
    void loadLookups();
    void loadOrders(repId, customerId);
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Daily Work" }, { label: "Packing" }]}
        title="Packing"
        subtitle={readyCount === null ? "Loading…" : `${readyCount} order${readyCount === 1 ? "" : "s"} waiting to be packed.`}
        actions={
          <Button variant="ghost" size="md" className="gap-1.5" asChild>
            <Link href="/delivery"><Truck /> Track dispatches</Link>
          </Button>
        }
      />

      {error ? (
        <Card><CardBody className="text-center py-10">
          <AlertCircle className="size-8 text-danger mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
          <Button variant="ghost" className="mt-2" onClick={() => { setLoading(true); void loadLookups(); }}>Try again</Button>
        </CardBody></Card>
      ) : loading ? (
        <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-64" /></div>
      ) : (
        <div className="space-y-4">
          {/* THE THREE DROPDOWNS */}
          <Card>
            <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Salesperson</Label>
                <SelectNative value={repId === "" ? "" : String(repId)}
                  onChange={(e) => pickRep(e.target.value ? Number(e.target.value) : "")}>
                  <option value="">Every salesperson</option>
                  {salesPeople.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </SelectNative>
              </div>
              <div>
                <Label>Customer</Label>
                <SelectNative value={customerId === "" ? "" : String(customerId)}
                  onChange={(e) => { const v = e.target.value ? Number(e.target.value) : ""; if (v === "") { setCustomerId(""); setOrder(null); } else pickCustomer(v); }}>
                  <option value="">Every customer</option>
                  {visibleCustomers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectNative>
              </div>
              <div>
                <Label>Order</Label>
                <Popover open={pickOpen} onOpenChange={setPickOpen}>
                  <PopoverTrigger asChild>
                    <button type="button"
                      className="w-full flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-3 h-10 text-sm hover:border-brand-yellow focus:outline-none focus:ring-2 focus:ring-brand-yellow">
                      <span className="truncate text-left">
                        {order ? `${order.orderNo} · ${order.customerName}` : "Pick an order"}
                      </span>
                      <Search className="size-4 text-slate-400 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(96vw,44rem)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Order number or shop name…" />
                      <CommandList className="max-h-[72vh]">
                        {ordersLoading ? (
                          <div className="p-4 space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
                          </div>
                        ) : (
                          <>
                            <CommandEmpty>Nothing waiting to be packed.</CommandEmpty>
                            <CommandGroup heading={`${orders.length} ready to pack`}>
                              {orders.map((o) => (
                                <CommandItem key={o.id} value={`${o.orderNo} ${o.customerName}`} className="gap-4 py-3"
                                  onSelect={() => { setPickOpen(false); void loadOrder(o.id); }}>
                                  <div className="flex -space-x-3 shrink-0">
                                    {(o.thumbnails.length ? o.thumbnails : [null]).slice(0, 3).map((img, i) => (
                                      <div key={i} className="ring-2 ring-white dark:ring-navy-800 rounded-lg">
                                        <ProductImage url={img} name={o.customerName} size="md" zoom={false} />
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-base font-semibold text-navy-900 dark:text-white truncate">
                                      {o.customerName}
                                    </div>
                                    <div className="text-xs tabular text-slate-500 dark:text-slate-400 mt-1">
                                      {o.orderNo} · {o.repName ?? "no rep"} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"}, {o.totalUnits} pcs
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="tabular text-base font-bold text-navy-900 dark:text-white">{formatMoney(o.total)}</div>
                                    <StatusPill variant={o.status === "AT_ORDER_DEPT" ? "info" : "warning"} className="mt-1">
                                      {o.statusName}
                                    </StatusPill>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </CardBody>
          </Card>

          {/* THE ORDER ITSELF */}
          {orderLoading ? (
            <Card><CardBody><Skeleton className="h-72" /></CardBody></Card>
          ) : !order ? (
            <Card>
              <EmptyState icon={Package} title="Pick an order to start"
                description="Choose a salesperson, a customer, or an order directly -- the other two boxes fill themselves in." />
            </Card>
          ) : dispatched && step === "logistics" ? (
            <LogisticsStep
              order={order}
              places={places}
              locationId={dispatchLocationId}
              onDone={() => { toast.success("On its way", { description: `${order.orderNo} is booked.` }); router.push("/delivery"); }}
              onCancel={reset}
            />
          ) : (
            <>
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div>
                      <div className="text-base font-semibold text-navy-900 dark:text-white">{order.orderNo}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {order.customerName} · {order.repName ?? "no rep"} · {formatDate(order.orderDate)}
                      </div>
                    </div>
                    <StatusPill variant={order.status === "AT_ORDER_DEPT" ? "info" : "warning"}>{order.statusName}</StatusPill>
                  </div>

                  <div className="mt-2">
                    <Label>Sending from</Label>
                    <SelectNative value={dispatchLocationId || ""} onChange={(e) => setDispatchLocationId(Number(e.target.value))}>
                      {places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </SelectNative>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-1">Items</h3>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mb-3">
                    Price is the Super Admin&apos;s selling price. Quantity may be reduced, never raised above what was ordered.
                  </p>
                  <div className="space-y-2">
                    {order.lines.map((l) => {
                      const val = qty[l.orderItemId] ?? String(l.qty);
                      const n = Math.floor(Number(val) || 0);
                      const short = shortages.find((s) => s.sku === l.sku);
                      const reduced = n < l.qty;
                      return (
                        <div key={l.orderItemId} className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg border",
                          short ? "border-danger/50 bg-danger/5"
                            : reduced ? "border-warning/50 bg-warning/5" : "border-slate-200 dark:border-navy-700"
                        )}>
                          <ProductImage url={l.imageUrl} name={l.name} size="lg" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-navy-900 dark:text-white line-clamp-2">{l.name}</div>
                            <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">
                              {l.sku} · ordered {l.qty} · {formatMoney(l.price)} each
                            </div>
                            {short && (
                              <div className="text-2xs text-danger mt-1">
                                Only {short.onHand} on the shelf -- short by {short.shortBy}.
                              </div>
                            )}
                          </div>
                          <div className="w-24 shrink-0">
                            <Input type="number" inputMode="numeric" min={0} max={l.qty}
                              className="text-center tabular"
                              value={val}
                              onChange={(e) => setLineQty(l.orderItemId, e.target.value)}
                              onBlur={() => {
                                const clamped = Math.max(0, Math.min(l.qty, Math.floor(Number(val) || 0)));
                                setLineQty(l.orderItemId, String(clamped));
                              }} />
                          </div>
                          <div className="w-28 text-right shrink-0 tabular text-sm font-bold text-navy-900 dark:text-white">
                            {formatMoney(n * l.price)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-navy-700">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Total at base price</span>
                    <span className="tabular text-base font-bold text-navy-900 dark:text-white">{formatMoney(totalAtBase)}</span>
                  </div>

                  {shortages.length > 0 && (
                    <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-danger/5 border border-danger/30">
                      <AlertTriangle className="size-4 text-danger shrink-0 mt-0.5" />
                      <p className="text-xs text-danger">
                        {places.find((p) => p.id === dispatchLocationId)?.name} does not have enough on the shelf for
                        {" "}{shortages.length} {shortages.length === 1 ? "item" : "items"}. Reduce the quantity or pick
                        another place to send from.
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>

              <div className="flex justify-end">
                <Button variant="accent" size="lg" className="gap-1.5" disabled={dispatching || !dispatchLocationId}
                  onClick={() => void commitQuantities()}>
                  {dispatching ? <><Loader2 className="size-4 animate-spin" />Dispatching…</> : <>Next <ChevronRight className="size-4" /></>}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

/* ─────────────────────────── step 2: logistics ─────────────────────────── */

function LogisticsStep({
  order, places, locationId, onDone, onCancel,
}: {
  order: OrderDetail;
  places: Place[];
  locationId: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [channels, setChannels] = React.useState<Channel[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [channelId, setChannelId] = React.useState(0);
  const [carrierId, setCarrierId] = React.useState<number | null>(null);
  const [tracking, setTracking] = React.useState("");
  const [expected, setExpected] = React.useState(() => addDaysISO(todayISO(), 2));
  const [parcels, setParcels] = React.useState("1");
  const [weightKg, setWeightKg] = React.useState("0");
  const [cod, setCod] = React.useState("0");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    axios.get<{ channels: Channel[] }>(`${API_BASE_URL}/dispatch/lookups`, { headers: authHeader() })
      .then((res) => {
        setChannels(res.data.channels);
        const first = res.data.channels[0];
        setChannelId(first?.id ?? 0);
        setCarrierId(first?.carriers[0]?.id ?? null);
      })
      .catch((e) => setLoadError(apiMessage(e, "Could not load the delivery options.")));
  }, []);

  const channel = channels?.find((c) => c.id === channelId) ?? null;
  const carrier = channel?.carriers.find((c) => c.id === carrierId) ?? null;
  const missingRef = (channel?.requiresBilty ?? false) && tracking.trim().length === 0;

  async function book() {
    if (!channel) return;
    if (missingRef) {
      toast.error("Bilty number needed", { description: "Freight cannot be traced without it." });
      return;
    }
    setSaving(true);
    try {
      await axios.post(
        `${API_BASE_URL}/dispatch/${order.id}/dispatch`,
        {
          channelId: channel.id,
          courierId: carrierId,
          trackingNo: tracking.trim() || null,
          bookedDate: todayISO(),
          expectedDate: expected || null,
          parcels: Number(parcels) || 1,
          weightKg: Number(weightKg) || 0,
          codAmount: Number(cod) || 0,
          bookingCharge: carrier?.bookingCharge ?? 0,
          notes: notes.trim() || null,
        },
        { headers: authHeader() }
      );
      onDone();
    } catch (e) {
      toast.error("Not booked yet", {
        description: apiMessage(e, "The order has already left the shelf -- try booking the courier again."),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2 mb-1">
          <Check className="size-4 text-success" />
          <span className="text-sm font-semibold text-navy-900 dark:text-white">
            {order.orderNo} left {places.find((p) => p.id === locationId)?.name}
          </span>
        </div>
        <p className="text-2xs text-slate-500 dark:text-slate-400 mb-4">
          Now say how it is going out. This can be tried again if it does not save the first time --
          the order will not be sent twice.
        </p>

        {loadError ? (
          <p className="text-sm text-danger">{loadError}</p>
        ) : !channels ? (
          <Skeleton className="h-48" />
        ) : (
          <>
            <Label>How is it going?</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5 mb-4">
              {channels.map((ch) => {
                const Icon = CHANNEL_ICON[ch.key] ?? Truck;
                const active = channelId === ch.id;
                return (
                  <button key={ch.id} type="button" onClick={() => { setChannelId(ch.id); setCarrierId(ch.carriers[0]?.id ?? null); }}
                    className={cn("text-left p-3 rounded-lg border-2 transition-colors",
                      active ? "border-brand-yellow bg-brand-yellow/5" : "border-slate-200 dark:border-navy-700 hover:border-slate-300")}>
                    <div className="flex items-center gap-2">
                      <Icon className={cn("size-4", active ? "text-brand-yellow" : "text-slate-400")} />
                      <span className="text-sm font-semibold text-navy-900 dark:text-white">{ch.name}</span>
                    </div>
                    <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">{ch.description}</p>
                  </button>
                );
              })}
            </div>

            {channel && channel.carriers.length > 0 && (
              <div className="mb-3">
                <Label>Who is carrying it</Label>
                <SelectNative value={carrierId ?? ""} onChange={(e) => setCarrierId(e.target.value ? Number(e.target.value) : null)}>
                  {channel.carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectNative>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="flex items-center gap-1"><Hash className="size-3.5" />Bilty / tracking {channel?.requiresBilty && <span className="text-danger">*</span>}</Label>
                <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="e.g. TCS12345" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Calendar className="size-3.5" />Expected by</Label>
                <DateInput value={expected} onChange={(e) => setExpected(e.target.value)} />
              </div>
              <div>
                <Label>Parcels</Label>
                <Input type="number" min={1} value={parcels} onChange={(e) => setParcels(e.target.value)} />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" min={0} step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Cash on delivery</Label>
                <Input type="number" min={0} value={cod} onChange={(e) => setCod(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the courier or the office should know" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 mt-4">
              <Button variant="ghost" onClick={onCancel}><ArrowLeft className="size-4" />Back to Packing</Button>
              <Button variant="accent" size="lg" className="gap-1.5" disabled={saving} onClick={() => void book()}>
                {saving ? <><Loader2 className="size-4 animate-spin" />Booking…</> : <><Send className="size-4" />Dispatch</>}
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
