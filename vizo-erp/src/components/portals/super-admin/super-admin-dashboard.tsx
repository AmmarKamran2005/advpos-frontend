"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp, HandCoins, Wallet, TrendingDown, ArrowRight, ShieldAlert,
  Archive, PackageX, Clock, Check, X, ChevronRight,
  CheckCircle2, AlertTriangle, Package, Banknote, UserPlus,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/dialogs";
import { SalesTrendChart } from "@/components/widgets/sales-trend-chart";
import { toast } from "@/components/ui/toaster";
import { useSession } from "@/components/providers/session-provider";
import { orders } from "@/data/sales";
import { openClaims, claimValue } from "@/data/claims";
import { awaitingConfirmation, totalOf } from "@/data/collections";
import { dashboardStats, recentActivity, type ActivityItem } from "@/data/mock";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACTIVITY_ICON: Record<string, typeof Check> = {
  check: CheckCircle2,
  "alert-triangle": AlertTriangle,
  package: Package,
  banknote: Banknote,
  "user-plus": UserPlus,
};

const ACTIVITY_TONE: Record<ActivityItem["iconKind"], string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  danger: "bg-danger/10 text-danger",
  accent: "bg-brand-yellow/10 text-brand-yellow",
};

/**
 * The owner isn't in the transaction chain — he sits above it. His first screen
 * is the health of the business plus the one thing that is genuinely his call:
 * letting an order through over its credit limit. Everything else here points
 * at a report that already exists rather than re-deriving it.
 */
export function SuperAdminDashboard() {
  const { user } = useSession();

  const limitCrossed = orders.filter((o) => o.status === "CREDIT_HOLD");
  const awaitingMoney = awaitingConfirmation();
  const openClaimList = openClaims();

  const [approving, setApproving] = React.useState<(typeof orders)[number] | null>(null);
  const [rejecting, setRejecting] = React.useState<(typeof orders)[number] | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
          Good morning, {user.fullName.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {limitCrossed.length > 0
            ? `${limitCrossed.length} ${limitCrossed.length === 1 ? "order needs" : "orders need"} your approval to go over limit.`
            : "The business at a glance — nothing is waiting on your decision."}
        </p>
      </div>

      {/* Money today */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MoneyTile
          label="Today's sales"
          value={formatMoney(dashboardStats.todaySales.value)}
          icon={TrendingUp}
          tone="yellow"
          hint={`${dashboardStats.todaySales.orders} orders`}
          href="/reports/sales-summary"
        />
        <MoneyTile
          label="Collected today"
          value={formatMoney(dashboardStats.collections.value)}
          icon={HandCoins}
          tone="success"
          hint="cash, bank & wallet"
          href="/accounting/collections"
        />
        <MoneyTile
          label="They owe us"
          value={formatCompact(dashboardStats.arOutstanding.value)}
          icon={Wallet}
          tone="info"
          hint={`${formatCompact(dashboardStats.arOutstanding.overdue60Plus)} over 60 days`}
          href="/reports/aging/customer"
        />
        <MoneyTile
          label="We owe suppliers"
          value={formatCompact(dashboardStats.apPayable.value)}
          icon={TrendingDown}
          tone="danger"
          hint={`${formatCompact(dashboardStats.apPayable.dueIn7Days)} due this week`}
          href="/reports/aging/supplier"
        />
      </div>

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
              <SalesTrendChart />
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
                  value={formatCompact(dashboardStats.arOutstanding.overdue60Plus)}
                  label="Overdue 60+ days"
                  href="/reports/aging/customer"
                />
                <LeakTile
                  icon={Archive}
                  tone="warning"
                  value="PKR 18.2L"
                  label="Stock not selling"
                  href="/reports/dead-stock"
                />
                <LeakTile
                  icon={PackageX}
                  tone="info"
                  value={formatCompact(claimValue(openClaimList))}
                  label={`${openClaimList.length} claims stuck`}
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
            <div className="space-y-3">
              {recentActivity.map((a) => {
                const Icon = ACTIVITY_ICON[a.icon] ?? CheckCircle2;
                return (
                  <div key={a.id} className="flex gap-3">
                    <div className={cn("size-8 rounded-full flex items-center justify-center flex-shrink-0", ACTIVITY_TONE[a.iconKind])}>
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-700 dark:text-slate-200">
                        <span className="font-medium text-navy-900 dark:text-white">{a.user}</span>{" "}
                        {a.action}{" "}
                        {a.target && <span className="font-medium text-navy-900 dark:text-white">{a.target}</span>}
                      </div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">{a.detail}</div>
                      <div className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {a.time}{a.location && ` · ${a.location}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {awaitingMoney.length > 0 && (
              <Link
                href="/accounting/collections"
                className="mt-4 flex items-center gap-2 p-2.5 rounded-lg bg-warning/5 border border-warning/25 hover:border-warning/40 transition-colors"
              >
                <Clock className="size-3.5 text-warning flex-shrink-0" />
                <span className="text-2xs text-slate-600 dark:text-slate-300 flex-1">
                  {formatCompact(totalOf(awaitingMoney))} collected, waiting for Accounts to confirm
                </span>
                <ChevronRight className="size-3.5 text-slate-400" />
              </Link>
            )}
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={approving !== null}
        onOpenChange={(o) => !o && setApproving(null)}
        title={`Approve ${approving?.orderNo} over limit?`}
        description={`${approving?.customerName}'s order for ${formatMoney(approving?.total ?? 0)} goes to the order department despite crossing the credit limit. You own this risk.`}
        variant="info"
        confirmLabel="Yes, approve it"
        onConfirm={() => {
          toast.success("Approved", { description: `${approving?.orderNo} moved to the order department.` });
          setApproving(null);
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
        onConfirm={(r) => {
          toast.success("Kept on hold", { description: `${rejecting?.orderNo} — ${r}` });
          setRejecting(null);
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
