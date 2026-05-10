"use client";

import * as React from "react";

import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card, CardBody } from "@/components/ui/card";
import { SalesTrendChart } from "@/components/widgets/sales-trend-chart";
import { formatMoney, formatCompact } from "@/lib/format";

export default function SalesSummaryPage() {
  const [from, setFrom] = React.useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = React.useState<number | null>(null);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Sales Summary" }]}
        title="Sales Summary"
        subtitle="High-level sales performance"
        actions={
          <ReportToolbar mode="range" reportName={"Sales Summary"} fromDate={from} toDate={to} onRangeChange={(f, t) => { setFrom(f); setTo(t); }} branchId={branchId} onBranchChange={setBranchId} />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Revenue</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatCompact(21800000)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Orders</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">1,247</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Avg Order</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(17500)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Active Customers</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">218</div>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Sales Trend</h3>
          <SalesTrendChart />
        </CardBody>
      </Card>
    </>
  );
}
