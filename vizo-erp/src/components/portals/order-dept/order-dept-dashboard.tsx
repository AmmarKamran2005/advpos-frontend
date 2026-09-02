"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  Inbox, PackageCheck, Send, PackageX, ArrowRight, AlertCircle,
  Truck, TriangleAlert, ShieldAlert, Boxes,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Counter, CounterSkeletons } from "@/components/portals/dashboard-counter";
import { API_BASE_URL, authHeader, useSession } from "@/components/providers/session-provider";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /reports/dashboard/order-dept — one request, everything on the page. */
type QueueOrder = {
  id: number;
  orderNo: string;
  customer: string;
  orderDate: string;
  deliveryDate: string | null;
  total: number;
  status: string;
  statusName: string;
  itemCount: number;
};

type LowStockItem = { id: number; sku: string; name: string; minQty: number; onHand: number };

type OpenClaim = {
  id: number;
  claimNo: string;
  customer: string;
  product: string;
  quantity: number;
  value: number;
  stage: string;
  receivedOn: string;
  remindersSent: number;
};

type Data = {
  asOf: string;
  orders: {
    submitted: number;
    submittedValue: number;
    confirmed: number;
    processing: number;
    packed: number;
    creditHold: number;
    creditHoldValue: number;
    queue: QueueOrder[];
  };
  packing: { waiting: number; packed: number };
  dispatch: {
    dispatchedToday: number;
    awaitingDispatch: number;
    inTransit: number;
    transfersInTransit: number;
  };
  stock: { lowCount: number; items: LowStockItem[] };
  claims: { openCount: number; openValue: number; items: OpenClaim[] };
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const STATUS_VARIANT: Record<string, "success" | "muted" | "warning" | "danger" | "info"> = {
  SUBMITTED: "warning",
  CONFIRMED: "info",
  PROCESSING: "info",
  PACKED: "success",
  CREDIT_HOLD: "danger",
};

export function OrderDeptDashboard() {
  const { user } = useSession();

  const [data, setData] = React.useState<Data | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<Data>(`${API_BASE_URL}/reports/dashboard/order-dept`, {
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const firstName = (user?.fullName ?? "").split(" ")[0];
  const waiting = data ? data.orders.submitted + data.orders.confirmed + data.orders.processing : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
          Good morning{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {loading
            ? "Checking the queue…"
            : error
              ? "The dashboard could not be loaded."
              : waiting > 0
                ? `${waiting} ${waiting === 1 ? "order is" : "orders are"} waiting to be worked.`
                : "The queue is clear. Nothing waiting."}
        </p>
      </div>

      {error && (
        <Card className="p-4 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !data ? (
          <CounterSkeletons count={4} />
        ) : (
          <>
            <Counter
              label="New orders"
              value={data.orders.submitted}
              icon={Inbox}
              tone="yellow"
              hint={formatCompact(data.orders.submittedValue)}
              href="/sales/orders?status=SUBMITTED"
            />
            <Counter
              label="To pack"
              value={data.packing.waiting}
              icon={PackageCheck}
              tone="info"
              hint={`${data.packing.packed} already packed`}
              href="/packing"
            />
            <Counter
              label="Out for delivery"
              value={data.dispatch.inTransit}
              icon={Send}
              tone="danger"
              hint={`${data.dispatch.awaitingDispatch} still to send`}
              href="/delivery"
            />
            <Counter
              label="Claims open"
              value={data.claims.openCount}
              icon={PackageX}
              tone="warning"
              hint={formatCompact(data.claims.openValue)}
              href="/claims"
            />
          </>
        )}
      </div>

      {/* Credit holds are the order department's problem too -- the order is
          theirs to move and it cannot move until somebody clears it. */}
      {data && data.orders.creditHold > 0 && (
        <Card className="border-danger/30 bg-danger/5">
          <CardBody className="py-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="size-5 text-danger shrink-0" />
              <div className="flex-1 min-w-0 text-sm text-navy-900 dark:text-white">
                <strong>{data.orders.creditHold}</strong>{" "}
                {data.orders.creditHold === 1 ? "order is" : "orders are"} stuck on a credit limit,
                worth {formatMoney(data.orders.creditHoldValue)}. Nothing can be packed until
                accounts clears them.
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/sales/credit-holds">Open</Link>
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* The work queue, oldest first */}
        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-navy-900 dark:text-white">Work queue</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Oldest first — these are the ones people ring about
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sales/orders">All orders <ArrowRight /></Link>
              </Button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : !data || data.orders.queue.length === 0 ? (
              <EmptyState
                icon={PackageCheck}
                title="Queue is clear"
                description="No order is waiting to be worked."
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-navy-700">
                {data.orders.queue.map((o) => (
                  <Link
                    key={o.id}
                    href={`/sales/orders/${o.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-slate-50 dark:hover:bg-navy-700/50 -mx-2 px-2 rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-navy-900 dark:text-white truncate">
                        {o.customer}
                      </div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="tabular">{o.orderNo}</span> · {formatDate(o.orderDate)} ·{" "}
                        {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                      </div>
                    </div>
                    <StatusPill variant={STATUS_VARIANT[o.status] ?? "muted"}>
                      {o.statusName}
                    </StatusPill>
                    <div className="tabular text-sm font-semibold text-navy-900 dark:text-white shrink-0">
                      {formatMoney(o.total)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          {/* Movement */}
          <Card>
            <CardBody>
              <h2 className="text-base font-semibold text-navy-900 dark:text-white">On the move</h2>
              {loading || !data ? (
                <div className="mt-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
                </div>
              ) : (
                <dl className="mt-3 space-y-2.5 text-sm">
                  <Row label="Booked today" value={data.dispatch.dispatchedToday} icon={Truck} />
                  <Row label="Waiting to be sent" value={data.dispatch.awaitingDispatch} />
                  <Row label="In transit" value={data.dispatch.inTransit} />
                  <Row
                    label="Stock transfers moving"
                    value={data.dispatch.transfersInTransit}
                    hint="stock nobody can sell yet"
                  />
                </dl>
              )}
            </CardBody>
          </Card>

          {/* Low stock */}
          <Card className={cn(data && data.stock.lowCount > 0 && "border-warning/30")}>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-navy-900 dark:text-white">Running out</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/inventory/stock">Stock <ArrowRight /></Link>
                </Button>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : !data || data.stock.items.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nothing is below its minimum.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.stock.items.map((p) => (
                    <Link
                      key={p.id}
                      href={`/inventory/products/${p.id}`}
                      className="flex items-center gap-2 text-sm hover:bg-slate-50 dark:hover:bg-navy-700/50 -mx-2 px-2 py-1.5 rounded-lg"
                    >
                      <TriangleAlert className={cn("size-3.5 shrink-0",
                        p.onHand <= 0 ? "text-danger" : "text-warning")} />
                      <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">
                        {p.name}
                      </span>
                      <span className={cn("tabular text-xs font-semibold shrink-0",
                        p.onHand <= 0 ? "text-danger" : "text-warning")}>
                        {p.onHand} / {p.minQty}
                      </span>
                    </Link>
                  ))}
                  {data.stock.lowCount > data.stock.items.length && (
                    <p className="text-2xs text-slate-500 dark:text-slate-400 pt-1">
                      and {data.stock.lowCount - data.stock.items.length} more
                    </p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Claims stuck with suppliers */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-navy-900 dark:text-white">Claims still open</h2>
              {data && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {data.claims.openCount} open · {formatMoney(data.claims.openValue)} tied up
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/claims">All claims <ArrowRight /></Link>
            </Button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : !data || data.claims.items.length === 0 ? (
            <EmptyState icon={Boxes} title="No open claims" description="Nothing is sitting with a supplier." />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-navy-700">
              {data.claims.items.map((c) => (
                <Link
                  key={c.id}
                  href={`/claims/${c.id}`}
                  className="flex items-center gap-3 py-2.5 hover:bg-slate-50 dark:hover:bg-navy-700/50 -mx-2 px-2 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-navy-900 dark:text-white truncate">
                      {c.product}
                    </div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="tabular">{c.claimNo}</span> · {c.customer} · since {formatDate(c.receivedOn)}
                      {c.remindersSent > 0 && ` · ${c.remindersSent} reminder${c.remindersSent === 1 ? "" : "s"} sent`}
                    </div>
                  </div>
                  <Badge variant="muted">{c.stage}</Badge>
                  <div className="tabular text-sm font-semibold text-navy-900 dark:text-white shrink-0">
                    {formatMoney(c.value)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {data && (
        <p className="text-2xs text-slate-400 dark:text-slate-500 text-right">
          Figures as at {formatDate(data.asOf)}
        </p>
      )}
    </div>
  );
}

function Row({
  label, value, icon: Icon, hint,
}: {
  label: string;
  value: number | string;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 min-w-0">
        {Icon && <Icon className="size-3.5 shrink-0" />}
        <span className="truncate">
          {label}
          {hint && <span className="block text-2xs text-slate-400 dark:text-slate-500">{hint}</span>}
        </span>
      </dt>
      <dd className="tabular font-medium text-navy-900 dark:text-white shrink-0">{value}</dd>
    </div>
  );
}
