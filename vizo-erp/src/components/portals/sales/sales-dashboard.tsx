"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShoppingCart, Clock, Truck, BellRing, ArrowRight, Check, RotateCcw,
  Wallet, HandCoins, ChevronRight,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill, Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/dialogs";
import { toast } from "@/components/ui/toaster";
import { useSession } from "@/components/providers/session-provider";
import {
  orders, ordersForRep, getStatusVariant, DELIVERY_STATE_VARIANT, type Order,
} from "@/data/sales";
import { collectionsBy, totalOf, type Collection } from "@/data/collections";
import { getChannel } from "@/data/settings";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * A rep does two things all day: takes orders, and chases the money. This
 * screen shows only those two, plus the one thing the business could not see
 * before — which consignments nobody has confirmed arrived.
 */
export function SalesDashboard() {
  const { user } = useSession();
  const mine = React.useMemo(() => ordersForRep(user.fullName), [user.fullName]);
  const myCollections = React.useMemo(() => collectionsBy(user.fullName), [user.fullName]);

  /* Deliveries this rep handed over himself and has not confirmed yet. */
  const toConfirm = mine.filter(
    (o) => o.channel === "local" && (o.deliveryState === "AWAITING" || o.deliveryState === "ON_THE_WAY")
  );
  const inTransit = mine.filter(
    (o) => o.channel !== "local" && (o.deliveryState === "AWAITING" || o.deliveryState === "ON_THE_WAY")
  );
  const withOrderDept = mine.filter((o) =>
    ["SUBMITTED", "CONFIRMED", "PROCESSING", "PACKED"].includes(o.status)
  );
  const todays = mine.filter((o) => o.orderDate === "2026-08-13");

  const awaiting = myCollections.filter((c) => c.status === "AWAITING");
  const confirmed = myCollections.filter((c) => c.status === "CONFIRMED");
  const owed = mine
    .filter((o) => o.status !== "CANCELLED" && o.paymentStatus !== "PAID")
    .reduce((sum, o) => sum + (o.total - o.paidAmount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
          {greeting()}, {user.fullName.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {toConfirm.length > 0
            ? `${toConfirm.length} ${toConfirm.length === 1 ? "delivery needs" : "deliveries need"} your confirmation.`
            : "Nothing waiting on you right now."}
        </p>
      </div>

      {/* Counters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Counter label="Orders today" value={todays.length} icon={ShoppingCart} tone="yellow"
          hint={`${mine.length} in total`} href="/sales/orders" />
        <Counter label="With order dept" value={withOrderDept.length} icon={Clock} tone="info"
          hint="being prepared" href="/sales/orders?status=SUBMITTED" />
        <Counter label="On the way" value={inTransit.length} icon={Truck} tone="muted"
          hint="courier or cargo" href="/sales/orders?status=DISPATCHED" />
        <Counter label="Confirm delivery" value={toConfirm.length} icon={BellRing} tone="danger"
          hint="you delivered these" href="/sales/orders?delivery=AWAITING" />
      </div>

      {/* Needs you */}
      {toConfirm.length > 0 && (
        <Card className="border-warning/40">
          <CardBody>
            <div className="flex items-center gap-2 mb-1">
              <BellRing className="size-4 text-warning" />
              <h2 className="text-base font-semibold text-navy-900 dark:text-white">
                Waiting on you
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              You took these out yourself. Tell us what happened so the order can close.
            </p>
            <div className="space-y-2">
              {toConfirm.map((o) => <ConfirmRow key={o.id} order={o} />)}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent orders with tracking */}
        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-navy-900 dark:text-white">My orders</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Latest first, with where each one has reached
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sales/orders">View all <ArrowRight /></Link>
              </Button>
            </div>
            <div className="space-y-2">
              {mine.slice(0, 6).map((o) => <OrderRow key={o.id} order={o} />)}
            </div>
          </CardBody>
        </Card>

        {/* Money */}
        <Card>
          <CardBody>
            <h2 className="text-base font-semibold text-navy-900 dark:text-white">Money</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
              What you have collected, and what is still out
            </p>

            <div className="space-y-3">
              <MoneyRow
                icon={HandCoins}
                tone="warning"
                label="Waiting for Accounts"
                sub={`${awaiting.length} ${awaiting.length === 1 ? "receipt" : "receipts"}`}
                value={totalOf(awaiting)}
              />
              <MoneyRow
                icon={Check}
                tone="success"
                label="Confirmed"
                sub={`${confirmed.length} cleared`}
                value={totalOf(confirmed)}
              />
              <MoneyRow
                icon={Wallet}
                tone="danger"
                label="Still owed to us"
                sub="across your customers"
                value={owed}
              />
            </div>

            <Button variant="secondary" size="md" className="w-full mt-4 justify-center" asChild>
              <Link href="/parties/customers">Go collect <ArrowRight /></Link>
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────────────── pieces ─────────────────────────── */

function greeting() {
  return "Good morning";
}

const TONE_BG: Record<string, string> = {
  yellow: "bg-brand-yellow/10 text-brand-yellow",
  info: "bg-info/10 text-info",
  danger: "bg-danger/10 text-danger",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  muted: "bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-slate-400",
};

function Counter({
  label, value, icon: Icon, tone, hint, href,
}: {
  label: string; value: number; icon: typeof ShoppingCart;
  tone: string; hint: string; href: string;
}) {
  return (
    <Link href={href}>
      <Card className="p-5 hover:border-brand-yellow/40 transition-colors h-full">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
              {label}
            </div>
            <div className="tabular text-3xl font-bold text-navy-900 dark:text-white mt-1.5">
              {value}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</div>
          </div>
          <div className={cn("size-10 rounded-lg flex items-center justify-center", TONE_BG[tone])}>
            <Icon className="size-5" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

function ConfirmRow({ order }: { order: Order }) {
  const [returning, setReturning] = React.useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-navy-700">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Avatar initials={order.customerInitials} size="sm" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-navy-900 dark:text-white truncate">
              {order.customerName}
            </div>
            <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
              {order.orderNo} · {formatMoney(order.total)}
              {order.dispatchedOn && ` · out ${formatDate(order.dispatchedOn)}`}
            </div>
          </div>
        </div>

        {order.remindersSent > 0 && (
          <Badge variant="warning">
            asked {order.remindersSent}×
          </Badge>
        )}

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            variant="accent"
            size="sm"
            className="gap-1"
            onClick={() =>
              toast.success("Marked delivered", {
                description: `${order.orderNo} — ${order.customerName}`,
              })
            }
          >
            <Check /> Delivered
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              toast.info("We will ask again tomorrow", { description: order.orderNo })
            }
          >
            Still out
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-danger"
            aria-label="Returned"
            onClick={() => setReturning(true)}
          >
            <RotateCcw />
          </Button>
        </div>
      </div>

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

function OrderRow({ order }: { order: Order }) {
  const channel = getChannel(order.channel);
  const balance = order.total - order.paidAmount;

  return (
    <Link
      href={`/sales/orders/${order.id}`}
      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-navy-700 hover:border-brand-yellow/40 transition-colors group"
    >
      <Avatar initials={order.customerInitials} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-navy-900 dark:text-white truncate">
          {order.customerName}
        </div>
        <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
          {order.orderNo} · {formatDate(order.orderDate)}
          {channel && order.deliveryState !== "NOT_DISPATCHED" && ` · ${channel.name}`}
        </div>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-1">
        <StatusPill variant={getStatusVariant(order.status)}>
          {statusLabel(order.status)}
        </StatusPill>
        {order.deliveryState !== "NOT_DISPATCHED" && (
          <StatusPill variant={DELIVERY_STATE_VARIANT[order.deliveryState]}>
            {statusLabel(order.deliveryState)}
          </StatusPill>
        )}
      </div>

      <div className="text-right w-28 flex-shrink-0">
        <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">
          {formatMoney(order.total)}
        </div>
        <div
          className={cn(
            "tabular text-2xs font-medium",
            balance === 0 ? "text-success" : order.paidAmount > 0 ? "text-warning" : "text-slate-400"
          )}
        >
          {balance === 0 ? "paid" : order.paidAmount > 0 ? `${formatCompact(balance)} left` : "unpaid"}
        </div>
      </div>

      <ChevronRight className="size-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

function MoneyRow({
  icon: Icon, tone, label, sub, value,
}: {
  icon: typeof Wallet; tone: string; label: string; sub: string; value: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("size-9 rounded-lg flex items-center justify-center flex-shrink-0", TONE_BG[tone])}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-navy-900 dark:text-white">{label}</div>
        <div className="text-2xs text-slate-500 dark:text-slate-400">{sub}</div>
      </div>
      <div className="tabular text-sm font-bold text-navy-900 dark:text-white">
        {formatCompact(value)}
      </div>
    </div>
  );
}
