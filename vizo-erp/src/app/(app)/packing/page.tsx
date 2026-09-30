"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Package, Search, ChevronRight, ArrowLeft, Loader2, AlertCircle, AlertTriangle,
  Send, Store, Truck, PackageCheck, Check, Hash, Calendar, Plus, Lock,
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
import { API_BASE_URL, authHeader, useSession } from "@/components/providers/session-provider";
import { ProductImage } from "@/components/products/product-image";
import { RecentOrders, statusVariant } from "@/components/packing/recent-orders";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   THE ORDER DEPARTMENT'S HOME PAGE, since 23 September (Role.HomePath -- no
   proxy or login-page code needed, migration 25 is the whole change on that
   side).

   THREE DROPDOWNS THAT NARROW EACH OTHER, in any direction:

     Sales      every salesperson.
     Customer   narrows to that rep's customers -- or, picked FIRST, sets the
                rep above it when the shop belongs to exactly one rep (the
                reps credited on its orders, plus its assigned rep).
     Order      narrows to whichever of the two is filled in; picking an order
                directly sets both boxes above it from the order's own record.

   EVERYTHING IS LISTED, NOT ONLY WHAT IS READY (the owner, 30 September):
   every salesperson, every customer, every order, each order with its status
   beside it -- the desk has to be able to find an order somebody is asking
   about even when it is not invoiced yet. The ready ones (INVOICED, and
   AT_ORDER_DEPT "Processing in Order Dept") come first in the order box.
   Being LISTED is no longer the same as being PACKABLE: pressing Next on an
   order that is not at one of those two statuses is refused, right here, with
   the owner's own sentence (NOT_INVOICED) -- the button stays pressable, so
   the desk is told why instead of facing a greyed-out button that says
   nothing. SalesController.SetOrderStatus refuses it too, in the same words.

   THE LINES ARE READ-ONLY (same day). The desk used to be able to reduce a
   quantity here; that right is gone. Only the Super Admin and the accountant
   change an order's quantities, on the order's own edit screen, and this page
   dispatches the order exactly as it stands (no `lines` in the PATCH).

   NO MONEY FOR THE ORDER DESK (26 September). For the order-dept role the API
   sends every total and price as 0 with moneyHidden, and this page draws no
   price, no total and no COD box -- the courier's COD is worked out on the
   server when the desk books (DispatchController.Dispatch). The Super Admin,
   who can open this page too, still sees the figures.

   THE PACK BUTTON on each row of the recent list at the top (RecentOrders)
   runs the same loadOrder a pick from the order box does: the order's own
   record sets the salesperson and customer boxes, its lines load, and the
   page scrolls down to the boxes. The cascade cannot race the dropdowns'
   own loading: the boxes hold plain ids in state, so whichever arrives
   first -- the lookups or the order -- the other simply renders against it;
   a name the lists do not carry (a rep since switched off, say) is added as
   an option from the order itself so the box never shows blank; and a
   second Pack pressed before the first has answered wins (loadSeq).

   TWO STEPS TO DISPATCH, not one call: Next dispatches -- this is the moment
   stock actually leaves the shelf, so it has to be a real step, not a page
   transition with nothing behind it -- and only once that has succeeded does
   the courier step appear, booking through the same endpoint /dispatch
   already uses. If booking the courier fails, the order stays dispatched and
   the screen offers to try booking again rather than repeating the part that
   already worked.
   ─────────────────────────────────────────────────────────────────────────── */

type RepOption = { id: number; name: string };
/** repIds can hold more than one name -- the same shop can have orders from more than one rep. */
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
  moneyHidden?: boolean;
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

/** The two statuses an order may be packed and dispatched from (OrderWorkflow). */
const PACKABLE = ["INVOICED", "AT_ORDER_DEPT"];
const isPackable = (status: string) => PACKABLE.includes(status);

/** The owner's own words, exactly -- SalesController.SetOrderStatus answers with the same sentence. */
const NOT_INVOICED = "This order is not invoiced by super admin or accountant";

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

type Shortage = { sku: string | null; name: string; needed: number; onHand: number; shortBy: number };

export default function PackingPage() {
  const router = useRouter();
  const { role } = useSession();

  const [salesPeople, setSalesPeople] = React.useState<RepOption[]>([]);
  const [customers, setCustomers] = React.useState<CustomerOption[]>([]);
  const [repId, setRepId] = React.useState<number | "">("");
  const [customerId, setCustomerId] = React.useState<number | "">("");

  const [orders, setOrders] = React.useState<PackableOrder[]>([]);
  const [ordersTruncated, setOrdersTruncated] = React.useState(false);
  const [ordersMoneyHidden, setOrdersMoneyHidden] = React.useState(false);
  const [ordersLoading, setOrdersLoading] = React.useState(false);
  const [pickOpen, setPickOpen] = React.useState(false);

  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [orderLoading, setOrderLoading] = React.useState(false);
  const [shortages, setShortages] = React.useState<Shortage[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  /* The desk sees no money. The role says so from the first render; the
     API's own moneyHidden flags cover the moment before the session has
     loaded (and the API has already zeroed the figures either way). */
  const noMoney = role === "order-dept" || ordersMoneyHidden || order?.moneyHidden === true;

  /* "Ready to pack" -- how many, in total, right now. Shown once, at the top,
     so an empty desk knows immediately there is nothing waiting. */
  const [readyCount, setReadyCount] = React.useState<number | null>(null);

  /* Bumped after a dispatch so the recent list at the top re-reads, and the
     order just sent stops saying "Ready for packing". */
  const [recentKey, setRecentKey] = React.useState(0);

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
      const res = await axios.get<{ items: PackableOrder[]; truncated?: boolean; moneyHidden?: boolean }>(
        `${API_BASE_URL}/packing/orders`, { headers: authHeader(), params });
      setOrders(res.data.items);
      setOrdersTruncated(res.data.truncated === true);
      setOrdersMoneyHidden(res.data.moneyHidden === true);
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

  const [step, setStep] = React.useState<"lines" | "logistics">("lines");
  const [dispatching, setDispatching] = React.useState(false);
  const [dispatched, setDispatched] = React.useState(false);

  /* Only the LAST order asked for may land. Two quick Pack presses (or a Pack
     and then a pick from the order box) would otherwise race, and whichever
     answer came back second would win -- not necessarily the one pressed
     second. */
  const loadSeq = React.useRef(0);

  /* ── PACK, from the recent list at the top ──
     Scrolls to the three boxes as soon as they are on screen: straight away
     normally (the skeleton shows where the lines are coming), or the moment
     the lookups finish if Pack was pressed before they had. A ref, not
     state, so asking for the scroll is not itself a render. */
  const pickerRef = React.useRef<HTMLDivElement>(null);
  const pendingScroll = React.useRef(false);

  const loadOrder = React.useCallback(async (id: number) => {
    const seq = ++loadSeq.current;
    setOrderLoading(true);
    setShortages([]);
    /* A new order starts at its lines, whatever the previous one had got to. */
    setStep("lines");
    setDispatched(false);
    try {
      const res = await axios.get<OrderDetail>(`${API_BASE_URL}/packing/orders/${id}`, { headers: authHeader() });
      if (seq !== loadSeq.current) return;
      setOrder(res.data);
      /* Picking an order sets both boxes above it -- the reverse of the
         reverse flow, and the one case that always has an unambiguous answer:
         an order has exactly one customer and one credited rep. */
      setRepId(res.data.repId ?? "");
      setCustomerId(res.data.customerId);
    } catch (e) {
      if (seq !== loadSeq.current) return;
      toast.error("Could not open that order", { description: apiMessage(e, "Please try again.") });
      setOrder(null);
      pendingScroll.current = false;
    } finally {
      if (seq === loadSeq.current) setOrderLoading(false);
    }
  }, []);

  const packFromList = React.useCallback((id: number) => {
    pendingScroll.current = true;
    setPickOpen(false);
    void loadOrder(id);
  }, [loadOrder]);

  React.useEffect(() => {
    if (!pendingScroll.current || loading || !pickerRef.current) return;
    pendingScroll.current = false;
    pickerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading, orderLoading, order]);

  /* Customer picked first: set the rep above it ONLY when there is exactly
     one name to guess -- a shop with orders from two different reps leaves
     the box open rather than picking one of them at random. Never overrides
     a rep already chosen. */
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

  /* The options each box renders. The chosen value is ALWAYS among them --
     an order opened by Pack may be credited to somebody the sales list does
     not carry (keyed in by a non-rep, or a rep switched off), or to a shop
     the chosen rep's narrowing would hide; a <select> whose value is not
     one of its options shows the first option instead, which would be a
     lie. The name then comes from the order itself. */
  const repOptions = React.useMemo(() => {
    if (repId === "" || salesPeople.some((r) => r.id === repId)) return salesPeople;
    const name = order?.repId === repId ? order.repName : null;
    return [...salesPeople, { id: repId, name: name ?? `Salesperson ${repId}` }];
  }, [salesPeople, repId, order]);

  const customerOptions = React.useMemo(() => {
    const visible = repId === "" ? customers : customers.filter((c) => c.repIds.includes(repId));
    if (customerId === "" || visible.some((c) => c.id === customerId)) return visible;
    const known = customers.find((c) => c.id === customerId);
    const name = known?.name ?? (order?.customerId === customerId ? order.customerName : `Customer ${customerId}`);
    return [...visible, { id: customerId, name, repIds: known?.repIds ?? [] }];
  }, [customers, repId, customerId, order]);

  const readyOrders = orders.filter((o) => isPackable(o.status));
  const otherOrders = orders.filter((o) => !isPackable(o.status));

  const totalAtBase = order ? order.lines.reduce((s, l) => s + l.qty * l.price, 0) : 0;

  async function dispatchOrder() {
    if (!order) return;
    /* Refused here first, before anything is sent -- the API refuses it too,
       but the desk should not have to wait for a round trip to be told. */
    if (!isPackable(order.status)) { toast.error(NOT_INVOICED); return; }
    if (!dispatchLocationId) { toast.error("Say which place it is going out of."); return; }

    setDispatching(true);
    setShortages([]);
    try {
      /* No `lines`: the order goes out exactly as ordered. */
      await axios.patch(
        `${API_BASE_URL}/sales/orders/${order.id}/status`,
        { statusKey: "DISPATCHED", locationId: dispatchLocationId },
        { headers: authHeader() }
      );
      setDispatched(true);
      setStep("logistics");
      setRecentKey((k) => k + 1);
      toast.success(`${order.orderNo} dispatched`, { description: "Sent in full. Now book how it is going out." });
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
    setRecentKey((k) => k + 1);
    void loadLookups();
    void loadOrders(repId, customerId);
  }

  function orderRow(o: PackableOrder) {
    return (
      <CommandItem key={o.id} value={`${o.orderNo} ${o.customerName} ${o.statusName}`} className="gap-3 sm:gap-4 py-3"
        onSelect={() => { setPickOpen(false); void loadOrder(o.id); }}>
        <div className="hidden sm:flex -space-x-3 shrink-0">
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
          {!noMoney && (
            <div className="tabular text-base font-bold text-navy-900 dark:text-white">{formatMoney(o.total)}</div>
          )}
          <StatusPill variant={statusVariant(o.status)} className={cn(!noMoney && "mt-1")}>
            {o.statusName}
          </StatusPill>
        </div>
      </CommandItem>
    );
  }

  const packable = order ? isPackable(order.status) : false;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Daily Work" }, { label: "Packing" }]}
        title="Packing"
        subtitle={readyCount === null ? "Loading…" : `${readyCount} order${readyCount === 1 ? "" : "s"} waiting to be packed.`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href="/delivery"><Truck /> <span className="hidden sm:inline">Track dispatches</span><span className="sm:hidden">Track</span></Link>
            </Button>
            {/* The order desk takes orders too, for any customer, on behalf
                of the salesperson each belongs to (26 September). */}
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/packing/new-order"><Plus /> New order</Link>
            </Button>
          </div>
        }
      />

      {/* Everything created in the last seven days, whatever its status, plus
          every order handed to the desk (AT_ORDER_DEPT) however old -- no
          money on it (components/packing/recent-orders.tsx). Its Pack
          buttons fill the boxes below. */}
      <RecentOrders onPack={packFromList} refreshKey={recentKey} />

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
          {/* THE THREE DROPDOWNS -- scroll-mt clears the sticky top bar when Pack scrolls here. */}
          <div ref={pickerRef} className="scroll-mt-20">
          <Card>
            <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Salesperson</Label>
                <SelectNative value={repId === "" ? "" : String(repId)}
                  onChange={(e) => pickRep(e.target.value ? Number(e.target.value) : "")}>
                  <option value="">Every salesperson</option>
                  {repOptions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </SelectNative>
              </div>
              <div>
                <Label>Customer</Label>
                <SelectNative value={customerId === "" ? "" : String(customerId)}
                  onChange={(e) => { const v = e.target.value ? Number(e.target.value) : ""; if (v === "") { setCustomerId(""); setOrder(null); } else pickCustomer(v); }}>
                  <option value="">Every customer</option>
                  {customerOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                      <CommandInput placeholder="Order number, shop name or status…" />
                      <CommandList className="max-h-[72vh]">
                        {ordersLoading ? (
                          <div className="p-4 space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
                          </div>
                        ) : (
                          <>
                            <CommandEmpty>No orders here.</CommandEmpty>
                            {readyOrders.length > 0 && (
                              <CommandGroup heading={`${readyOrders.length} ready to pack`}>
                                {readyOrders.map(orderRow)}
                              </CommandGroup>
                            )}
                            {otherOrders.length > 0 && (
                              <CommandGroup heading={ordersTruncated
                                ? `Not invoiced yet or already sent -- latest ${otherOrders.length}; pick a salesperson or customer to see more`
                                : `${otherOrders.length} not invoiced yet or already sent`}>
                                {otherOrders.map(orderRow)}
                              </CommandGroup>
                            )}
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </CardBody>
          </Card>
          </div>

          {/* THE ORDER ITSELF */}
          {orderLoading ? (
            <Card><CardBody><Skeleton className="h-72" /></CardBody></Card>
          ) : !order ? (
            <Card>
              <EmptyState icon={Package} title="Pick an order to start"
                description="Choose a salesperson, a customer, or an order directly -- the other two boxes fill themselves in. Or press Pack on an order above." />
            </Card>
          ) : dispatched && step === "logistics" ? (
            <LogisticsStep
              order={order}
              places={places}
              locationId={dispatchLocationId}
              noMoney={noMoney}
              onDone={() => { toast.success("On its way", { description: `${order.orderNo} is booked.` }); router.push("/delivery"); }}
              onCancel={reset}
            />
          ) : (
            <>
              <Card>
                <CardBody>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-navy-900 dark:text-white">{order.orderNo}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {order.customerName} · {order.repName ?? "no rep"} · {formatDate(order.orderDate)}
                      </div>
                    </div>
                    <StatusPill variant={statusVariant(order.status)} className="shrink-0">{order.statusName}</StatusPill>
                  </div>

                  {/* Said up front, not only when Next is pressed -- but Next
                      still answers too, with the owner's own sentence. */}
                  {!packable && (
                    <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-warning/5 border border-warning/30">
                      <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
                      <p className="text-xs text-warning-dark dark:text-warning-light">
                        {["DISPATCHED", "DELIVERED", "RETURNED"].includes(order.status)
                          ? <>Not ready to pack: this order is already {order.statusName.toLowerCase()}.</>
                          : <>Not ready to pack: this order is {order.statusName.toLowerCase()}. It can be packed
                              once the Super Admin or the accountant has invoiced it.</>}
                      </p>
                    </div>
                  )}

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
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mb-3 flex items-start gap-1">
                    <Lock className="size-3 shrink-0 mt-0.5" />
                    <span>
                      {noMoney ? "" : "Price is the Super Admin's selling price. "}
                      Sent exactly as ordered. Only the Super Admin or the accountant can change a quantity,
                      on the order&apos;s own edit screen.
                    </span>
                  </p>
                  <div className="space-y-2">
                    {order.lines.map((l) => {
                      const short = shortages.find((s) => s.sku === l.sku);
                      return (
                        <div key={l.orderItemId} className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg border",
                          short ? "border-danger/50 bg-danger/5" : "border-slate-200 dark:border-navy-700"
                        )}>
                          <ProductImage url={l.imageUrl} name={l.name} size="lg" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-navy-900 dark:text-white line-clamp-2">{l.name}</div>
                            <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">
                              {l.sku}{!noMoney && <> · {formatMoney(l.price)} each</>}
                            </div>
                            {short && (
                              <div className="text-2xs text-danger mt-1">
                                Only {short.onHand} on the shelf -- short by {short.shortBy}.
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="tabular text-lg font-bold text-navy-900 dark:text-white">{l.qty}</div>
                            <div className="text-2xs text-slate-500 dark:text-slate-400">pcs</div>
                            {!noMoney && (
                              <div className="tabular text-xs font-semibold text-navy-900 dark:text-white mt-0.5">
                                {formatMoney(l.qty * l.price)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!noMoney && (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-navy-700">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Total at base price</span>
                      <span className="tabular text-base font-bold text-navy-900 dark:text-white">{formatMoney(totalAtBase)}</span>
                    </div>
                  )}

                  {shortages.length > 0 && (
                    <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-danger/5 border border-danger/30">
                      <AlertTriangle className="size-4 text-danger shrink-0 mt-0.5" />
                      <p className="text-xs text-danger">
                        {places.find((p) => p.id === dispatchLocationId)?.name} does not have enough on the shelf for
                        {" "}{shortages.length} {shortages.length === 1 ? "item" : "items"}. Pick another place to send
                        from, or ask the Super Admin or the accountant to change the order.
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>

              <div className="flex justify-end">
                {/* Never disabled for the status -- pressing it on an order that
                    is not invoiced says why (NOT_INVOICED) instead. */}
                <Button variant="accent" size="lg" className="gap-1.5" disabled={dispatching}
                  onClick={() => void dispatchOrder()}>
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
  order, places, locationId, noMoney, onDone, onCancel,
}: {
  order: OrderDetail;
  places: Place[];
  locationId: number;
  /** The order desk types no COD -- the server charges what is unpaid on the order when it books. */
  noMoney: boolean;
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
          /* For the order desk the server works the COD out itself and
             ignores this -- 0 just says "not typed". */
          codAmount: noMoney ? 0 : Number(cod) || 0,
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
              {/* No COD box for the order desk: it sees no money, and the
                  server charges whatever is unpaid on the order when it books. */}
              {!noMoney && (
                <div className="col-span-2">
                  <Label>Cash on delivery</Label>
                  <Input type="number" min={0} value={cod} onChange={(e) => setCod(e.target.value)} />
                </div>
              )}
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
