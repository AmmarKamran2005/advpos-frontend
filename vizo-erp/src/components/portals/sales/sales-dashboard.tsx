"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  ShoppingCart, Clock, HandCoins, ShieldAlert, ArrowRight, AlertCircle,
  Users, MapPin, TrendingUp, TrendingDown, Plus,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Counter, CounterSkeletons } from "@/components/portals/dashboard-counter";
import { API_BASE_URL, authHeader, useSession } from "@/components/providers/session-provider";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /reports/dashboard/sales — scoped to the signed-in rep by the API, not
   filtered here. A rep must never see another rep's book. */
type RecentOrder = {
  id: number;
  orderNo: string;
  customer: string;
  orderDate: string;
  total: number;
  status: string;
  statusName: string;
};

type HeldOrder = {
  id: number;
  orderNo: string;
  customer: string;
  total: number;
  reason: string | null;
};

type PendingCollection = {
  id: number;
  receiptNo: string;
  customer: string;
  amount: number;
  collectedOn: string;
};

type Data = {
  asOf: string;
  orders: {
    monthCount: number;
    monthValue: number;
    prevMonthValue: number;
    recent: RecentOrder[];
  };
  creditHolds: { count: number; value: number; items: HeldOrder[] };
  collections: { pendingCount: number; pendingTotal: number; items: PendingCollection[] };
  customers: { count: number; outstanding: number };
  visits: { today: number; month: number };
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const STATUS_VARIANT: Record<string, "success" | "muted" | "warning" | "danger" | "info"> = {
  DRAFT: "muted",
  SUBMITTED: "warning",
  CREDIT_HOLD: "danger",
  CONFIRMED: "info",
  PROCESSING: "info",
  PACKED: "info",
  DISPATCHED: "info",
  INVOICED: "success",
  DELIVERED: "success",
  CANCELLED: "danger",
  RETURNED: "danger",
};

export function SalesDashboard() {
  const { user } = useSession();

  const [data, setData] = React.useState<Data | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<Data>(`${API_BASE_URL}/reports/dashboard/sales`, {
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

  /* This month against last, as a percentage. Guarded, because dividing by a
     zero previous month is how a dashboard ends up showing "Infinity%". */
  const trend = React.useMemo(() => {
    if (!data || data.orders.prevMonthValue <= 0) return null;
    const change = ((data.orders.monthValue - data.orders.prevMonthValue) / data.orders.prevMonthValue) * 100;
    return Math.round(change);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
            Good morning{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {loading
              ? "Pulling your numbers…"
              : error
                ? "The dashboard could not be loaded."
                : data && data.collections.pendingCount > 0
                  ? `${formatMoney(data.collections.pendingTotal)} you have collected is still waiting on accounts.`
                  : "Everything you have collected has been confirmed."}
          </p>
        </div>
        <Button variant="accent" size="md" className="gap-1.5 shrink-0" asChild>
          <Link href="/sales/orders/new"><Plus />New order</Link>
        </Button>
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
              label="Orders this month"
              value={data.orders.monthCount}
              icon={ShoppingCart}
              tone="yellow"
              hint={formatCompact(data.orders.monthValue)}
              href="/sales/orders"
            />
            <Counter
              label="Waiting for accounts"
              value={data.collections.pendingCount}
              icon={Clock}
              tone="info"
              hint={formatCompact(data.collections.pendingTotal)}
              href="/accounting/collections"
            />
            <Counter
              label="Stuck on limit"
              value={data.creditHolds.count}
              icon={ShieldAlert}
              tone="danger"
              hint={formatCompact(data.creditHolds.value)}
              href="/sales/credit-holds"
            />
            <Counter
              label="Owed by my customers"
              value={formatCompact(data.customers.outstanding)}
              icon={HandCoins}
              tone="warning"
              hint={`across ${data.customers.count} ${data.customers.count === 1 ? "account" : "accounts"}`}
              href="/reports/aging/customer"
            />
          </>
        )}
      </div>

      {/* Orders of this rep's that nobody can move */}
      {data && data.creditHolds.items.length > 0 && (
        <Card className="border-danger/30 bg-danger/5">
          <CardBody>
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="size-4 text-danger" />
              <h2 className="text-base font-semibold text-navy-900 dark:text-white">
                Your orders stuck on a credit limit
              </h2>
            </div>
            <div className="divide-y divide-danger/10">
              {data.creditHolds.items.map((o) => (
                <Link
                  key={o.id}
                  href={`/sales/orders/${o.id}`}
                  className="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-danger/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-navy-900 dark:text-white truncate">
                      {o.customer}
                    </div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      <span className="tabular">{o.orderNo}</span>
                      {o.reason ? ` · ${o.reason}` : ""}
                    </div>
                  </div>
                  <div className="tabular text-sm font-semibold text-danger shrink-0">
                    {formatMoney(o.total)}
                  </div>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-navy-900 dark:text-white">My orders</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sales/orders">All orders <ArrowRight /></Link>
              </Button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : !data || data.orders.recent.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="No orders yet"
                description="Orders you take will show up here."
                action={
                  <Button variant="accent" asChild>
                    <Link href="/sales/orders/new">Take an order</Link>
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-navy-700">
                {data.orders.recent.map((o) => (
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
                        <span className="tabular">{o.orderNo}</span> · {formatDate(o.orderDate)}
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
          {/* This month vs last */}
          <Card>
            <CardBody>
              <h2 className="text-base font-semibold text-navy-900 dark:text-white">This month</h2>
              {loading || !data ? (
                <div className="mt-4 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
                </div>
              ) : (
                <>
                  <div className="tabular text-3xl font-bold text-navy-900 dark:text-white mt-3">
                    {formatMoney(data.orders.monthValue)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {data.orders.monthCount} {data.orders.monthCount === 1 ? "order" : "orders"}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Last month</span>
                      <span className="tabular font-medium text-navy-900 dark:text-white">
                        {formatMoney(data.orders.prevMonthValue)}
                      </span>
                    </div>
                    {trend !== null && (
                      <div className={cn("flex items-center gap-1.5 text-xs mt-2 font-medium",
                        trend >= 0 ? "text-success" : "text-danger")}>
                        {trend >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                        {trend >= 0 ? "+" : ""}{trend}% against last month
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {/* Money this rep is answerable for */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-navy-900 dark:text-white">Money</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/accounting/collections">Collections <ArrowRight /></Link>
                </Button>
              </div>
              {loading || !data ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : data.collections.items.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nothing of yours is waiting on accounts.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.collections.items.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-slate-700 dark:text-slate-200">{c.customer}</div>
                        <div className="text-2xs text-slate-500 dark:text-slate-400">
                          <span className="tabular">{c.receiptNo}</span> · {formatDate(c.collectedOn)}
                        </div>
                      </div>
                      <span className="tabular text-xs font-semibold text-navy-900 dark:text-white shrink-0">
                        {formatMoney(c.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Visits */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-navy-900 dark:text-white">Visits</h2>
                  {data && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {data.visits.today} today · {data.visits.month} this month
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Users className="size-4 text-slate-400" />
                  <MapPin className="size-4 text-slate-400" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {data && (
        <p className="text-2xs text-slate-400 dark:text-slate-500 text-right">
          Your figures only, as at {formatDate(data.asOf)}
        </p>
      )}
    </div>
  );
}
