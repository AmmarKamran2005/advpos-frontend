import Link from "next/link";
import {
  TrendingUp,
  Banknote,
  Clock,
  Receipt,
  Lightbulb,
  Calendar,
  Download,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  TrendingDown,
  Archive,
  Wallet,
  Landmark,
  Smartphone,
  MoreHorizontal,
  Eye,
  Check,
  AlertTriangle,
  Package,
  UserPlus,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, StatusPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/widgets/stat-card";
import { SalesTrendChart } from "@/components/widgets/sales-trend-chart";
import {
  dashboardStats,
  locationPerformance,
  topProducts,
  stockAlerts,
  cashPosition,
  recentOrders,
  recentActivity,
  dailyBriefing,
  currentUser,
} from "@/data/mock";
import { formatCompact, formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import { DashboardForRole } from "@/components/portals/dashboard-for-role";
import { cn } from "@/lib/utils";

const STOCK_ALERT_STYLES = {
  danger:  { bg: "bg-danger/5  border-danger/20",  iconBg: "bg-danger/10  text-danger",  link: "text-danger"  },
  warning: { bg: "bg-warning/5 border-warning/20", iconBg: "bg-warning/10 text-warning", link: "text-warning" },
  info:    { bg: "bg-info/5    border-info/20",    iconBg: "bg-info/10    text-info",    link: "text-info"    },
} as const;

const STOCK_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "alert-circle":   AlertCircle,
  "trending-down":  TrendingDown,
  archive:          Archive,
};

const ACTIVITY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  check:            Check,
  "alert-triangle": AlertTriangle,
  package:          Package,
  banknote:         Banknote,
  "user-plus":      UserPlus,
};

const ACTIVITY_KIND: Record<string, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info:    "bg-info/10 text-info",
  danger:  "bg-danger/10 text-danger",
  accent:  "bg-brand-yellow/10 text-brand-yellow",
};

const CASH_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  wallet:     Wallet,
  landmark:   Landmark,
  smartphone: Smartphone,
};

const CASH_COLOR: Record<string, string> = {
  success: "bg-success/10 text-success",
  info:    "bg-info/10 text-info",
  yellow:  "bg-brand-yellow/10 text-brand-yellow",
};

export default function DashboardPage() {
  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";
  const todayLabel = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardForRole>
      <>
      {/* ───────── Page Header ───────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 dark:text-white">
            {greeting}, {currentUser.fullName.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Here&apos;s what&apos;s happening today, {todayLabel}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md" className="gap-1.5">
            <Calendar />
            <span>Today</span>
          </Button>
          <Button variant="secondary" size="md" className="gap-1.5">
            <Download />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="primary" size="md" className="gap-1.5">
            <RefreshCw />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* ───────── Top Stat Cards ───────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Today's Sales"
          value={formatMoney(dashboardStats.todaySales.value)}
          icon={TrendingUp}
          iconBg="yellow"
          delta={{ value: dashboardStats.todaySales.deltaPercent }}
          footer={
            <>
              <span className="tabular">{dashboardStats.todaySales.orders}</span> orders · vs yesterday
            </>
          }
        />
        <StatCard
          label="Collections Today"
          value={formatMoney(dashboardStats.collections.value)}
          icon={Banknote}
          iconBg="success"
          delta={{ value: dashboardStats.collections.deltaPercent }}
          footer={
            <>
              Cash <span className="tabular text-navy-900 dark:text-white">1.2L</span> · Bank{" "}
              <span className="tabular text-navy-900 dark:text-white">1.8L</span> · Wallet{" "}
              <span className="tabular text-navy-900 dark:text-white">15K</span>
            </>
          }
        />
        <StatCard
          label="AR Outstanding"
          value={formatCompact(dashboardStats.arOutstanding.value)}
          icon={Clock}
          iconBg="warning"
          delta={{ value: dashboardStats.arOutstanding.deltaPercent }}
          footer={
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-danger" />
              <span className="tabular text-danger font-semibold">
                {formatCompact(dashboardStats.arOutstanding.overdue60Plus, false)}
              </span>{" "}
              overdue 60+ days
            </span>
          }
        />
        <StatCard
          label="AP Payable"
          value={formatCompact(dashboardStats.apPayable.value)}
          icon={Receipt}
          iconBg="info"
          delta={{ value: dashboardStats.apPayable.deltaPercent }}
          footer={
            <>
              <span className="tabular text-warning font-semibold">
                {formatCompact(dashboardStats.apPayable.dueIn7Days, false)}
              </span>{" "}
              due in next 7 days
            </>
          }
        />
      </div>

      {/* ───────── Daily Briefing ───────── */}
      <Card className="mb-6 relative overflow-hidden bg-gradient-to-br from-navy-900 to-navy-800 dark:from-navy-900 dark:to-navy-950 text-white border-navy-800">
        <div className="absolute -top-10 -right-10 size-40 bg-brand-yellow/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 size-24 bg-brand-yellow/5 rounded-full blur-2xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-4 p-5">
          <div className="flex-shrink-0">
            <div className="size-12 rounded-xl bg-brand-yellow/15 flex items-center justify-center">
              <Lightbulb className="size-5 text-brand-yellow" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-brand-yellow">
                Daily Briefing
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-200">
              {dailyBriefing.text.map((seg, i) => (
                <span
                  key={i}
                  className={cn(
                    seg.highlight && "text-brand-yellow font-semibold",
                    seg.bold && "font-semibold text-white"
                  )}
                >
                  {seg.content}
                </span>
              ))}
            </p>
          </div>
          <div className="flex-shrink-0">
            <Button variant="accent" size="sm" asChild>
              <Link href="/reports">
                Open reports
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* ───────── Sales Trend + Sales by Location ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Sales Trend (2/3) */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3">
            <div>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">
                Sales Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Last 30 days · all locations
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs">
              {["7D", "30D", "90D", "1Y"].map((p) => (
                <button
                  key={p}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium transition-colors",
                    p === "30D"
                      ? "bg-navy-900 dark:bg-navy-800 text-brand-yellow"
                      : "text-slate-500 hover:text-navy-900 dark:hover:text-white"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="px-5 pb-5">
            <div className="flex items-end gap-6 mb-4">
              <div>
                <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                  Total Revenue
                </div>
                <div className="text-2xl font-bold tabular text-navy-900 dark:text-white mt-1">
                  PKR 2.18 Cr
                </div>
              </div>
              <div>
                <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                  Orders
                </div>
                <div className="text-2xl font-bold tabular text-navy-900 dark:text-white mt-1">
                  1,247
                </div>
              </div>
              <div>
                <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                  Avg Order
                </div>
                <div className="text-2xl font-bold tabular text-navy-900 dark:text-white mt-1">
                  17.5K
                </div>
              </div>
            </div>
            <SalesTrendChart />
          </div>
        </Card>

        {/* Sales by Location */}
        <Card className="p-0 overflow-hidden">
          <CardBody>
            <div className="mb-4">
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">
                Sales by Location
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Revenue this month
              </p>
            </div>
            <div className="space-y-4">
              {locationPerformance.map((b) => {
                const pct = (b.revenue / b.target) * 100;
                return (
                  <div key={b.location}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: b.color }}
                        />
                        <span className="text-sm font-medium text-navy-900 dark:text-white">
                          {b.location}
                        </span>
                      </div>
                      <span className="text-sm font-bold tabular text-navy-900 dark:text-white">
                        {formatCompact(b.revenue)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: b.color }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>Target: {formatCompact(b.target, false)}</span>
                      <span
                        className={cn(
                          "font-semibold",
                          pct >= 70 ? "text-success" : "text-warning"
                        )}
                      >
                        {formatPercent(pct, 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-navy-700">
              <a
                href="#"
                className="text-sm text-brand-yellow font-medium inline-flex items-center gap-1 hover:gap-2 transition-all"
              >
                View detailed report <ArrowRight className="size-3.5" />
              </a>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ───────── Top Products + Stock Alerts + Cash Position ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Top Products */}
        <Card className="p-0 overflow-hidden">
          <div className="p-5 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">
                Top Products
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                By revenue · last 7 days
              </p>
            </div>
            <button className="text-xs text-brand-yellow hover:underline font-medium">
              View all
            </button>
          </div>
          <div className="px-2 pb-2">
            {topProducts.map((p) => (
              <div
                key={p.sku}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 cursor-pointer transition-colors"
              >
                <div className="size-9 rounded-lg bg-navy-100 dark:bg-navy-700 flex items-center justify-center text-navy-900 dark:text-brand-yellow font-bold text-sm tabular">
                  {p.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-navy-900 dark:text-white truncate">
                    {p.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    SKU: {p.sku} · {p.units} units sold
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold tabular text-navy-900 dark:text-white">
                    {formatCompact(p.revenue)}
                  </div>
                  <div
                    className={cn(
                      "text-2xs font-semibold",
                      p.deltaPercent > 0 ? "text-success" : "text-danger"
                    )}
                  >
                    {p.deltaPercent > 0 ? "▲" : "▼"} {Math.abs(p.deltaPercent)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Stock Alerts */}
        <Card className="p-0 overflow-hidden">
          <div className="p-5 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">
                Stock Alerts
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Action needed
              </p>
            </div>
            <Badge variant="warning">12 alerts</Badge>
          </div>
          <div className="px-5 pb-5 space-y-3">
            {stockAlerts.map((a) => {
              const Icon = STOCK_ICON[a.icon];
              const styles = STOCK_ALERT_STYLES[a.kind as keyof typeof STOCK_ALERT_STYLES];
              return (
                <div
                  key={a.title}
                  className={cn("flex items-start gap-3 p-3 border rounded-lg", styles.bg)}
                >
                  <div
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      styles.iconBg
                    )}
                  >
                    {Icon && <Icon className="size-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy-900 dark:text-white">
                      {a.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {a.subtitle}
                    </div>
                    <a
                      href="#"
                      className={cn(
                        "text-xs font-medium mt-1.5 inline-flex items-center gap-1 hover:underline",
                        styles.link
                      )}
                    >
                      {a.cta} <ArrowRight className="size-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Cash Position */}
        <Card className="p-0 overflow-hidden">
          <div className="p-5 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">
                Cash Position
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                As of right now
              </p>
            </div>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal />
            </Button>
          </div>
          <div className="px-5 pb-5">
            <div className="text-3xl font-bold tabular text-navy-900 dark:text-white">
              {formatCompact(cashPosition.total)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Total liquid cash across accounts
            </div>
            <div className="mt-5 space-y-3">
              {cashPosition.breakdown.map((row) => {
                const Icon = CASH_ICON[row.icon];
                return (
                  <div key={row.label} className="flex items-center gap-3">
                    <div
                      className={cn(
                        "size-8 rounded-lg flex items-center justify-center",
                        CASH_COLOR[row.color]
                      )}
                    >
                      {Icon && <Icon className="size-3.5" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-navy-900 dark:text-white">
                        {row.label}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {row.sublabel}
                      </div>
                    </div>
                    <div className="text-sm font-bold tabular text-navy-900 dark:text-white">
                      {formatCompact(row.value, false)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* ───────── Recent Orders + Activity ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="p-5 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">
                Recent Orders
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Last 6 orders across all locations
              </p>
            </div>
            <a
              href="#"
              className="text-xs text-brand-yellow hover:underline font-medium inline-flex items-center gap-1"
            >
              View all orders <ArrowRight className="size-3" />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-navy-700/50">
                  <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">
                    Order #
                  </th>
                  <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">
                    Customer
                  </th>
                  <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">
                    Location
                  </th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">
                    Amount
                  </th>
                  <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">
                    Status
                  </th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {recentOrders.map((o) => (
                  <tr
                    key={o.orderNo}
                    className="hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors"
                  >
                    <td className="tabular px-4 py-3 text-sm text-navy-900 dark:text-white font-medium">
                      {o.orderNo}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={o.initials} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-navy-900 dark:text-white">
                            {o.customer}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {o.type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                      {o.location}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular font-semibold text-navy-900 dark:text-white">
                      {formatNumber(o.amount).replace(/^/, "PKR ")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        variant={o.statusVariant as "success" | "warning" | "info" | "muted"}
                      >
                        {statusLabel(o.status)}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon-sm">
                        <Eye />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Activity Feed */}
        <Card className="p-0 overflow-hidden">
          <div className="p-5 pb-3">
            <h3 className="text-base font-semibold text-navy-900 dark:text-white">
              Recent Activity
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live audit feed
            </p>
          </div>
          <div className="px-5 pb-5 space-y-4 max-h-[450px] overflow-y-auto scrollbar-thin">
            {recentActivity.map((a, i) => {
              const Icon = ACTIVITY_ICON[a.icon];
              const isLast = i === recentActivity.length - 1;
              return (
                <div key={a.id} className="flex gap-3">
                  <div className="relative flex-shrink-0">
                    <div
                      className={cn(
                        "size-8 rounded-full flex items-center justify-center",
                        ACTIVITY_KIND[a.iconKind]
                      )}
                    >
                      {Icon && <Icon className="size-3.5" />}
                    </div>
                    {!isLast && (
                      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-full bg-slate-200 dark:bg-navy-700" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="text-sm text-navy-900 dark:text-white">
                      <span className="font-semibold">{a.user}</span> {a.action}{" "}
                      {a.target && (
                        <span
                          className={cn(
                            "font-mono text-xs px-1.5 py-0.5 rounded",
                            a.iconKind === "warning"
                              ? "text-warning font-semibold"
                              : "bg-slate-100 dark:bg-navy-700"
                          )}
                        >
                          {a.target}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {a.detail}
                    </div>
                    <div className="text-2xs text-slate-400 dark:text-slate-500 mt-1">
                      {a.time}
                      {a.location && ` · ${a.location}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      </>
    </DashboardForRole>
  );
}
