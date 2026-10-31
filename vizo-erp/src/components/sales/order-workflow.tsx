"use client";

import * as React from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2, ChevronDown, Loader2, Pencil, Trash2, XCircle,
  Truck, Check, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { API_BASE_URL, authHeader, useSession } from "@/components/providers/session-provider";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { fetchOrderStock, OrderStockTable, shortAt, type OrderStock } from "./order-stock";

/* The steps that put an order on the confirmed part of the chain, and the ones
   it is already there from. Moving into the first from anywhere outside the
   second is a CONFIRMATION, and asks the stock question first (the owner,
   21 Oct) -- the API asks it too (SalesController.SetOrderStatus). */
const CONFIRMING_STEPS = ["CONFIRMED", "INVOICED", "AT_ORDER_DEPT"];
const ALREADY_CONFIRMED = [...CONFIRMING_STEPS, "DISPATCHED", "DELIVERED"];

/* ───────────────────────────────────────────────────────────────────────────
   THE ORDER'S JOURNEY, AND WHO MAY MOVE IT

   Every rule here comes from the server. GET /sales/orders/{id}/workflow
   answers three questions in one call -- where the order is, what this person
   may set it to, and what the single obvious next step is -- and this file
   renders the answer. It does not decide anything.

   That is deliberate. The page it replaced held its own copy of the chain, six
   steps long, listing a PACKED status that is not in the workflow and missing
   the four that are. Two copies of a rule is two rules, and the one in the
   browser is the one nobody updates.
   ─────────────────────────────────────────────────────────────────────────── */

export type WorkflowStep = { step: number; key: string; name: string };

/** A place an order can go out of -- GET /sales/lookups. */
type Place = { id: number; code: string; name: string; kind: string; isSellable: boolean };

/** What the API says is missing when a shelf is short (400 from the status endpoint). */
type Shortage = { sku: string | null; name: string; needed: number; onHand: number; shortBy: number };

export type Workflow = {
  current: string;
  step: number | null;
  chain: WorkflowStep[];
  next: string | null;
  nextName: string | null;
  allowed: WorkflowStep[];
  canSetAnything: boolean;
  isMine: boolean;
};

/** GET /sales/orders/{id}/my-permissions */
export type OrderPermissions = {
  isAdmin: boolean;
  isMine: boolean;
  canEdit: boolean;
  /* Whether to draw "Raise invoice" at all. Billing an order is the
     accountant's or the owner's now, so a rep and the order desk never see the
     button -- the API refuses them anyway (OrderWorkflow.MayInvoice), and a
     button that answers 403 is worse than no button. */
  canInvoice: boolean;
  canDelete: boolean;
  editRequested: boolean;
  deleteRequested: boolean;
  canAsk: boolean;
  invoiced: boolean;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/* ─────────────────────────── the pipeline strip ─────────────────────────── */

/**
 * The nine steps, straight from the server, with the one the order is on
 * marked. Statuses that sit off the chain -- declined, cancelled, on hold --
 * have no place on it, so the strip is simply not drawn for them.
 */
export function OrderChain({ workflow }: { workflow: Workflow }) {
  const here = workflow.step;
  if (here === null) return null;

  return (
    <div className="flex items-start justify-between gap-1 overflow-x-auto pb-1">
      {workflow.chain.map((s, i) => {
        const passed = s.step <= here;
        const current = s.step === here;
        return (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center gap-1.5 min-w-14 flex-1">
              <div
                className={cn(
                  "size-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  current
                    ? "bg-brand-yellow text-navy-900 ring-4 ring-brand-yellow/20"
                    : passed
                      ? "bg-success text-white"
                      : "bg-slate-200 dark:bg-navy-700 text-slate-500"
                )}
              >
                {passed && !current ? <CheckCircle2 className="size-4" /> : s.step}
              </div>
              <div
                className={cn(
                  "text-2xs font-semibold uppercase tracking-wider text-center leading-tight",
                  passed ? "text-navy-900 dark:text-white" : "text-slate-400"
                )}
              >
                {s.name}
              </div>
            </div>
            {i < workflow.chain.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mt-4 min-w-2",
                  s.step < here ? "bg-success" : "bg-slate-200 dark:bg-navy-700"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── the buttons ───────────────────────────────── */

/**
 * The one-click next step, the Super Admin's free-choice dropdown, and the
 * edit/delete controls -- including the application a salesperson has to file
 * before they can do either.
 */
export function OrderWorkflowActions({
  orderId,
  orderNo,
  workflow,
  permissions,
  busy,
  onChanged,
  locationId,
}: {
  orderId: number;
  orderNo: string;
  /** The place the order goes out of -- chosen when it was confirmed. */
  locationId?: number;
  workflow: Workflow | null;
  permissions: OrderPermissions | null;
  busy: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const { role } = useSession();

  const [working, setWorking] = React.useState(false);
  const [decline, setDecline] = React.useState(false);
  const [remove, setRemove] = React.useState(false);

  const disabled = busy || working;

  /* THE PLACE IS CHOSEN AT CONFIRMATION (the owner, 1 Nov).

     Confirming asks which place the order will go out of -- Karachi
     Warehouse, Karachi Order Department or Shop 2 (the sellable places, never
     Claim Stock) -- and the order keeps it. Dispatching then sends from that
     place without asking again; the dialog only shows it, with the stock. */
  const [dispatchOpen, setDispatchOpen] = React.useState(false);
  const [places, setPlaces] = React.useState<Place[] | null>(null);
  const [placeId, setPlaceId] = React.useState(0);
  const [shortages, setShortages] = React.useState<Shortage[]>([]);

  /* CONFIRM SHOWS THE STOCK FIRST (the owner, 21 Oct): each item's quantity at
     Shop 2, the Warehouse and the Order Department beside what was ordered.
     Accounts reads it and then confirms; the Order Department must cover the
     order, because that is where it is packed from -- if it does not, the stock
     is moved there first. `confirmFor` is the step being moved to. */
  const [confirmFor, setConfirmFor] = React.useState<{ key: string; name: string } | null>(null);
  const [stock, setStock] = React.useState<OrderStock | null>(null);
  const [stockError, setStockError] = React.useState<string | null>(null);

  const loadStock = React.useCallback(async () => {
    setStock(null);
    setStockError(null);
    try {
      setStock(await fetchOrderStock(orderId));
    } catch (e) {
      setStockError(apiMessage(e, "Could not read the stock."));
    }
  }, [orderId]);

  const move = React.useCallback(
    async (statusKey: string, reason?: string, locationId?: number) => {
      setWorking(true);
      try {
        const res = await axios.patch<{ message: string }>(
          `${API_BASE_URL}/sales/orders/${orderId}/status`,
          { statusKey, reason: reason ?? null, locationId: locationId ?? null },
          { headers: authHeader() }
        );
        toast.success("Order updated", { description: res.data.message });
        setDispatchOpen(false);
        setConfirmFor(null);
        setShortages([]);
        await onChanged();
      } catch (e) {
        /* A short shelf is not a failure to report as a toast and forget: the
           dialog stays open and lists exactly what is missing and by how many,
           so the person can pick a different place. */
        const short = axios.isAxiosError(e)
          ? (e.response?.data as { shortages?: Shortage[] })?.shortages
          : undefined;
        if (short?.length) setShortages(short);
        toast.error("Could not update the order", {
          description: apiMessage(e, "Please try again."),
        });
      } finally {
        setWorking(false);
      }
    },
    [orderId, onChanged]
  );

  /* The places, fetched once and only when a dialog first needs them -- the
     order screen does not otherwise. The order's own place is picked first. */
  const loadPlaces = React.useCallback(async () => {
    if (places) return;
    try {
      const res = await axios.get<{ locations: Place[] }>(
        `${API_BASE_URL}/sales/lookups`, { headers: authHeader() });
      const sellable = (res.data.locations ?? []).filter((l) => l.isSellable);
      setPlaces(sellable);
      setPlaceId((cur) => cur
        || (sellable.some((p) => p.id === locationId) ? locationId! : sellable[0]?.id ?? 0));
    } catch (e) {
      toast.error("Could not load the places", { description: apiMessage(e, "Please try again.") });
    }
  }, [places, locationId]);

  const openDispatch = React.useCallback(async () => {
    setShortages([]);
    /* Dispatch sends from the place chosen at confirmation. */
    setPlaceId(locationId ?? 0);
    setDispatchOpen(true);
    /* What each place holds, so the desk sees it before sending (the owner,
       21 Oct). Read fresh on every opening -- stock moves. */
    void loadStock();
    void loadPlaces();
  }, [loadStock, loadPlaces, locationId]);

  /** Any step, pressed from the button or the menu. */
  const go = React.useCallback((key: string, name: string) => {
    if (key === "DISPATCHED") { void openDispatch(); return; }
    if (workflow && CONFIRMING_STEPS.includes(key) && !ALREADY_CONFIRMED.includes(workflow.current)) {
      setShortages([]);
      setPlaceId(0);
      setConfirmFor({ key, name });
      void loadStock();
      void loadPlaces();
      return;
    }
    void move(key);
  }, [workflow, openDispatch, loadStock, loadPlaces, move]);

  /* Once the places arrive for a confirmation, start on the order's own. */
  React.useEffect(() => {
    if (!confirmFor || placeId || !places?.length) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       a default for the picker, once, when the places first arrive. */
    setPlaceId(places.some((p) => p.id === locationId) ? locationId! : places[0].id);
  }, [confirmFor, placeId, places, locationId]);

  const confirmShort = stock && placeId ? shortAt(stock, placeId) : [];

  /* Arriving from the owner's dashboard with ?confirm=1 opens the confirm
     dialog straight away -- once. */
  const autoConfirmed = React.useRef(false);
  React.useEffect(() => {
    if (autoConfirmed.current || search.get("confirm") !== "1" || !workflow?.next) return;
    if (!CONFIRMING_STEPS.includes(workflow.next) || ALREADY_CONFIRMED.includes(workflow.current)) return;
    autoConfirmed.current = true;
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       opening the confirm dialog once, on arrival from the owner's dashboard. */
    go(workflow.next, workflow.nextName ?? workflow.next);
  }, [search, workflow, go]);

  /* "There is not enough there" is said BEFORE anything is sent: the stock
     table already knows, so the desk is told at once which place cannot do it
     and by how much. The API still checks, in case the shelf moved meanwhile. */
  function dispatchFromHere() {
    if (stock) {
      const short = shortAt(stock, placeId);
      if (short.length > 0) {
        setShortages(short);
        const place = places?.find((p) => p.id === placeId)?.name ?? "this place";
        toast.error(`Cannot dispatch from ${place}`, {
          description: `There is not enough stock there for ${short.length} ${short.length === 1 ? "item" : "items"} on ${orderNo}.`,
        });
        return;
      }
    }
    void move("DISPATCHED", undefined, placeId);
  }

  async function destroy() {
    setWorking(true);
    try {
      const res = await axios.delete<{ message: string }>(
        `${API_BASE_URL}/sales/orders/${orderId}`,
        { headers: authHeader() }
      );
      toast.success("Order deleted", { description: res.data.message });
      setRemove(false);
      router.push("/sales/orders");
    } catch (e) {
      toast.error("Could not delete the order", {
        description: apiMessage(e, "Please try again."),
      });
      setWorking(false);
    }
  }

  if (!workflow) return null;

  const canDecline = workflow.allowed.some((a) => a.key === "DECLINED");

  return (
    <>
      {/* The single obvious next step. Sits immediately after Print bill so the
          common case -- look at it, move it on -- is one click from the top of
          the screen. */}
      {workflow.next && (
        <Button
          variant="accent"
          size="md"
          className="gap-1.5"
          onClick={() => go(workflow.next!, workflow.nextName ?? workflow.next!)}
          disabled={disabled}
        >
          {disabled ? <Loader2 className="size-4 animate-spin" />
            : workflow.next === "DISPATCHED" ? <Truck /> : <CheckCircle2 />}
          {workflow.nextName ?? "Next step"}
        </Button>
      )}

      {/* The Super Admin's dropdown: any status, forward or backward. Everyone
          else sees only the moves that are theirs to make.

          Hidden when it would only repeat the button beside it. The warehouse
          keeper has exactly one move available at a time, and a "Set status"
          menu whose single entry is the button already on screen is a second
          way to do the same thing -- which reads as though there must be a
          difference between them. */}
      {workflow.allowed.length > 0 &&
       !(workflow.allowed.length === 1 && workflow.allowed[0].key === workflow.next) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="md" className="gap-1.5" disabled={disabled}>
              Set status
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              {workflow.canSetAnything ? "Move it anywhere" : "Available to you"}
            </DropdownMenuLabel>

            {workflow.allowed
              .filter((a) => a.key !== "DECLINED")
              .map((a) => (
                <DropdownMenuItem key={a.key}
                  onClick={() => go(a.key, a.name)}>
                  <span
                    className={cn(
                      "inline-flex size-5 rounded-full items-center justify-center text-2xs font-bold",
                      a.step ? "bg-slate-100 dark:bg-navy-700" : "bg-warning/15 text-warning-dark"
                    )}
                  >
                    {a.step ?? "·"}
                  </span>
                  {a.name}
                </DropdownMenuItem>
              ))}

            {canDecline && (
              <>
                <DropdownMenuSeparator />
                {/* Declining takes a reason, so it opens a dialog rather than
                    firing straight off the menu. */}
                <DropdownMenuItem danger onClick={() => setDecline(true)}>
                  <XCircle />
                  Decline this order
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Editing and deleting. The Super Admin does both directly, and the
          accountant may edit an order that is confirmed or at Invoiced/Edit --
          that is the "Edit" half of the step's name. A rep asks and waits, and
          only their button says "(approved)", because theirs is the one that
          came from an approval. */}
      {permissions?.canEdit && (
        <Button
          variant="ghost"
          size="md"
          className="gap-1.5"
          onClick={() => router.push(`/sales/orders/${orderId}/edit`)}
          disabled={disabled}
        >
          <Pencil />
          <span className="hidden sm:inline">
            {role === "super-admin" || role === "accountant" ? "Edit" : "Edit (approved)"}
          </span>
        </Button>
      )}

      {permissions?.canDelete && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete order"
          onClick={() => setRemove(true)}
          disabled={disabled}
        >
          <Trash2 className="text-danger" />
        </Button>
      )}

      {/* ASKING THE OWNER FOR PERMISSION IS GONE FROM THE SALES PANEL.

          The owner asked for the button to come off the rep's order screen --
          "remove button of Ask for permission from sales panel". What is gone
          is the BUTTON: OrderChangeRequest, the API endpoints and the owner's
          dashboard queue are all untouched, so a request already in flight is
          still answered and the mechanism is there if it is ever wanted back.
          A rep asks the owner in person now, and the owner edits the order --
          which is one step, not three, and the owner was always the one who
          made the change anyway. `canAsk` is still on the permissions payload
          for the same reason. */}

      {/* WHERE IS IT GOING OUT OF?

          The one step in the chain that asks a question before it acts. The
          API refuses DISPATCHED without a place (it answers 400 with
          needsLocation), because that press is what takes the goods off a
          shelf -- and if the shelf is short it answers with exactly what is
          missing, which is listed here rather than thrown away in a toast. */}
      <Dialog open={dispatchOpen} onOpenChange={(o) => { setDispatchOpen(o); if (!o) setShortages([]); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dispatch {orderNo}?</DialogTitle>
            <DialogDescription>
              It goes out of the place chosen when the order was confirmed, and the goods come off
              that shelf.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 pb-1">
            {!places ? (
              <div className="space-y-2">
                <div className="h-14 rounded-lg bg-slate-100 dark:bg-navy-800 animate-pulse" />
                <div className="h-14 rounded-lg bg-slate-100 dark:bg-navy-800 animate-pulse" />
              </div>
            ) : places.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
                There is nowhere to dispatch from. Add a warehouse, an order department or a shop
                under Setup &rarr; Locations.
              </p>
            ) : (
              <div className="p-3 rounded-lg border-2 border-brand-yellow bg-brand-yellow/5">
                <div className="text-2xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Going out of</div>
                <div className="text-sm font-medium text-navy-900 dark:text-white mt-0.5">
                  {places.find((p) => p.id === placeId)?.name ?? "No place chosen -- confirm the order again to pick one"}
                </div>
              </div>
            )}

            {/* What each place holds of every item -- the column for the
                order's place is the one that must cover it. */}
            {places && places.length > 0 && (
              <div className="mt-3">
                <div className="text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Stock of each item
                </div>
                {stock ? <OrderStockTable stock={stock} watch={[placeId]} />
                  : stockError ? <p className="text-xs text-danger">{stockError}</p>
                  : <div className="h-20 rounded-lg bg-slate-100 dark:bg-navy-800 animate-pulse" />}
              </div>
            )}

            {shortages.length > 0 && (
              <div className="mt-3 rounded-lg border border-danger/40 bg-danger/5 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-danger">
                  <AlertCircle className="size-4" />
                  Not enough on that shelf
                </div>
                <ul className="mt-2 space-y-1">
                  {shortages.map((sh) => (
                    <li key={sh.sku ?? sh.name} className="text-2xs text-danger-dark dark:text-danger-light tabular">
                      {sh.name}: need {sh.needed}, have {sh.onHand} &mdash; short {sh.shortBy}
                    </li>
                  ))}
                </ul>
                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-2">
                  Move the stock there first.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDispatchOpen(false)}>Cancel</Button>
            <Button variant="accent" className="gap-1.5" disabled={working || !placeId}
              onClick={dispatchFromHere}>
              {working ? <Loader2 className="size-4 animate-spin" /> : <Truck />}
              Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM, WITH THE STOCK IN FRONT OF YOU. */}
      <Dialog open={confirmFor !== null} onOpenChange={(o) => { if (!o) { setConfirmFor(null); setShortages([]); } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {confirmFor?.key === "CONFIRMED" ? `Confirm ${orderNo}?` : `Move ${orderNo} to ${confirmFor?.name}?`}
            </DialogTitle>
            <DialogDescription>
              Pick the place this order will be dispatched from. The order department then sends it from
              there without being asked. Each item&apos;s stock is shown beside what was ordered &mdash;
              the place picked must have enough of every item.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 pb-1 space-y-3">
            <div>
              <div className="text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Dispatch from
              </div>
              {!places ? (
                <div className="h-14 rounded-lg bg-slate-100 dark:bg-navy-800 animate-pulse" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {places.map((l) => (
                    <button key={l.id} type="button" onClick={() => { setPlaceId(l.id); setShortages([]); }}
                      className={cn(
                        "text-left p-3 rounded-lg border-2 transition-colors",
                        placeId === l.id
                          ? "border-brand-yellow bg-brand-yellow/5"
                          : "border-slate-200 dark:border-navy-700 hover:border-brand-yellow/40"
                      )}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-navy-900 dark:text-white truncate">{l.name}</span>
                        {placeId === l.id && <Check className="size-4 text-brand-yellow shrink-0" />}
                      </div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wider">
                        {l.kind}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {stock ? (
              <>
                <OrderStockTable stock={stock} watch={placeId ? [placeId] : []} />
                {!placeId ? null : confirmShort.length === 0 ? (
                  <p className="text-xs text-success flex items-center gap-1.5">
                    <CheckCircle2 className="size-4" /> {places?.find((p) => p.id === placeId)?.name ?? "This place"} has enough of every item.
                  </p>
                ) : (
                  <div className="rounded-lg border border-danger/40 bg-danger/5 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-danger">
                      <AlertCircle className="size-4" />
                      {places?.find((p) => p.id === placeId)?.name ?? "This place"} is short
                    </div>
                    <ul className="mt-1.5 space-y-0.5">
                      {confirmShort.map((sh) => (
                        <li key={sh.sku ?? sh.name} className="text-2xs tabular text-danger-dark dark:text-danger-light">
                          {sh.name}: need {sh.needed}, have {sh.onHand} &mdash; short {sh.shortBy}
                        </li>
                      ))}
                    </ul>
                    <p className="text-2xs text-slate-500 dark:text-slate-400 mt-2">
                      Pick another place, or transfer the stock there first.
                    </p>
                  </div>
                )}
              </>
            ) : stockError ? (
              <p className="text-sm text-danger">{stockError}</p>
            ) : (
              <div className="space-y-2">
                <div className="h-10 rounded-lg bg-slate-100 dark:bg-navy-800 animate-pulse" />
                <div className="h-10 rounded-lg bg-slate-100 dark:bg-navy-800 animate-pulse" />
              </div>
            )}

            {/* The API's own refusal, if the shelf moved while this was open. */}
            {shortages.length > 0 && confirmShort.length === 0 && (
              <p className="text-xs text-danger">
                The stock changed while this was open. {shortages.map((sh) => `${sh.name}: short ${sh.shortBy}`).join("; ")}.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmFor(null)}>Cancel</Button>
            <Button variant="ghost" onClick={() => void loadStock()} disabled={working}>Refresh stock</Button>
            <Button variant="accent" className="gap-1.5"
              disabled={working || !stock || !placeId || confirmShort.length > 0}
              onClick={() => confirmFor && void move(confirmFor.key, undefined, placeId)}>
              {working ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 />}
              {confirmFor?.key === "CONFIRMED" ? "Confirm order" : `Move to ${confirmFor?.name}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={decline}
        onOpenChange={setDecline}
        title={`Decline ${orderNo}?`}
        description="The rep who raised it is told, and the order stops here. Say why -- they will see the reason."
        confirmLabel="Decline order"
        variant="danger"
        requireReason
        reasonLabel="Why is it being declined?"
        reasonPlaceholder="Stock unavailable, price not agreed, customer over limit…"
        loading={working}
        onConfirm={async (reason) => {
          await move("DECLINED", reason);
          setDecline(false);
        }}
      />

      <ConfirmDialog
        open={remove}
        onOpenChange={setRemove}
        title={`Delete ${orderNo}?`}
        description="The order and its lines are removed for good. An order that has already been invoiced cannot be deleted -- raise a sales return instead."
        confirmLabel="Delete for good"
        variant="danger"
        loading={working}
        onConfirm={destroy}
      />

    </>
  );
}
