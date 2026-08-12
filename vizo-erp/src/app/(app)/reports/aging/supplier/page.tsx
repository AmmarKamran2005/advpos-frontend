"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { parties } from "@/data/parties";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

const suppliers = parties.filter((p) => p.type === "SUPPLIER" || p.type === "BOTH").filter((p) => p.payableBalance > 0);

const AGING = suppliers.map((s, i) => {
  const total = s.payableBalance;
  const a = i % 4;
  return {
    supplier: s,
    current:        a === 0 ? Math.round(total * 0.7) : Math.round(total * 0.3),
    days_1_30:      a === 1 ? Math.round(total * 0.5) : Math.round(total * 0.25),
    days_31_60:     a === 2 ? Math.round(total * 0.4) : Math.round(total * 0.15),
    days_61_90:     a === 3 ? Math.round(total * 0.3) : 0,
    days_over_90:   0,
    total,
  };
});

const TOTALS = AGING.reduce((acc, r) => ({
  current: acc.current + r.current,
  days_1_30: acc.days_1_30 + r.days_1_30,
  days_31_60: acc.days_31_60 + r.days_31_60,
  days_61_90: acc.days_61_90 + r.days_61_90,
  days_over_90: acc.days_over_90 + r.days_over_90,
  total: acc.total + r.total,
}), { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 0, total: 0 });

export default function SupplierAgingPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [asOf, setAsOf] = React.useState(today);
  const [locationId, setLocationId] = React.useState<number | null>(null);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "AP Aging" }]}
        title="Accounts Payable Aging"
        subtitle={`Supplier payables by age — as of ${asOf}`}
        actions={
          <ReportToolbar mode="asOf" reportName="AP Aging" asOfDate={asOf} onAsOfChange={setAsOf} locationId={locationId} onLocationChange={setLocationId} />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total AP",    value: TOTALS.total,        color: "text-warning" },
          { label: "Current",      value: TOTALS.current,      color: "text-success" },
          { label: "1-30 Days",    value: TOTALS.days_1_30,    color: "text-info" },
          { label: "31-60 Days",   value: TOTALS.days_31_60,   color: "text-warning" },
          { label: "61-90 Days",   value: TOTALS.days_61_90,   color: "text-warning" },
          { label: "90+ Days",     value: TOTALS.days_over_90, color: "text-danger" },
        ].map((b) => (
          <Card key={b.label} className="p-3">
            <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{b.label}</div>
            <div className={`text-lg tabular font-bold mt-1 ${b.color}`}>{formatCompact(b.value, false)}</div>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-navy-700/50 border-b border-slate-200 dark:border-navy-700">
                <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Supplier</th>
                <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">Current</th>
                <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">1-30</th>
                <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">31-60</th>
                <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">61-90</th>
                <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
              {AGING.map((r) => (
                <tr key={r.supplier.id} className="hover:bg-slate-50 dark:hover:bg-navy-800">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={r.supplier.initials} size="sm" />
                      <div>
                        <div className="text-sm font-medium text-navy-900 dark:text-white">{r.supplier.legalName}</div>
                        <div className="text-2xs text-slate-500 dark:text-slate-400">{r.supplier.partyCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-sm text-success">{r.current > 0 ? formatMoney(r.current) : "—"}</td>
                  <td className="px-3 py-2.5 text-right tabular text-sm text-info">{r.days_1_30 > 0 ? formatMoney(r.days_1_30) : "—"}</td>
                  <td className={cn("px-3 py-2.5 text-right tabular text-sm font-semibold", r.days_31_60 > 0 ? "text-warning" : "text-slate-300")}>{r.days_31_60 > 0 ? formatMoney(r.days_31_60) : "—"}</td>
                  <td className={cn("px-3 py-2.5 text-right tabular text-sm font-semibold", r.days_61_90 > 0 ? "text-warning" : "text-slate-300")}>{r.days_61_90 > 0 ? formatMoney(r.days_61_90) : "—"}</td>
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
                <td className="px-4 py-3 text-right tabular text-base font-bold text-brand-yellow">{formatMoney(TOTALS.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </>
  );
}
