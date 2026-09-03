"use client";

import * as React from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, ChevronDown, Loader2, Pencil, Trash2, KeyRound, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
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
  const [ask, setAsk] = React.useState<null | "EDIT" | "DELETE">(null);

  const disabled = busy || working;

  const move = React.useCallback(
    async (statusKey: string, reason?: string) => {
      setWorking(true);
      try {
        const res = await axios.patch<{ message: string }>(
          `${API_BASE_URL}/sales/orders/${orderId}/status`,
          { statusKey, reason: reason ?? null },
          { headers: authHeader() }
        );
        toast.success("Order updated", { description: res.data.message });
        await onChanged();
      } catch (e) {
        toast.error("Could not update the order", {
          description: apiMessage(e, "Please try again."),
        });
      } finally {
        setWorking(false);
      }
    },
    [orderId, onChanged]
  );

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

  async function apply(kind: "EDIT" | "DELETE", reason: string) {
    setWorking(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/sales/orders/${orderId}/change-request`,
        { kind, reason },
        { headers: authHeader() }
      );
      toast.success("Sent to the owner", { description: res.data.message });
      setAsk(null);
      await onChanged();
    } catch (e) {
      toast.error("Could not send the request", {
        description: apiMessage(e, "Please try again."),
      });
    } finally {
      setWorking(false);
    }
  }

  if (!workflow) return null;

  const canDecline = workflow.allowed.some((a) => a.key === "DECLINED");

  /* A rep who has already asked is waiting, not asking again. The button says
     so rather than going quiet, because silence reads as "it did not send". */
  const waiting = Boolean(permissions?.editRequested || permissions?.deleteRequested);

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
          onClick={() => void move(workflow.next!)}
          disabled={disabled}
        >
          {disabled ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 />}
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
                <DropdownMenuItem key={a.key} onClick={() => void move(a.key)}>
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

      {/* Editing and deleting. The Super Admin does both directly; a rep asks
          and waits. */}
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
            {role === "super-admin" ? "Edit" : "Edit (approved)"}
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

      {permissions?.canAsk && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="md" className="gap-1.5" disabled={disabled}>
              <KeyRound />
              <span className="hidden sm:inline">
                {waiting ? "Waiting for the owner" : "Ask for permission"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Ask the owner for</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setAsk("EDIT")}
              disabled={permissions.editRequested || permissions.canEdit}
            >
              <Pencil />
              {permissions.editRequested ? "Edit -- already asked" : "Permission to edit"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setAsk("DELETE")}
              disabled={permissions.deleteRequested || permissions.canDelete || permissions.invoiced}
            >
              <Trash2 />
              {permissions.invoiced
                ? "Delete -- already invoiced"
                : permissions.deleteRequested
                  ? "Delete -- already asked"
                  : "Permission to delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

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

      <ConfirmDialog
        open={ask !== null}
        onOpenChange={(o) => !o && setAsk(null)}
        title={ask === "DELETE" ? `Ask to delete ${orderNo}` : `Ask to edit ${orderNo}`}
        description="The owner sees this on their dashboard and either approves it or turns it down. You will be told either way."
        confirmLabel="Send the request"
        variant="info"
        requireReason
        reasonLabel="Why do you need it?"
        reasonPlaceholder="Customer changed the quantity, wrong rate entered…"
        loading={working}
        onConfirm={async (reason) => {
          if (ask) await apply(ask, reason ?? "");
        }}
      />
    </>
  );
}
