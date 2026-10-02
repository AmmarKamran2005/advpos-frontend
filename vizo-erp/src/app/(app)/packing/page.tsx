"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  Package, Search, ChevronRight, Loader2, AlertCircle, AlertTriangle, Truck, Plus, Lock, Pencil,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import {
  DispatchSheet, type Channel, type DispatchLookups, type DispatchOrderDetail,
} from "@/components/delivery/dispatch-sheet";
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
   about even when it is not invoiced yet. The ready ones come first in the
   order box (see READY TO PACK, BY ROLE below). Being LISTED is not the same
   as being PACKABLE: pressing Next on an order that is not ready is refused,
   right here, with the owner's own sentence (NOT_INVOICED / NOT_HANDED_OVER)
   -- the button stays pressable, so the desk is told why instead of facing a
   greyed-out button that says nothing. SalesController.SetOrderStatus
   refuses it too, in the same words.

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

   NEXT ONLY OPENS THE FORM (the owner, 2 October). Next used to dispatch the
   order on the spot and show the courier step afterwards, so an order went
   out the moment somebody pressed Next to have a look at the form. Now:

     Next      opens the "How is it going" form (components/delivery/
               dispatch-sheet.tsx -- the same one /dispatch uses, fields
               unchanged) on the order, which is still NOT dispatched.
               Cancel closes it and nothing has happened.
     Dispatch  (the form's own button) does the two halves in order:
               1. PATCH /sales/orders/{id}/status DISPATCHED + the place --
                  status and stock, the one dispatch path there is
                  (SalesController.SetOrderStatus: shortages, the order-desk
                  rules, the invoice rebuild all live there and stay there);
               2. POST /dispatch/{id}/dispatch -- the booking, with the form's
                  details.
               A refusal in step 1 (a shortage, an order not handed over)
               leaves everything as it was: a shortage closes the form and
               marks the short lines below. A refusal in step 2 means the
               goods HAVE left: the form stays open saying so, and pressing
               Dispatch again retries only the booking. Walking away at that
               point leaves the order dispatched but unbooked, which is the
               state /dispatch exists to list -- and the toast says where to
               finish it.

   Why not one server call doing both in one transaction: the dispatch half
   is a few hundred lines of SetOrderStatus (stock lots, shortages, invoice
   PDF, notifications, the workflow rules another change is editing right
   now), and a second copy of it in DispatchController would drift from the
   first. The form checks everything the booking can refuse for (bilty,
   parcels, COD) BEFORE step 1 runs, so step 2 failing is down to the network
   or a channel switched off in the same minute.

   EDIT (same day). A dispatched order shows Edit instead of Pack, in the
   list at the top and here. It reopens the same form filled in from the
   booked delivery (GET /dispatch/orders/{id}) and Save changes only updates
   that delivery (PUT /dispatch/deliveries/{id}) -- the status stays
   DISPATCHED, no stock moves. An old dispatched order with no delivery
   booked yet gets the plain booking form instead (no status change either).

   READY TO PACK, BY ROLE (same day). The order desk may pack only what the
   Super Admin or the accountant has moved to AT_ORDER_DEPT ("Processing in
   Order Dept"); they themselves may also send an INVOICED order out. For the
   desk anything else is refused, before any request, in the API's own words.
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

/** What the order desk may pack: only what has been handed to it. */
const DESK_READY = ["AT_ORDER_DEPT"];
/** The Super Admin and the accountant may also send an invoiced order straight out. */
const OFFICE_READY = ["INVOICED", "AT_ORDER_DEPT"];
/** The statuses an order sits at before it is invoiced. */
const BEFORE_INVOICED = ["DRAFT", "SUBMITTED", "CONFIRMED", "CREDIT_HOLD"];

/** The owner's own words, exactly -- SalesController.SetOrderStatus answers with the same sentences. */
const NOT_INVOICED = "This order is not invoiced by super admin or accountant";
const NOT_HANDED_OVER = "This order has not been moved to Processing in Order Dept by super admin or accountant";

/** Why an order that is not ready cannot be packed, in the API's words where it has them. */
function notReadyMessage(status: string, statusName: string, orderNo: string) {
  if (BEFORE_INVOICED.includes(status)) return NOT_INVOICED;
  if (status === "INVOICED") return NOT_HANDED_OVER;
  return `${orderNo} is ${statusName.toLowerCase()}, so there is nothing to pack.`;
}

/** Which form is open, on which order: Next (dispatch), Edit (edit), or Edit on an unbooked order (book). */
type FormState = { detail: DispatchOrderDetail; mode: "dispatch" | "edit" | "book" };

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

type Shortage = { sku: string | null; name: string; needed: number; onHand: number; shortBy: number };

export default function PackingPage() {
  const { role } = useSession();

  /* Before the session has loaded the role reads "sales" -- the strict rule
     applies until it is known, never the looser one. */
  const readyStatuses = role === "super-admin" || role === "accountant" ? OFFICE_READY : DESK_READY;
  const isPackable = (status: string) => readyStatuses.includes(status);

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

  /* The "How is it going" form: which order, in which mode, and the delivery
     channels it draws (read once, the first time a form opens). */
  const [form, setForm] = React.useState<FormState | null>(null);
  const [channels, setChannels] = React.useState<Channel[] | null>(null);
  const [opening, setOpening] = React.useState<number | null>(null);
  /* Set the moment the form's Dispatch has taken the order off the shelf --
     so closing the form before the courier is booked can say so. A ref:
     the form reads it after an await, not on a render. */
  const leftShelf = React.useRef(false);

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

  /* The order in the form's own shape (GET /dispatch/orders/{id}: city, the
     suggested channel, whether cash is collected, and the delivery already
     booked) plus the channels, in one round trip's time. */
  async function loadForm(id: number): Promise<DispatchOrderDetail | null> {
    setOpening(id);
    try {
      const [detail, chans] = await Promise.all([
        axios.get<DispatchOrderDetail>(`${API_BASE_URL}/dispatch/orders/${id}`, { headers: authHeader() })
          .then((r) => r.data),
        channels ?? axios.get<DispatchLookups>(`${API_BASE_URL}/dispatch/lookups`, { headers: authHeader() })
          .then((r) => r.data.channels),
      ]);
      setChannels(chans);
      if (chans.length === 0) {
        toast.error("No delivery channels are set up", { description: "Ask the Super Admin to add one." });
        return null;
      }
      return detail;
    } catch (e) {
      toast.error("Could not open the form", { description: apiMessage(e, "Please try again.") });
      return null;
    } finally {
      setOpening(null);
    }
  }

  /* ── NEXT: open the form. Nothing is dispatched here. ── */
  async function openDispatchForm() {
    if (!order) return;
    /* Refused here first, before anything is sent -- the API refuses it too,
       but the desk should not have to wait for a round trip to be told. */
    if (!isPackable(order.status)) {
      toast.error(notReadyMessage(order.status, order.statusName, order.orderNo));
      return;
    }
    if (!dispatchLocationId) { toast.error("Say which place it is going out of."); return; }

    setShortages([]);
    const detail = await loadForm(order.id);
    if (!detail) return;
    /* Somebody else may have moved it while this screen sat open. */
    if (!isPackable(detail.status)) {
      toast.error(notReadyMessage(detail.status, detail.statusName, detail.orderNo));
      return;
    }
    leftShelf.current = false;
    setForm({ detail, mode: "dispatch" });
  }

  /* ── The form's Dispatch, first half: status and stock. ──
     No `lines`: the order goes out exactly as ordered. Resolves false, with
     nothing moved, when the API refuses -- a shortage closes the form so the
     short lines can be seen below it. */
  async function takeOffShelf(orderId: number): Promise<boolean> {
    setShortages([]);
    try {
      await axios.patch(
        `${API_BASE_URL}/sales/orders/${orderId}/status`,
        { statusKey: "DISPATCHED", locationId: dispatchLocationId },
        { headers: authHeader() }
      );
      leftShelf.current = true;
      setRecentKey((k) => k + 1);
      return true;
    } catch (e) {
      const short = axios.isAxiosError(e)
        ? (e.response?.data as { shortages?: Shortage[] })?.shortages
        : undefined;
      if (short?.length) {
        setShortages(short);
        setForm(null);
      }
      toast.error("Not dispatched", { description: apiMessage(e, "Please try again.") });
      return false;
    }
  }

  /* ── EDIT: a dispatched order's booking, reopened filled in. ── */
  async function openEditForm(id: number) {
    const detail = await loadForm(id);
    if (!detail) return;
    if (detail.status !== "DISPATCHED") {
      toast.error(`${detail.orderNo} is ${detail.statusName.toLowerCase()}`, {
        description: "Only a dispatched order's delivery details can be changed here.",
      });
      return;
    }
    if (detail.delivery && !detail.delivery.editable) {
      toast.error(`${detail.delivery.deliveryNo} can no longer be changed`, {
        description: `It is ${detail.delivery.statusName.toLowerCase()}${detail.delivery.isCodSettled ? " and its COD is settled" : ""}.`,
      });
      return;
    }
    leftShelf.current = false;
    /* Dispatched before a courier was ever booked (old data, or a booking
       that failed and was walked away from): Edit books it -- the plain
       booking form, which leaves the status alone. */
    setForm({ detail, mode: detail.delivery ? "edit" : "book" });
  }

  function formDone() {
    const wasDispatch = form?.mode === "dispatch";
    setForm(null);
    leftShelf.current = false;
    if (wasDispatch) reset();
    else setRecentKey((k) => k + 1);
  }

  function formClosed() {
    const f = form;
    setForm(null);
    if (f?.mode === "dispatch" && leftShelf.current) {
      /* Walked away between the two halves: the goods are out, the courier is
         not booked. Not an error to hide -- say exactly where to finish it. */
      leftShelf.current = false;
      toast.warning(`${f.detail.orderNo} is dispatched, but no courier is booked`, {
        description: "Press Edit on it to book the courier, or book it from the Dispatch screen.",
      });
      reset();
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
      <RecentOrders onPack={packFromList} onEdit={(id) => void openEditForm(id)} refreshKey={recentKey} />

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
                                ? `Not ready yet or already sent -- latest ${otherOrders.length}; pick a salesperson or customer to see more`
                                : `${otherOrders.length} not ready yet or already sent`}>
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
                        {order.status === "DISPATCHED"
                          ? <>Already dispatched. Press Edit to change how it is going -- the courier, bilty,
                              parcels or note. Nothing is sent again.</>
                          : ["DELIVERED", "RETURNED"].includes(order.status)
                          ? <>Not ready to pack: this order is already {order.statusName.toLowerCase()}.</>
                          : BEFORE_INVOICED.includes(order.status)
                          ? <>Not ready to pack: this order is {order.statusName.toLowerCase()}. It can be packed
                              once the Super Admin or the accountant has invoiced it and moved it to
                              Processing in Order Dept.</>
                          : order.status === "INVOICED"
                          ? <>Not ready to pack: invoiced, but not yet moved to Processing in Order Dept by the
                              Super Admin or the accountant.</>
                          : <>Not ready to pack: this order is {order.statusName.toLowerCase()}.</>}
                      </p>
                    </div>
                  )}

                  {/* Where it goes out of -- asked only while it can still go out. */}
                  {order.status !== "DISPATCHED" && (
                    <div className="mt-2">
                      <Label>Sending from</Label>
                      <SelectNative value={dispatchLocationId || ""} onChange={(e) => setDispatchLocationId(Number(e.target.value))}>
                        {places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </SelectNative>
                    </div>
                  )}
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
                {order.status === "DISPATCHED" ? (
                  /* The same Edit the list at the top offers. */
                  <Button variant="outline" size="lg" className="gap-1.5" disabled={opening !== null}
                    onClick={() => void openEditForm(order.id)}>
                    {opening === order.id ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />} Edit
                  </Button>
                ) : (
                  /* Never disabled for the status -- pressing it on an order
                     that is not ready says why (notReadyMessage) instead. It
                     only OPENS the form; nothing is dispatched until the
                     form's own Dispatch button. */
                  <Button variant="accent" size="lg" className="gap-1.5" disabled={opening !== null}
                    onClick={() => void openDispatchForm()}>
                    {opening === order.id ? <><Loader2 className="size-4 animate-spin" />Opening…</> : <>Next <ChevronRight className="size-4" /></>}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* THE "HOW IS IT GOING" FORM -- keyed so each opening starts clean
          (and an Edit starts from what the database holds, not from what
          the last form had typed). */}
      {form && channels && (
        <DispatchSheet
          key={`${form.mode}-${form.detail.id}`}
          order={form.detail}
          channels={channels}
          moneyHidden={noMoney || form.detail.moneyHidden}
          open
          onOpenChange={(v) => { if (!v) formClosed(); }}
          onDispatched={formDone}
          dispatchFirst={form.mode === "dispatch" ? () => takeOffShelf(form.detail.id) : undefined}
          existing={form.mode === "edit" ? form.detail.delivery : null}
        />
      )}
    </>
  );
}
