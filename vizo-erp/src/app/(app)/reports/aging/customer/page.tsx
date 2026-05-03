"use client";

import { Calendar, Download, Printer, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { parties } from "@/data/parties";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

const customers = parties.filter((p) => p.type === "CUSTOMER" || p.type === "BOTH").filter((p) => p.currentBalance > 0);

const AGING = customers.map((c, i) => {
  const total = c.currentBalance;
  const a = i % 4;
  return {
    customer: c,
    current: a === 0 ? total : Math.round(total * 0.4),
    days_1_30: a === 1 ? Math.round(total * 0.6) : Math.round(total * 0.2),
    days_31_60: a === 2 ? Math.round(total * 0.4) : Math.round(total * 0.15),
    days_61_90: a === 3 ? Math.round(total * 0.3) : Math.round(total * 0.1),
    days_over_90: a === 0 ? 0 : Math.round(total * 0.05),
    total,
  };
});

const TOTALS = AGING.reduce((acc, r) => ({
  current:        acc.current        + r.current,
  days_1_30:      acc.days_1_30      + r.days_1_30,
  days_31_60:     acc.days_31_60     + r.days_31_60,
  days_61_90:     acc.days_61_90     + r.days_61_90,
  days_over_90:   acc.days_over_90   + r.days_over_90,
  total:          acc.total          + r.total,
}), { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 0, total: 0 });

export default function CustomerAgingPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "AR Aging" }]}
        title="Accounts Receivable Aging"
        subtitle="Outstanding by age bucket — as of May 1, 2026"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5"><Calendar /><span>As of</span></Button>
            <Button variant="secondary" size="md" className="gap-1.5"><MessageSquare /><span className="hidden sm:inline">Send Reminders</span></Button>
            <Button variant="secondary" size="md" className="gap-1.5"><Printer /><span className="hidden sm:inline">Print</span></Button>
            <Button variant="secondary" size="md" className="gap-1.5"><Download /><span className="hidden sm:inline">Export</span></Button>
          </>
        }
      />

      {/* Aging summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <BucketCard label="Total AR"      value={TOTALS.total}        color="text-navy-900 dark:text-white" />
        <BucketCard label="Current"        value={TOTALS.current}      color="text-success" />
        <BucketCard label="1-30 Days"      value={TOTALS.days_1_30}    color="text-info" />
        <BucketCard label="31-60 Days"     value={TOTALS.days_31_60}   color="text-warning" />
        <BucketCard label="61-90 Days"     value={TOTALS.days_61_90}   color="text-warning" />
        <BucketCard label="90+ Days"       value={TOTALS.days_over_90} color="text-danger" />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-navy-700/50 border-b border-slate-200 dark:border-navy-700">
                <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Customer</th>
                <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">Current</th>
                <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">1-30</th>
                <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">31-60</th>
                <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">61-90</th>
                <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">90+</th>
                <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
              {AGING.map((r) => (
                <tr key={r.customer.id} className="hover:bg-slate-50 dark:hover:bg-navy-800">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={r.customer.initials} size="sm" />
                      <div>
                        <div className="text-sm font-medium text-navy-900 dark:text-white">{r.customer.legalName}</div>
                        <div className="text-2xs text-slate-500 dark:text-slate-400">{r.customer.partyCode} · NET {r.customer.creditDays}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-sm text-success">{r.current > 0 ? formatMoney(r.current) : "—"}</td>
                  <td className="px-3 py-2.5 text-right tabular text-sm text-info">{r.days_1_30 > 0 ? formatMoney(r.days_1_30) : "—"}</td>
                  <td className={cn("px-3 py-2.5 text-right tabular text-sm font-semibold", r.days_31_60 > 0 ? "text-warning" : "text-slate-300")}>{r.days_31_60 > 0 ? formatMoney(r.days_31_60) : "—"}</td>
                  <td className={cn("px-3 py-2.5 text-right tabular text-sm font-semibold", r.days_61_90 > 0 ? "text-warning" : "text-slate-300")}>{r.days_61_90 > 0 ? formatMoney(r.days_61_90) : "—"}</td>
                  <td className={cn("px-3 py-2.5 text-right tabular text-sm font-bold", r.days_over_90 > 0 ? "text-danger" : "text-slate-300")}>{r.days_over_90 > 0 ? formatMoney(r.days_over_90) : "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(r.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-navy-900 text-white">
                <td className="px-4 py-3 text-sm font-bold uppercase tracking-wider">Totals</td>
                <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(TOTALS.current)}</td>
                <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(TOTALS.days_1_30)}</td>
                <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(TOTALS.days_31_60)}</td>
                <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(TOTALS.days_61_90)}</td>
                <td className="px-3 py-3 text-right tabular text-sm font-bold text-brand-yellow">{formatMoney(TOTALS.days_over_90)}</td>
                <td className="px-4 py-3 text-right tabular text-base font-bold text-brand-yellow">{formatMoney(TOTALS.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </>
  );
}

function BucketCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="p-3">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-lg tabular font-bold mt-1 ${color}`}>{formatCompact(value, false)}</div>
    </Card>
  );
}
