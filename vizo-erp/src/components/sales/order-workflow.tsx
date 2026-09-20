"use client";

import * as React from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
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
}: {
  orderId: number;
  orderNo: string;
  workflow: Workflow | null;
  permissions: OrderPermissions | null;
  busy: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const router = useRouter();
  const { role } = useSession();

  const [working, setWorking] = React.useState(false);
  const [decline, setDecline] = React.useState(false);
  const [remove, setRemove] = React.useState(false);

  const disabled = busy || working;

  /* DISPATCH IS THE ONE MOVE THAT ASKS A QUESTION FIRST.

     Every other step is a press. Dispatched takes the goods off a shelf, so
     the API refuses it without a place (`needsLocation` comes back on a 400)
     and this screen asks which one -- warehouses, order departments and shops,
     never Claim Stock, which holds damaged goods that are not for sale. */
  const [dispatchOpen, setDispatchOpen] = React.useState(false);
  const [places, setPlaces] = React.useState<Place[] | null>(null);
  const [placeId, setPlaceId] = React.useState(0);
  const [shortages, setShortages] = React.useState<Shortage[]>([]);

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

  /* The places, fetched once and only when the dialog is first opened -- the
     order screen does not need them otherwise. */
  const openDispatch = React.useCallback(async () => {
    setShortages([]);
    setDispatchOpen(true);
    if (places) return;
    try {
      const res = await axios.get<{ locations: Place[] }>(
        `${API_BASE_URL}/sales/lookups`, { headers: authHeader() });
      const sellable = (res.data.locations ?? []).filter((l) => l.isSellable);
      setPlaces(sellable);
      setPlaceId(sellable[0]?.id ?? 0);
    } catch (e) {
      toast.error("Could not load the places", { description: apiMessage(e, "Please try again.") });
    }
  }, [places]);

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
          onClick={() => (workflow.next === "DISPATCHED" ? void openDispatch() : void move(workflow.next!))}
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
                  onClick={() => (a.key === "DISPATCHED" ? void openDispatch() : void move(a.key))}>
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
            <DialogTitle>Where is {orderNo} going out of?</DialogTitle>
            <DialogDescription>
              The goods come off this shelf when you dispatch, so it has to be the place they are
              really leaving from. Claim Stock is not offered &mdash; nothing is sold off it.
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  Pick another place, or move the stock there first.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDispatchOpen(false)}>Cancel</Button>
            <Button variant="accent" className="gap-1.5" disabled={working || !placeId}
              onClick={() => void move("DISPATCHED", undefined, placeId)}>
              {working ? <Loader2 className="size-4 animate-spin" /> : <Truck />}
              Dispatch from here
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
