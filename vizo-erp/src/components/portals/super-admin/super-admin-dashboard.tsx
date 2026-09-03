"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  TrendingUp, HandCoins, Wallet, TrendingDown, ArrowRight, ShieldAlert,
  Archive, PackageX, Clock, Check, X, ChevronRight,
  CheckCircle2, AlertTriangle, Package, AlertCircle, RefreshCw,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { SalesTrendChart } from "@/components/widgets/sales-trend-chart";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader, useSession } from "@/components/providers/session-provider";
import { formatMoney, formatCompact, formatDate, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AiInsight } from "@/components/widgets/ai-insight";
import { OwnerDecisions } from "./owner-decisions";

/* ─────────────────────────── shapes from the API ─────────────────────────── */

type LimitCrossedOrder = {
  id: number;
  orderNo: string;
  customerName: string;
  customerInitials: string;
  salesPerson: string;
  total: number;
  creditHoldReason: string | null;
  creditLimit: number;
};

type ActivityRow = {
  id: number;
  user: string;
  action: string;
  target: string | null;
  detail: string | null;
  time: string;
  location: string | null;
  severity: string;
};

type DashboardData = {
  /** The date the money figures below actually cover — not necessarily today. */
  businessDate: string;
  todaySales: { value: number; orders: number };
  collections: { value: number };
  arOutstanding: { value: number; overdue60Plus: number };
  apPayable: { value: number; dueIn7Days: number };
  limitCrossed: LimitCrossedOrder[];
  claimsStuck: { count: number; value: number };
  deadStockValue: number;
  awaitingCollections: { count: number; value: number };
  activity: ActivityRow[];
  salesTrend: { date: string; revenue: number }[];
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/* The API sends a severity, not an icon name — pick the glyph from that so the
   row never claims something the record does not say. */
const ACTIVITY_ICON: Record<string, typeof Check> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertTriangle,
  info: Package,
  muted: Clock,
};

const ACTIVITY_TONE: Record<string, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  danger: "bg-danger/10 text-danger",
  accent: "bg-brand-yellow/10 text-brand-yellow",
  muted: "bg-slate-100 text-slate-500 dark:bg-navy-700 dark:text-slate-400",
};

/**
 * The owner isn't in the transaction chain — he sits above it. His first screen
 * is the health of the business plus the one thing that is genuinely his call:
 * letting an order through over its credit limit. Everything else here points
 * at a report that already exists rather than re-deriving it.
 */
export function SuperAdminDashboard() {
  const { user } = useSession();
  /* The shell does not mount this until the session has resolved, so user
     is set. An early `return null` here would sit above the hooks below
     and change the hook count between renders. */
  const me = user!;


  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [approving, setApproving] = React.useState<LimitCrossedOrder | null>(null);
  const [rejecting, setRejecting] = React.useState<LimitCrossedOrder | null>(null);
  const [working, setWorking] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<DashboardData>(`${API_BASE_URL}/admin/dashboard`, {
        headers: authHeader(),
      });
      setData(res.data);
    } catch (e) {
      setError(apiMessage(e, "Could not load the dashboard."));
      console.log("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. Disabled here rather
       than globally so the rule still catches the cases worth fixing. */
    void load();
  }, [load]);

  const decide = React.useCallback(
    async (order: LimitCrossedOrder, path: string, body: { reason: string | null }) => {
      setWorking(true);
      try {
        const res = await axios.post<{ message?: string }>(
          `${API_BASE_URL}/admin/orders/${order.id}/${path}`,
          body,
          { headers: authHeader() }
        );
        toast.success(res.data?.message ?? "Done.", { description: order.orderNo });
        setApproving(null);
        setRejecting(null);
        await load();
      } catch (e) {
        toast.error(apiMessage(e, "The order could not be updated."));
      } finally {
        setWorking(false);
      }
    },
    [load]
  );

  /* The app shell resolves the session before this mounts; the guard keeps the
     type checker honest. Hooks stay above it so their order never shifts. */
  if (!user) return null;

  const limitCrossed = data?.limitCrossed ?? [];
  const businessDate = data ? formatDate(data.businessDate) : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
          Good morning, {me.fullName.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {limitCrossed.length > 0
            ? `${limitCrossed.length} ${limitCrossed.length === 1 ? "order needs" : "orders need"} your approval to go over limit.`
            : "The business at a glance — nothing is waiting on your decision."}
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-32 mt-3" />
                <Skeleton className="h-3 w-20 mt-2" />
              </Card>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card><CardBody><Skeleton className="h-64 w-full" /></CardBody></Card>
              <Card><CardBody><Skeleton className="h-24 w-full" /></CardBody></Card>
            </div>
            <Card><CardBody><Skeleton className="h-72 w-full" /></CardBody></Card>
          </div>
        </div>
      ) : error ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={AlertCircle}
              title="Could not load the dashboard"
              description={error}
              action={
                <Button variant="accent" onClick={() => void load()}>
                  <RefreshCw />
                  Try again
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : !data ? null : (
        <>
          {/* Money, labelled with the business date the API actually covers */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MoneyTile
              label={`Sales — ${businessDate}`}
              value={formatMoney(data.todaySales.value)}
              icon={TrendingUp}
              tone="yellow"
              hint={`${data.todaySales.orders} orders`}
              href="/reports/sales-summary"
            />
            <MoneyTile
              label={`Collected — ${businessDate}`}
              value={formatMoney(data.collections.value)}
              icon={HandCoins}
              tone="success"
              hint="cash, bank & wallet"
              href="/accounting/collections"
            />
            <MoneyTile
              label="They owe us"
              value={formatCompact(data.arOutstanding.value)}
              icon={Wallet}
              tone="info"
              hint={`${formatCompact(data.arOutstanding.overdue60Plus)} over 60 days`}
              href="/reports/aging/customer"
            />
            <MoneyTile
              label="We owe suppliers"
              value={formatCompact(data.apPayable.value)}
              icon={TrendingDown}
              tone="danger"
              hint={`${formatCompact(data.apPayable.dueIn7Days)} due this week`}
              href="/reports/aging/supplier"
            />
          </div>

          {/* Orders waiting on a confirm, and reps asking to change one.
              Their own component so a slow queue never delays the figures. */}
          <OwnerDecisions />

          {/* Needs your decision */}
          {limitCrossed.length > 0 && (
            <Card className="border-warning/40">
              <CardBody>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="size-4 text-warning" />
                  <h2 className="text-base font-semibold text-navy-900 dark:text-white">
                    Needs your decision
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  These orders are over the customer&rsquo;s credit limit. Letting them
                  through is a risk call — yours to make.
                </p>
                <div className="space-y-2">
                  {limitCrossed.map((o) => (
                    <div
                      key={o.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-navy-700"
                    >
                      <Link href={`/sales/orders/${o.id}`} className="flex items-center gap-2.5 flex-1 min-w-0 group">
                        <Avatar initials={o.customerInitials} size="sm" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-navy-900 dark:text-white truncate group-hover:text-brand-yellow transition-colors">
                            {o.customerName}
                          </div>
                          <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                            {o.orderNo} · {o.salesPerson}
                          </div>
                        </div>
                      </Link>
                      {o.creditHoldReason && (
                        <div className="text-2xs text-warning-dark dark:text-warning sm:max-w-[16rem]">
                          {o.creditHoldReason}
                        </div>
                      )}
                      <div className="tabular text-sm font-bold text-navy-900 dark:text-white sm:w-28 sm:text-right">
                        {formatMoney(o.total)}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button variant="accent" size="sm" className="gap-1" onClick={() => setApproving(o)}>
                          <Check /> Approve
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-danger" aria-label="Reject" onClick={() => setRejecting(o)}>
                          <X />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Trend + leaks */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-semibold text-navy-900 dark:text-white">Sales trend</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Last 30 days</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/reports/sales-summary">Reports <ArrowRight /></Link>
                    </Button>
                  </div>
                  <SalesTrendChart data={data.salesTrend} />
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <h2 className="text-base font-semibold text-navy-900 dark:text-white">Where money is leaking</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
                    Cash tied up where it shouldn&rsquo;t be
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <LeakTile
                      icon={Clock}
                      tone="danger"
                      value={formatCompact(data.arOutstanding.overdue60Plus)}
                      label="Overdue 60+ days"
                      href="/reports/aging/customer"
                    />
                    <LeakTile
                      icon={Archive}
                      tone="warning"
                      value={formatCompact(data.deadStockValue)}
                      label="Stock not selling"
                      href="/reports/dead-stock"
                    />
                    <LeakTile
                      icon={PackageX}
                      tone="info"
                      value={formatCompact(data.claimsStuck.value)}
                      label={`${data.claimsStuck.count} claims stuck`}
                      href="/claims"
                    />
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Activity */}
            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-semibold text-navy-900 dark:text-white">Activity</h2>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/audit-log">All <ArrowRight /></Link>
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Who did what, across every desk
                </p>
                {data.activity.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">
                    Nothing has been recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.activity.map((a) => {
                      const Icon = ACTIVITY_ICON[a.severity] ?? CheckCircle2;
                      return (
                        <div key={a.id} className="flex gap-3">
                          <div className={cn("size-8 rounded-full flex items-center justify-center flex-shrink-0", ACTIVITY_TONE[a.severity] ?? ACTIVITY_TONE.muted)}>
                            <Icon className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-slate-700 dark:text-slate-200">
                              <span className="font-medium text-navy-900 dark:text-white">{a.user}</span>{" "}
                              {a.action}{" "}
                              {a.target && <span className="font-medium text-navy-900 dark:text-white">{a.target}</span>}
                            </div>
                            {a.detail && (
                              <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">{a.detail}</div>
                            )}
                            <div className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">
                              {formatRelative(a.time)}{a.location && ` · ${a.location}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {data.awaitingCollections.count > 0 && (
                  <Link
                    href="/accounting/collections"
                    className="mt-4 flex items-center gap-2 p-2.5 rounded-lg bg-warning/5 border border-warning/25 hover:border-warning/40 transition-colors"
                  >
                    <Clock className="size-3.5 text-warning flex-shrink-0" />
                    <span className="text-2xs text-slate-600 dark:text-slate-300 flex-1">
                      {formatCompact(data.awaitingCollections.value)} collected, waiting for Accounts to confirm
                    </span>
                    <ChevronRight className="size-3.5 text-slate-400" />
                  </Link>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}

      {/* Feature #1, where the owner actually looks. Fires only when
          pressed -- see components/widgets/ai-insight.tsx. */}
      <AiInsight
        endpoint="/reports/sales-drop/explain"
        label="Explain the numbers"
        hint="Breaks this month against last into customers, products, stock-outs, pricing and costs, then says which of them account for the change."
      />

      <ConfirmDialog
        open={approving !== null}
        onOpenChange={(o) => !o && setApproving(null)}
        title={`Approve ${approving?.orderNo} over limit?`}
        description={`${approving?.customerName}'s order for ${formatMoney(approving?.total ?? 0)} goes to the order department despite crossing the credit limit of ${formatMoney(approving?.creditLimit ?? 0)}. You own this risk.`}
        variant="info"
        confirmLabel="Yes, approve it"
        loading={working}
        onConfirm={(r) => {
          if (!approving) return;
          void decide(approving, "approve-credit-hold", { reason: r && r.trim() ? r.trim() : null });
        }}
      />

      <ConfirmDialog
        open={rejecting !== null}
        onOpenChange={(o) => !o && setRejecting(null)}
        title={`Hold ${rejecting?.orderNo}?`}
        description="The order stays blocked until the customer settles enough to come back under limit."
        variant="danger"
        confirmLabel="Keep it held"
        requireReason
        reasonLabel="Note for the sales rep"
        loading={working}
        onConfirm={(r) => {
          if (!rejecting) return;
          void decide(rejecting, "hold", { reason: r?.trim() ?? "" });
        }}
      />
    </div>
  );
}

const TONE_BG: Record<string, string> = {
  yellow: "bg-brand-yellow/10 text-brand-yellow",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
};

function MoneyTile({
  label, value, icon: Icon, tone, hint, href,
}: {
  label: string; value: string; icon: typeof TrendingUp;
  tone: string; hint: string; href: string;
}) {
  return (
    <Link href={href}>
      <Card className="p-5 hover:border-brand-yellow/40 transition-colors h-full">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
              {label}
            </div>
            <div className="tabular text-2xl font-bold text-navy-900 dark:text-white mt-1.5 truncate">
              {value}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</div>
          </div>
          <div className={cn("size-10 rounded-lg flex items-center justify-center flex-shrink-0", TONE_BG[tone])}>
            <Icon className="size-5" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

function LeakTile({
  icon: Icon, tone, value, label, href,
}: {
  icon: typeof Clock; tone: string; value: string; label: string; href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 dark:border-navy-700 p-3 hover:border-brand-yellow/40 transition-colors block"
    >
      <div className={cn("size-8 rounded-lg flex items-center justify-center mb-2", TONE_BG[tone])}>
        <Icon className="size-4" />
      </div>
      <div className="tabular text-base font-bold text-navy-900 dark:text-white">{value}</div>
      <div className="text-2xs text-slate-500 dark:text-slate-400">{label}</div>
    </Link>
  );
}
