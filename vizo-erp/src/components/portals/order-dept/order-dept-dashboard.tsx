"use client";

import * as React from "react";
import Link from "next/link";
import {
  Inbox, PackageCheck, Send, PackageX, ArrowRight, AlertTriangle,
  ShoppingBag, ArrowLeftRight, ChevronRight,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill, Badge } from "@/components/ui/badge";
import { ReminderList } from "@/components/widgets/reminder-list";
import { useSession } from "@/components/providers/session-provider";
import { orders, getStatusVariant, DELIVERY_STATE_VARIANT } from "@/data/sales";
import { claims, openClaims, claimValue } from "@/data/claims";
import { products } from "@/data/products";
import { getChannel } from "@/data/settings";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * The order department is the floor of this business: orders land here, stock
 * gets moved and packed, consignments go out, and faulty pieces come back.
 * The screen is a work queue, not a report.
 */
export function OrderDeptDashboard() {
  const { user } = useSession();
  /* The shell does not mount this until the session has resolved, so user
     is set. An early `return null` here would sit above the hooks below
     and change the hook count between renders. */
  const me = user!;


  const incoming = orders.filter((o) => ["SUBMITTED", "CREDIT_HOLD"].includes(o.status));
  const toPack = orders.filter((o) => ["CONFIRMED", "PROCESSING"].includes(o.status));
  const toDispatch = orders.filter((o) => o.status === "PACKED");
  const toConfirm = orders.filter((o) => {
    const ch = getChannel(o.channel);
    return (
      ch?.confirmedBy !== "sales-rep" &&
      (o.deliveryState === "AWAITING" || o.deliveryState === "ON_THE_WAY")
    );
  });

  const open = openClaims();
  const onShelf = claims.filter((c) => c.stage === "RECEIVED");
  const lowStock = products.filter((p) => p.totalStock <= p.minQty && p.isActive);

  const queue = [...incoming, ...toPack, ...toDispatch].slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
            Good morning, {me.fullName.split(" ")[0]}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {incoming.length > 0
              ? `${incoming.length} new ${incoming.length === 1 ? "order" : "orders"} came in from the sales team.`
              : "No new orders waiting."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md" className="gap-1.5" asChild>
            <Link href="/inventory/transfers/new"><ArrowLeftRight /> Move Stock</Link>
          </Button>
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/sales/direct"><ShoppingBag /> Counter Sale</Link>
          </Button>
        </div>
      </div>

      {/* Work counters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Counter label="New orders" value={incoming.length} icon={Inbox} tone="yellow"
          hint="from the sales team" href="/sales/orders" />
        <Counter label="To pack" value={toPack.length + toDispatch.length} icon={PackageCheck} tone="info"
          hint="confirmed, not out yet" href="/sales/orders" />
        <Counter label="Confirm delivery" value={toConfirm.length} icon={Send} tone="danger"
          hint="courier and cargo" href="/delivery" />
        <Counter label="Claims open" value={open.length} icon={PackageX} tone="warning"
          hint={`${formatCompact(claimValue(open))} tied up`} href="/claims" />
      </div>

      {/* What the software is chasing you for */}
      <ReminderList limit={6} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* The queue */}
        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-navy-900 dark:text-white">
                  Order queue
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Everything waiting on this desk
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sales/orders">View all <ArrowRight /></Link>
              </Button>
            </div>

            {queue.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                The queue is empty.
              </p>
            ) : (
              <div className="space-y-2">
                {queue.map((o) => (
                  <Link
                    key={o.id}
                    href={`/sales/orders/${o.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-navy-700 hover:border-brand-yellow/40 transition-colors group"
                  >
                    <Avatar initials={o.customerInitials} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-navy-900 dark:text-white truncate">
                        {o.customerName}
                      </div>
                      <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                        {o.orderNo} · {o.itemCount} items · {o.city}
                      </div>
                    </div>
                    <StatusPill variant={getStatusVariant(o.status)}>
                      {statusLabel(o.status)}
                    </StatusPill>
                    <div className="tabular text-sm font-semibold text-navy-900 dark:text-white w-24 text-right">
                      {formatMoney(o.total)}
                    </div>
                    <ChevronRight className="size-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          {/* Claim shelf */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-navy-900 dark:text-white">
                  Claim shelf
                </h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/claims">Open <ArrowRight /></Link>
                </Button>
              </div>
              {onShelf.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">The shelf is clear.</p>
              ) : (
                <div className="space-y-2">
                  {onShelf.slice(0, 4).map((c) => (
                    <Link
                      key={c.id}
                      href={`/claims/${c.id}`}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-800"
                    >
                      <PackageX className="size-4 text-warning flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-navy-900 dark:text-white truncate">
                          {c.qty} × {c.productName}
                        </div>
                        <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">
                          {c.customerName} · {formatDate(c.receivedOn)}
                        </div>
                      </div>
                      <span className="tabular text-2xs font-semibold text-slate-600 dark:text-slate-300">
                        {formatCompact(c.qty * c.unitCost)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Low stock */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-navy-900 dark:text-white">
                  Running low
                </h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/inventory/stock-levels">Stock <ArrowRight /></Link>
                </Button>
              </div>
              {lowStock.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Everything is above its minimum.</p>
              ) : (
                <div className="space-y-2">
                  {lowStock.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center gap-2.5">
                      <AlertTriangle
                        className={cn(
                          "size-3.5 flex-shrink-0",
                          p.totalStock <= 0 ? "text-danger" : "text-warning"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-navy-900 dark:text-white truncate">
                          {p.name}
                        </div>
                        <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                          {p.sku}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "tabular text-xs font-semibold",
                          p.totalStock <= 0 ? "text-danger" : "text-warning"
                        )}
                      >
                        {p.totalStock} / {p.minQty}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

const TONE_BG: Record<string, string> = {
  yellow: "bg-brand-yellow/10 text-brand-yellow",
  info: "bg-info/10 text-info",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
};

function Counter({
  label, value, icon: Icon, tone, hint, href,
}: {
  label: string; value: number; icon: typeof Inbox;
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
