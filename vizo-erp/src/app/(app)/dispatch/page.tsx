"use client";

import * as React from "react";
import Link from "next/link";
import {
  Send, Truck, Store, PackageCheck, Hash, Info, AlertTriangle, X, Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { orders, type Order } from "@/data/sales";
import { deliveryChannels, getChannel, type ChannelKey } from "@/data/settings";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const CHANNEL_ICON: Record<ChannelKey, typeof Truck> = {
  local: Store,
  online: Send,
  cargo: Truck,
  logistics: PackageCheck,
};

/** Today, fixed so the mock reads the same on every render. */
const TODAY = "2026-08-15";

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Packed orders leaving the building.
 *
 * The route chosen here decides who will later be asked whether it arrived —
 * the rep for a Karachi hand-delivery, the back office for a courier, the
 * cargo desk for freight. Picking it is the whole point of the screen, so the
 * consequence is spelled out before the button is pressed.
 */
export default function DispatchPage() {
  const queue = React.useMemo(() => orders.filter((o) => o.status === "PACKED"), []);
  const [dispatching, setDispatching] = React.useState<Order | null>(null);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Daily Work" }, { label: "Dispatch" }]}
        title="Dispatch"
        subtitle="Packed orders waiting for a route out."
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href="/packing">Back to Packing</Link>
            </Button>
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href="/delivery"><Truck /> Track deliveries</Link>
            </Button>
          </>
        }
      />

      {/* How each route gets confirmed — the thing people forget */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        {deliveryChannels.map((ch) => {
          const Icon = CHANNEL_ICON[ch.key];
          return (
            <Card key={ch.key}>
              <CardBody className="py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="size-4 text-brand-yellow" />
                  <span className="text-sm font-semibold text-navy-900 dark:text-white">
                    {ch.name}
                  </span>
                </div>
                <p className="text-2xs text-slate-500 dark:text-slate-400">
                  Confirmed by{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {ch.confirmedBy === "sales-rep"
                      ? "the sales rep"
                      : ch.confirmedBy === "order-dept"
                        ? "this desk"
                        : "the cargo desk"}
                  </span>
                  {ch.remindAfterDays === 0
                    ? ", chased same day"
                    : `, chased after ${ch.remindAfterDays} days`}
                </p>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {queue.length === 0 ? (
        <Card>
          <EmptyState
            icon={Send}
            title="Nothing waiting to go out"
            description="Everything packed has already been dispatched."
            action={<Button variant="accent" asChild><Link href="/packing">Go to packing</Link></Button>}
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {queue.map((o) => (
            <Card key={o.id} className="hover:border-brand-yellow/40 transition-colors">
              <CardBody className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <Link href={`/sales/orders/${o.id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                  <Avatar initials={o.customerInitials} size="md" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-navy-900 dark:text-white truncate group-hover:text-brand-yellow transition-colors">
                      {o.customerName}
                    </div>
                    <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                      {o.orderNo} · {o.itemCount} lines · {o.city}
                    </div>
                  </div>
                </Link>

                <Badge variant="muted">{o.city}</Badge>

                <div className="tabular text-sm font-bold text-navy-900 dark:text-white sm:w-28 sm:text-right">
                  {formatMoney(o.total)}
                </div>

                <Button variant="accent" size="sm" className="gap-1.5 flex-shrink-0"
                  onClick={() => setDispatching(o)}>
                  <Send /> Dispatch
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {dispatching && (
        <DispatchSheet
          order={dispatching}
          open
          onOpenChange={(v) => !v && setDispatching(null)}
        />
      )}
    </>
  );
}

function DispatchSheet({
  order, open, onOpenChange,
}: {
  order: Order; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  /* A Karachi address almost always goes out by hand — start there. */
  const [channelKey, setChannelKey] = React.useState<ChannelKey>(
    order.city === "Karachi" ? "local" : "cargo"
  );
  const channel = getChannel(channelKey)!;

  const [carrier, setCarrier] = React.useState(channel.carriers[0] ?? "");
  const [tracking, setTracking] = React.useState("");
  const [expected, setExpected] = React.useState(addDays(TODAY, 2));
  const [touchedCarrier, setTouchedCarrier] = React.useState(false);

  /* Follow the channel unless the user has picked a carrier themselves. */
  const [lastChannel, setLastChannel] = React.useState<ChannelKey>(channelKey);
  if (lastChannel !== channelKey) {
    setLastChannel(channelKey);
    if (!touchedCarrier) setCarrier(getChannel(channelKey)?.carriers[0] ?? "");
    setExpected(addDays(TODAY, Math.max(1, getChannel(channelKey)?.remindAfterDays ?? 2)));
  }

  const needsRef = channel.requiresBilty;
  const missingRef = needsRef && tracking.trim().length === 0;

  function dispatch() {
    if (missingRef) {
      toast.error("Bilty number needed", {
        description: "Freight cannot be traced without it — that is the only proof you have.",
      });
      return;
    }
    toast.success("Dispatched", {
      description: `${order.orderNo} out via ${carrier}. ${
        channel.confirmedBy === "sales-rep"
          ? "The rep will be asked to confirm delivery."
          : channel.confirmedBy === "cargo-handler"
            ? `The cargo desk will be reminded after ${channel.remindAfterDays} days.`
            : `This desk will be reminded after ${channel.remindAfterDays} days.`
      }`,
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="md">
        <SheetHeader>
          <SheetTitle>Dispatch {order.orderNo}</SheetTitle>
          <SheetDescription>
            {order.customerName} · {order.city} · {formatMoney(order.total)}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <Label>How is it going?</Label>
          <div className="grid grid-cols-2 gap-2 mt-1.5 mb-5">
            {deliveryChannels.filter((c) => c.isActive).map((ch) => {
              const Icon = CHANNEL_ICON[ch.key];
              const active = channelKey === ch.key;
              return (
                <button
                  key={ch.key}
                  type="button"
                  onClick={() => setChannelKey(ch.key)}
                  className={cn(
                    "text-left p-3 rounded-lg border-2 transition-colors",
                    active
                      ? "border-brand-yellow bg-brand-yellow/5"
                      : "border-slate-200 dark:border-navy-700 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("size-4", active ? "text-brand-yellow" : "text-slate-400")} />
                    <span className="text-sm font-semibold text-navy-900 dark:text-white">
                      {ch.name}
                    </span>
                  </div>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {ch.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mb-4">
            <Label htmlFor="carrier">Who is carrying it</Label>
            <SelectNative
              id="carrier"
              value={carrier}
              onChange={(e) => { setCarrier(e.target.value); setTouchedCarrier(true); }}
              className="mt-1.5"
            >
              {channel.carriers.map((c) => <option key={c}>{c}</option>)}
            </SelectNative>
          </div>

          <div className="mb-4">
            <Label htmlFor="tracking" required={needsRef}>
              {needsRef ? "Bilty number" : "Tracking number"}
            </Label>
            <div className="relative mt-1.5">
              <Hash className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                id="tracking"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder={needsRef ? "BL-2026-4471" : "leave blank if there is none"}
                className={cn("pl-9 tabular", missingRef && "border-danger")}
              />
            </div>
            {needsRef && (
              <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1.5">
                Freight has no tracking feed. The bilty receipt is the only proof, so it is
                required here.
              </p>
            )}
          </div>

          <div className="mb-5">
            <Label htmlFor="expected">Should reach by</Label>
            <div className="relative mt-1.5">
              <Calendar className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                id="expected"
                type="date"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* What happens after this button */}
          <div className="rounded-lg border border-info/25 bg-info/5 p-3">
            <div className="flex items-start gap-2.5">
              <Info className="size-4 text-info flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                <p>
                  <span className="font-semibold text-navy-900 dark:text-white">
                    {channel.confirmedBy === "sales-rep"
                      ? `${order.salesPerson} confirms this one.`
                      : channel.confirmedBy === "cargo-handler"
                        ? "The cargo desk confirms this one."
                        : "This desk confirms this one."}
                  </span>{" "}
                  They can mark it delivered, still on the way, or came back.
                </p>
                <p>
                  {channel.remindAfterDays === 0
                    ? "Reminders start today"
                    : `Reminders start ${channel.remindAfterDays} days after dispatch`}
                  , then repeat every {channel.remindEveryHours} hours until somebody answers.
                </p>
                {!channel.autoConfirm && channel.key === "online" && (
                  <p className="text-slate-500 dark:text-slate-400">
                    The courier portal can mark these automatically once it is connected — the
                    switch is already there, waiting on a backend.
                  </p>
                )}
              </div>
            </div>
          </div>

          {missingRef && (
            <div className="flex items-start gap-2.5 mt-3 p-3 rounded-lg bg-danger/5 border border-danger/25">
              <AlertTriangle className="size-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-xs text-danger-dark dark:text-danger-light">
                Enter the bilty number before dispatching.
              </p>
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            <X /> Cancel
          </Button>
          <Button type="button" variant="accent" className="gap-1.5" onClick={dispatch}>
            <Send /> Dispatch &amp; invoice
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
