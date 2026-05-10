"use client";

import * as React from "react";
import { Trophy } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { parties } from "@/data/parties";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const customers = parties.filter((p) => p.type === "CUSTOMER" || p.type === "BOTH");
const TOP = customers
  .map((c, i) => ({
    rank: i + 1,
    customer: c,
    orders: 24 + Math.floor(Math.random() * 32),
    revenue: 200000 + Math.floor(Math.random() * 1500000),
    deltaPercent: -10 + Math.floor(Math.random() * 30),
  }))
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 10)
  .map((r, i) => ({ ...r, rank: i + 1 }));

const totalRevenue = TOP.reduce((s, t) => s + t.revenue, 0);

export default function TopCustomersPage() {
  const [from, setFrom] = React.useState(() => new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = React.useState<number | null>(null);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Top Customers" }]}
        title="Top Customers"
        subtitle="Last 90 days · Revenue ranking"
        actions={
          <ReportToolbar mode="range" reportName="Top Customers" fromDate={from} toDate={to} onRangeChange={(f, t) => { setFrom(f); setTo(t); }} branchId={branchId} onBranchChange={setBranchId} />
        }
      />

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-navy-900 dark:text-white">Top 10 Customers by Revenue</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Combined revenue: {formatMoney(totalRevenue)}</p>
          </div>
          <Trophy className="size-5 text-brand-yellow" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-navy-700">
          {TOP.map((t) => (
            <div key={t.customer.id} className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">
              <div className={cn(
                "size-10 rounded-lg flex items-center justify-center font-bold text-base tabular flex-shrink-0",
                t.rank === 1 ? "bg-brand-yellow text-navy-900" : t.rank <= 3 ? "bg-brand-yellow/20 text-brand-yellow-700 dark:text-brand-yellow" : "bg-slate-100 dark:bg-navy-700 text-slate-600 dark:text-slate-300"
              )}>
                {t.rank}
              </div>
              <Avatar initials={t.customer.initials} size="md" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-900 dark:text-white">{t.customer.legalName}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 inline-flex items-center gap-2">
                  <Badge variant="muted">{t.customer.category}</Badge>
                  <span>{t.customer.city}</span>
                  <span>· {t.orders} orders</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base tabular font-bold text-navy-900 dark:text-white">{formatMoney(t.revenue)}</div>
                <div className={cn("text-xs font-semibold mt-0.5",
                  t.deltaPercent > 0 ? "text-success" : t.deltaPercent < 0 ? "text-danger" : "text-slate-500"
                )}>
                  {t.deltaPercent > 0 ? "▲" : t.deltaPercent < 0 ? "▼" : "—"} {Math.abs(t.deltaPercent)}% vs prev
                </div>
              </div>
              <div className="hidden lg:block w-32">
                <div className="h-2 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-yellow" style={{ width: `${(t.revenue / TOP[0].revenue) * 100}%` }} />
                </div>
                <div className="text-2xs text-slate-500 dark:text-slate-400 mt-1 text-right tabular">
                  {((t.revenue / totalRevenue) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
