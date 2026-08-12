"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { accounts } from "@/data/accounting";
import { formatMoney, formatDate } from "@/lib/format";
import { getLocation } from "@/data/settings";

export default function TrialBalancePage() {
  const [asOfDate, setAsOfDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = React.useState<number | null>(null);

  const leaves = accounts.filter((a) => !a.isGroup);
  const debitTotal = leaves.filter((a) => ["ASSET", "EXPENSE"].includes(a.type)).reduce((s, a) => s + a.balance, 0);
  const creditTotal = leaves.filter((a) => ["LIABILITY", "EQUITY", "REVENUE"].includes(a.type)).reduce((s, a) => s + Math.abs(a.balance), 0);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Trial Balance" }]}
        title="Trial Balance"
        subtitle={`As of ${formatDate(asOfDate)} · ${locationId ? getLocation(locationId)?.name : "All Locations"}`}
        actions={
          <ReportToolbar
            mode="asOf"
            reportName="Trial Balance"
            asOfDate={asOfDate}
            onAsOfChange={setAsOfDate}
            locationId={locationId}
            onLocationChange={setLocationId}
          />
        }
      />

      <Card className="max-w-5xl mx-auto">
        <CardBody>
          <div className="text-center mb-6 pb-4 border-b-2 border-navy-900 dark:border-brand-yellow">
            <h2 className="text-xl font-bold text-navy-900 dark:text-white">VIZO Trading Company (Pvt.) Ltd.</h2>
            <h3 className="text-lg font-semibold text-navy-900 dark:text-white mt-1">Trial Balance</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              As of {formatDate(asOfDate)} · {locationId ? getLocation(locationId)?.name : "All Locations"}
            </p>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-navy-700">
                <th className="text-left text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 py-2.5">Account Code</th>
                <th className="text-left text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 py-2.5">Account Name</th>
                <th className="text-right text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 py-2.5">Debit</th>
                <th className="text-right text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 py-2.5">Credit</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
              {leaves.map((a) => {
                const isDebit = ["ASSET", "EXPENSE"].includes(a.type);
                return (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-navy-800 group cursor-pointer">
                    <td className="py-2 tabular text-xs text-slate-500 dark:text-slate-400">
                      <Link href={`/accounting/ledger?accountId=${a.id}`} className="block">{a.code}</Link>
                    </td>
                    <td className="py-2 text-sm text-navy-900 dark:text-white">
                      <Link href={`/accounting/ledger?accountId=${a.id}`} className="block hover:text-brand-yellow-700 dark:hover:text-brand-yellow">{a.name}</Link>
                    </td>
                    <td className="py-2 text-right tabular text-sm text-navy-900 dark:text-white">
                      <Link href={`/accounting/ledger?accountId=${a.id}`} className="block">{isDebit ? formatMoney(a.balance) : ""}</Link>
                    </td>
                    <td className="py-2 text-right tabular text-sm text-navy-900 dark:text-white">
                      <Link href={`/accounting/ledger?accountId=${a.id}`} className="block">{!isDebit ? formatMoney(Math.abs(a.balance)) : ""}</Link>
                    </td>
                    <td className="py-2">
                      <ArrowRight className="size-3 text-slate-300 group-hover:text-brand-yellow opacity-0 group-hover:opacity-100" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-navy-900 dark:border-brand-yellow">
                <td colSpan={2} className="py-3 text-right text-sm font-bold uppercase tracking-wider text-navy-900 dark:text-white">Totals</td>
                <td className="py-3 text-right tabular text-base font-bold text-navy-900 dark:text-white">{formatMoney(debitTotal)}</td>
                <td className="py-3 text-right tabular text-base font-bold text-navy-900 dark:text-white">{formatMoney(creditTotal)}</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={5} className="py-2 text-right text-xs">
                  {debitTotal === creditTotal ? (
                    <span className="text-success font-semibold">✓ Balanced</span>
                  ) : (
                    <span className="text-danger font-semibold">⚠ Difference: {formatMoney(Math.abs(debitTotal - creditTotal))}</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
            💡 Click any account row to drill into its General Ledger
          </div>
        </CardBody>
      </Card>
    </>
  );
}
