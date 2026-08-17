"use client";

import * as React from "react";
import { Truck, Check, RotateCcw, Clock, MapPin, Hash, BellRing } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/dialogs";
import { toast } from "@/components/ui/toaster";
import { useSession } from "@/components/providers/session-provider";
import { DELIVERY_STATE_VARIANT, type Order } from "@/data/sales";
import { getChannel } from "@/data/settings";
import { formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";

/**
 * How this consignment went out, and the one question that matters: has it
 * arrived? Only the person whose job it is on this channel gets the buttons —
 * everyone else can see the state but not answer for it.
 */
export function OrderDeliveryCard({ order }: { order: Order }) {
  const { role } = useSession();
  const channel = getChannel(order.channel);
  const [returning, setReturning] = React.useState(false);

  if (!channel || order.deliveryState === "NOT_DISPATCHED") {
    return (
      <Card>
        <CardBody>
          <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-2">Delivery</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Not sent yet. The order department will pick the route when it goes out.
          </p>
        </CardBody>
      </Card>
    );
  }

  /* Who owns the confirmation on this route. */
  const mayConfirm =
    (channel.confirmedBy === "sales-rep" && role === "sales") ||
    (channel.confirmedBy === "order-dept" && (role === "order-dept" || role === "super-admin")) ||
    (channel.confirmedBy === "cargo-handler" && (role === "order-dept" || role === "super-admin"));

  const open = order.deliveryState === "AWAITING" || order.deliveryState === "ON_THE_WAY";

  return (
    <>
      <Card className={open ? "border-warning/40" : undefined}>
        <CardBody>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Delivery</h3>
            <StatusPill variant={DELIVERY_STATE_VARIANT[order.deliveryState]}>
              {statusLabel(order.deliveryState)}
            </StatusPill>
          </div>

          <dl className="space-y-2 text-xs">
            <Line icon={MapPin} label="Route" value={channel.name} />
            <Line icon={Truck} label="Carrier" value={order.carrier} />
            {order.trackingNo !== "—" && (
              <Line
                icon={Hash}
                label={channel.requiresBilty ? "Bilty no." : "Tracking"}
                value={order.trackingNo}
                tabular
              />
            )}
            {order.dispatchedOn && (
              <Line icon={Clock} label="Sent" value={formatDate(order.dispatchedOn)} />
            )}
            {order.dueOn && !order.deliveredOn && (
              <Line icon={Clock} label="Expected" value={formatDate(order.dueOn)} />
            )}
            {order.deliveredOn && (
              <Line icon={Check} label="Delivered" value={formatDate(order.deliveredOn)} />
            )}
          </dl>

          {order.deliveryNote && (
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-navy-900 rounded-md p-2.5">
              {order.deliveryNote}
            </p>
          )}

          {open && order.remindersSent > 0 && (
            <div className="mt-3 flex items-start gap-2 text-xs text-warning-dark dark:text-warning">
              <BellRing className="size-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Asked {order.remindersSent} {order.remindersSent === 1 ? "time" : "times"} already
                — reminders repeat every {channel.remindEveryHours} hours.
              </span>
            </div>
          )}

          {open && (
            mayConfirm ? (
              <div className="mt-4 space-y-2">
                <p className="text-2xs text-slate-500 dark:text-slate-400">
                  Did it reach the customer?
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Button variant="accent" size="sm" className="gap-1"
                    onClick={() => toast.success("Marked delivered", { description: order.orderNo })}>
                    <Check /> Delivered
                  </Button>
                  <Button variant="secondary" size="sm"
                    onClick={() => toast.info("We will ask again tomorrow", { description: order.orderNo })}>
                    Still on the way
                  </Button>
                  <Button variant="ghost" size="sm" className="text-danger gap-1"
                    onClick={() => setReturning(true)}>
                    <RotateCcw /> Came back
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-2xs text-slate-500 dark:text-slate-400">
                {channel.confirmedBy === "cargo-handler"
                  ? "The cargo desk confirms this one."
                  : channel.confirmedBy === "sales-rep"
                    ? "The sales rep who delivered it confirms this one."
                    : "The order department confirms this one."}
              </p>
            )
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={returning}
        onOpenChange={setReturning}
        title={`${order.orderNo} came back?`}
        description="The goods return to stock and the order is marked returned."
        variant="danger"
        confirmLabel="Yes, it came back"
        requireReason
        reasonLabel="Why did it come back?"
        onConfirm={(r) => {
          toast.success("Marked returned", { description: `Reason: ${r}` });
          setReturning(false);
        }}
      />
    </>
  );
}

function Line({
  icon: Icon, label, value, tabular,
}: {
  icon: typeof Truck; label: string; value: string; tabular?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3 text-slate-400 flex-shrink-0" />
      <dt className="text-slate-500 dark:text-slate-400 w-20 flex-shrink-0">{label}</dt>
      <dd className={`text-slate-700 dark:text-slate-200 truncate ${tabular ? "tabular" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
