"use client";

import { Calendar, Download } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SalesTrendChart } from "@/components/widgets/sales-trend-chart";
import { formatMoney, formatCompact } from "@/lib/format";

export default function SalesSummaryPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Sales Summary" }]}
        title="Sales Summary"
        subtitle="High-level sales performance"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5"><Calendar /><span>Last 30 days</span></Button>
            <Button variant="secondary" size="md" className="gap-1.5"><Download /><span className="hidden sm:inline">Export</span></Button>
          </>
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
