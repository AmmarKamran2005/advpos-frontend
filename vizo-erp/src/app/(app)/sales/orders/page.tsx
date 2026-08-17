"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Download, Search, Send, Check, Truck, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { useSession } from "@/components/providers/session-provider";
import {
  orders, ordersForRep, getStatusVariant, DELIVERY_STATE_VARIANT, type Order,
} from "@/data/sales";
import { getChannel } from "@/data/settings";
import { formatMoney, formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** The stages a rep actually thinks in, not every enum value. */
const TABS = [
  { key: "ALL",       label: "All",        match: () => true },
  { key: "DRAFT",     label: "Draft",      match: (o: Order) => o.status === "DRAFT" },
  { key: "SENT",      label: "Sent",       match: (o: Order) => ["SUBMITTED", "CREDIT_HOLD"].includes(o.status) },
  { key: "PREPARING", label: "Preparing",  match: (o: Order) => ["CONFIRMED", "PROCESSING", "PACKED"].includes(o.status) },
  { key: "OUT",       label: "On the way", match: (o: Order) => o.deliveryState === "AWAITING" || o.deliveryState === "ON_THE_WAY" },
  { key: "DELIVERED", label: "Delivered",  match: (o: Order) => o.deliveryState === "DELIVERED" },
  { key: "CLOSED",    label: "Closed",     match: (o: Order) => ["CANCELLED", "RETURNED"].includes(o.status) },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function OrdersPage() {
  const { can, user } = useSession();
  const isRep = !can("orders.approve");

  const scope = React.useMemo(
    () => (isRep ? ordersForRep(user.fullName) : orders),
    [isRep, user.fullName]
  );

  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<TabKey>("ALL");

  const rows = React.useMemo(() => {
    const matcher = TABS.find((t) => t.key === tab)!.match;
    const q = search.trim().toLowerCase();
    return scope.filter((o) => {
      if (!matcher(o)) return false;
      if (!q) return true;
      return (
        o.orderNo.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.trackingNo.toLowerCase().includes(q)
      );
    });
  }, [scope, search, tab]);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Orders" }]}
        title="Orders"
        subtitle={isRep ? "Your orders and where each one has reached" : "Every customer order"}
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5"
              onClick={() => toast.success("Export started", { description: `${rows.length} orders` })}>
              <Download />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/sales/orders/new"><Plus /> New Order</Link>
            </Button>
          </>
        }
      />

      {/* Stage tabs */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {TABS.map((t) => {
          const count = scope.filter(t.match).length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                tab === t.key
                  ? "bg-navy-900 text-brand-yellow dark:bg-navy-800"
                  : "bg-white dark:bg-navy-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-navy-700 hover:border-slate-300"
              )}
            >
              {t.label} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order number, customer, or tracking number…"
              className="pl-9"
            />
          </div>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            title="Nothing here"
            description="No orders match this filter."
            action={
              <Button variant="accent" asChild>
                <Link href="/sales/orders/new"><Plus /> New Order</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      )}
    </>
  );
}

function OrderCard({ order }: { order: Order }) {
  const channel = getChannel(order.channel);
  const balance = order.total - order.paidAmount;
  const paidPct = order.total > 0 ? Math.round((order.paidAmount / order.total) * 100) : 0;

  return (
    <Card className="hover:border-brand-yellow/40 transition-colors">
      <CardBody className="py-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Who + which */}
          <Link href={`/sales/orders/${order.id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
            <Avatar initials={order.customerInitials} size="md" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-navy-900 dark:text-white truncate group-hover:text-brand-yellow transition-colors">
                {order.customerName}
              </div>
              <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                {order.orderNo} · {formatDate(order.orderDate)} · {order.city}
              </div>
            </div>
          </Link>

          {/* Where it has reached */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusPill variant={getStatusVariant(order.status)}>
              {statusLabel(order.status)}
            </StatusPill>
            {order.deliveryState !== "NOT_DISPATCHED" && (
              <StatusPill variant={DELIVERY_STATE_VARIANT[order.deliveryState]}>
                {statusLabel(order.deliveryState)}
              </StatusPill>
            )}
            {channel && order.deliveryState !== "NOT_DISPATCHED" && (
              <span className="text-2xs text-slate-500 dark:text-slate-400">
                {order.carrier}
                {order.trackingNo !== "—" && <span className="tabular"> · {order.trackingNo}</span>}
              </span>
            )}
          </div>

          {/* Money */}
          <div className="flex items-center gap-4 lg:w-56 lg:justify-end">
            <div className="text-right">
              <div className="tabular text-sm font-bold text-navy-900 dark:text-white">
                {formatMoney(order.total)}
              </div>
              <div
                className={cn(
                  "tabular text-2xs font-medium",
                  balance === 0
                    ? "text-success"
                    : order.paidAmount > 0
                      ? "text-warning"
                      : "text-slate-400"
                )}
              >
                {balance === 0
                  ? "Paid"
                  : order.paidAmount > 0
                    ? `${paidPct}% paid · ${formatMoney(balance)} left`
                    : "Unpaid"}
              </div>
            </div>
            <QuickAction order={order} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/** One button that does the obvious next thing for this order. */
function QuickAction({ order }: { order: Order }) {
  if (order.status === "DRAFT") {
    return (
      <Button variant="accent" size="sm" className="gap-1 flex-shrink-0"
        onClick={() => toast.success("Sent to Order Department", { description: order.orderNo })}>
        <Send /> Send
      </Button>
    );
  }

  if (order.channel === "local" && (order.deliveryState === "AWAITING" || order.deliveryState === "ON_THE_WAY")) {
    return (
      <Button variant="accent" size="sm" className="gap-1 flex-shrink-0"
        onClick={() => toast.success("Marked delivered", { description: order.orderNo })}>
        <Check /> Delivered
      </Button>
    );
  }

  if (order.deliveryState === "AWAITING" || order.deliveryState === "ON_THE_WAY") {
    return (
      <Button variant="secondary" size="sm" className="gap-1 flex-shrink-0" asChild>
        <Link href={`/sales/orders/${order.id}`}><Truck /> Track</Link>
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="icon-sm" className="flex-shrink-0" asChild>
      <Link href={`/sales/orders/${order.id}`} aria-label="Open order"><ChevronRight /></Link>
    </Button>
  );
}
