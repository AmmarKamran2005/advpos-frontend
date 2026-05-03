"use client";

import { Calendar, Download, Printer } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { accounts } from "@/data/accounting";
import { formatMoney } from "@/lib/format";

export default function TrialBalancePage() {
  const leaves = accounts.filter((a) => !a.isGroup);
  const debitTotal = leaves.filter((a) => ["ASSET", "EXPENSE"].includes(a.type)).reduce((s, a) => s + a.balance, 0);
  const creditTotal = leaves.filter((a) => ["LIABILITY", "EQUITY", "REVENUE"].includes(a.type)).reduce((s, a) => s + Math.abs(a.balance), 0);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Trial Balance" }]}
        title="Trial Balance"
        subtitle="As of May 1, 2026"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5"><Calendar /><span>As of</span></Button>
            <Button variant="secondary" size="md" className="gap-1.5"><Printer /><span className="hidden sm:inline">Print</span></Button>
            <Button variant="secondary" size="md" className="gap-1.5"><Download /><span className="hidden sm:inline">Export</span></Button>
          </>
        }
      />

      <Card className="max-w-5xl mx-auto">
        <CardBody>
          <div className="text-center mb-6 pb-4 border-b-2 border-navy-900 dark:border-brand-yellow">
            <h2 className="text-xl font-bold text-navy-900 dark:text-white">VIZO Trading Company (Pvt.) Ltd.</h2>
            <h3 className="text-lg font-semibold text-navy-900 dark:text-white mt-1">Trial Balance</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">As of May 1, 2026 · All Branches</p>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-navy-700">
                <th className="text-left text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 py-2.5">Account Code</th>
                <th className="text-left text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 py-2.5">Account Name</th>
                <th className="text-right text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 py-2.5">Debit</th>
                <th className="text-right text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 py-2.5">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
              {leaves.map((a) => {
                const isDebit = ["ASSET", "EXPENSE"].includes(a.type);
                return (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-navy-800">
                    <td className="py-2 tabular text-xs text-slate-500 dark:text-slate-400">{a.code}</td>
                    <td className="py-2 text-sm text-navy-900 dark:text-white">{a.name}</td>
                    <td className="py-2 text-right tabular text-sm text-navy-900 dark:text-white">{isDebit ? formatMoney(a.balance) : ""}</td>
                    <td className="py-2 text-right tabular text-sm text-navy-900 dark:text-white">{!isDebit ? formatMoney(Math.abs(a.balance)) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-navy-900 dark:border-brand-yellow">
                <td colSpan={2} className="py-3 text-right text-sm font-bold uppercase tracking-wider text-navy-900 dark:text-white">Totals</td>
                <td className="py-3 text-right tabular text-base font-bold text-navy-900 dark:text-white">{formatMoney(debitTotal)}</td>
                <td className="py-3 text-right tabular text-base font-bold text-navy-900 dark:text-white">{formatMoney(creditTotal)}</td>
              </tr>
              <tr>
                <td colSpan={2}></td>
                <td colSpan={2} className="py-2 text-right text-xs">
                  {debitTotal === creditTotal ? (
                    <span className="text-success font-semibold">✓ Balanced</span>
                  ) : (
                    <span className="text-danger font-semibold">⚠ Difference: {formatMoney(Math.abs(debitTotal - creditTotal))}</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </CardBody>
      </Card>
    </>
  );
}
