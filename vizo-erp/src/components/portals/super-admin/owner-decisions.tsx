"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { Check, X, Clock, FileClock, Pencil, Trash2, ChevronRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatRelative } from "@/lib/format";

/* ───────────────────────────────────────────────────────────────────────────
   THE TWO THINGS ONLY THE OWNER CAN CLEAR

   1. Orders sitting at SUBMITTED. Nothing downstream moves until the owner
      confirms or declines one, so they are shown here with how long they have
      been waiting. The six-hourly reminder that chases them is server-side --
      see Services/ConfirmReminderService.cs -- and this is where it lands.

   2. Applications from sales reps to edit or delete an order. A rep cannot do
      either; they ask, with a reason, and the owner approves with a tick or
      turns it down with a cross.

   Both are their own fetch rather than fields on /admin/dashboard, so a slow
   or failing queue never holds up the money figures at the top of the screen.
   ─────────────────────────────────────────────────────────────────────────── */

type WaitingOrder = {
  id: number;
  orderNo: string;
  customerName: string;
  customerInitials: string;
  salesPerson: string | null;
  total: number;
  orderDate: string;
};

type ChangeRequest = {
  id: number;
  orderId: number;
  orderNo: string;
  customer: string;
  total: number;
  orderStatus: string;
  kind: "EDIT" | "DELETE";
  reason: string;
  askedBy: string;
  askedAt: string;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export function OwnerDecisions() {
  const [waiting, setWaiting] = React.useState<WaitingOrder[]>([]);
  const [requests, setRequests] = React.useState<ChangeRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState(false);

  const [declining, setDeclining] = React.useState<WaitingOrder | null>(null);
  const [refusing, setRefusing] = React.useState<ChangeRequest | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [orders, changes] = await Promise.all([
        axios.get<{ items: WaitingOrder[] }>(
          `${API_BASE_URL}/sales/orders?status=SUBMITTED&pageSize=20`,
          { headers: authHeader() }
        ),
        axios.get<{ items: ChangeRequest[] }>(
          `${API_BASE_URL}/sales/order-change-requests?status=PENDING`,
          { headers: authHeader() }
        ),
      ]);
      setWaiting(orders.data.items ?? []);
      setRequests(changes.data.items ?? []);
    } catch {
      /* Quietly. This is a panel on a dashboard, not the dashboard -- an error
         banner here would sit above figures that loaded perfectly well. */
      setWaiting([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the component driven by
       useState/useEffect. */
    void load();
  }, [load]);

  async function confirm(o: WaitingOrder, statusKey: string, reason?: string) {
    setWorking(true);
    try {
      const res = await axios.patch<{ message: string }>(
        `${API_BASE_URL}/sales/orders/${o.id}/status`,
        { statusKey, reason: reason ?? null },
        { headers: authHeader() }
      );
      toast.success(res.data.message, { description: o.orderNo });
      setDeclining(null);
      await load();
    } catch (e) {
      toast.error("Could not update the order", { description: apiMessage(e, "Please try again.") });
    } finally {
      setWorking(false);
    }
  }

  async function decide(r: ChangeRequest, approve: boolean, note?: string) {
    setWorking(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/sales/order-change-requests/${r.id}/decide`,
        { approve, note: note ?? null },
        { headers: authHeader() }
      );
      toast.success(res.data.message, { description: `${r.orderNo} · ${r.askedBy}` });
      setRefusing(null);
      await load();
    } catch (e) {
      toast.error("Could not record the decision", { description: apiMessage(e, "Please try again.") });
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardBody>
          <Skeleton className="h-32 w-full" />
        </CardBody>
      </Card>
    );
  }

  if (waiting.length === 0 && requests.length === 0) return null;

  return (
    <>
      {waiting.length > 0 && (
        <Card className="border-info/40">
          <CardBody>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="size-4 text-info" />
              <h2 className="text-base font-semibold text-navy-900 dark:text-white">
                Waiting for you to confirm
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Nothing moves until you decide. You will be reminded every six hours
              until each of these is confirmed or declined.
            </p>

            <div className="space-y-2">
              {waiting.map((o) => (
                <div
                  key={o.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-navy-700"
                >
                  <Link
                    href={`/sales/orders/${o.id}`}
                    className="flex items-center gap-2.5 flex-1 min-w-0 group"
                  >
                    <Avatar initials={o.customerInitials} size="sm" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-navy-900 dark:text-white truncate group-hover:text-brand-yellow transition-colors">
                        {o.customerName}
                      </div>
                      <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                        {o.orderNo}
                        {o.salesPerson ? ` · ${o.salesPerson}` : ""} · {formatRelative(o.orderDate)}
                      </div>
                    </div>
                  </Link>

                  <div className="tabular text-sm font-bold text-navy-900 dark:text-white sm:w-28 sm:text-right">
                    {formatMoney(o.total)}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      variant="accent"
                      size="sm"
                      className="gap-1"
                      disabled={working}
                      onClick={() => void confirm(o, "CONFIRMED")}
                    >
                      <Check /> Confirm
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-danger"
                      aria-label={`Decline ${o.orderNo}`}
                      disabled={working}
                      onClick={() => setDeclining(o)}
                    >
                      <X />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {requests.length > 0 && (
        <Card className="border-warning/40">
          <CardBody>
            <div className="flex items-center gap-2 mb-1">
              <FileClock className="size-4 text-warning" />
              <h2 className="text-base font-semibold text-navy-900 dark:text-white">
                Permission requests
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              A rep cannot edit or delete an order. These are the ones asking to.
              Approving grants it once, for that order only.
            </p>

            <div className="space-y-2">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-navy-700"
                >
                  <div
                    className={
                      r.kind === "DELETE"
                        ? "size-8 rounded-lg bg-danger/10 text-danger flex items-center justify-center flex-shrink-0"
                        : "size-8 rounded-lg bg-info/10 text-info flex items-center justify-center flex-shrink-0"
                    }
                  >
                    {r.kind === "DELETE" ? <Trash2 className="size-4" /> : <Pencil className="size-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-navy-900 dark:text-white">
                      <span className="font-semibold">{r.askedBy}</span>{" "}
                      wants to {r.kind.toLowerCase()}{" "}
                      <Link
                        href={`/sales/orders/${r.orderId}`}
                        className="font-medium underline decoration-dotted underline-offset-2 hover:text-brand-yellow"
                      >
                        {r.orderNo}
                      </Link>
                    </div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400 tabular mt-0.5">
                      {r.customer} · {formatMoney(r.total)} · {r.orderStatus} ·{" "}
                      {formatRelative(r.askedAt)}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 italic">
                      &ldquo;{r.reason}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      variant="accent"
                      size="sm"
                      className="gap-1"
                      disabled={working}
                      onClick={() => void decide(r, true)}
                    >
                      <Check /> Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-danger"
                      aria-label={`Refuse ${r.askedBy}'s request`}
                      disabled={working}
                      onClick={() => setRefusing(r)}
                    >
                      <X />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Open order" asChild>
                      <Link href={`/sales/orders/${r.orderId}`}>
                        <ChevronRight />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <ConfirmDialog
        open={declining !== null}
        onOpenChange={(o) => !o && setDeclining(null)}
        title={declining ? `Decline ${declining.orderNo}?` : "Decline order"}
        description="The rep who raised it is told, and the order stops here. Say why -- they will see the reason."
        confirmLabel="Decline order"
        variant="danger"
        requireReason
        reasonLabel="Why is it being declined?"
        reasonPlaceholder="Stock unavailable, price not agreed, customer over limit…"
        loading={working}
        onConfirm={async (reason) => {
          if (declining) await confirm(declining, "DECLINED", reason);
        }}
      />

      <ConfirmDialog
        open={refusing !== null}
        onOpenChange={(o) => !o && setRefusing(null)}
        title={refusing ? `Refuse the request on ${refusing.orderNo}?` : "Refuse request"}
        description="The rep is told straight away. A note helps them understand what to do instead."
        confirmLabel="Refuse"
        variant="danger"
        requireReason
        reasonLabel="Why not?"
        reasonPlaceholder="Raise a sales return instead, the order has shipped…"
        loading={working}
        onConfirm={async (note) => {
          if (refusing) await decide(refusing, false, note);
        }}
      />
    </>
  );
}
