"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { accounts } from "@/data/accounting";
import { branchesAdmin } from "@/data/admin";
import { formatMoney, formatDate } from "@/lib/format";

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = React.useState<number | null>(null);

  const assets = accounts.filter((a) => a.type === "ASSET" && !a.isGroup);
  const liabilities = accounts.filter((a) => a.type === "LIABILITY" && !a.isGroup);
  const equity = accounts.filter((a) => a.type === "EQUITY" && !a.isGroup);

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
  const totalEquity = equity.reduce((s, a) => s + a.balance, 0);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Balance Sheet" }]}
        title="Balance Sheet"
        subtitle={`As of ${formatDate(asOfDate)} · ${branchId ? branchesAdmin.find((b) => b.id === branchId)?.name : "All Branches"}`}
        actions={
          <ReportToolbar
            mode="asOf"
            reportName="Balance Sheet"
            asOfDate={asOfDate}
            onAsOfChange={setAsOfDate}
            branchId={branchId}
            onBranchChange={setBranchId}
          />
        }
      />

      <Card className="max-w-5xl mx-auto">
        <CardBody>
          <div className="text-center mb-6 pb-4 border-b-2 border-navy-900 dark:border-brand-yellow">
            <h2 className="text-xl font-bold text-navy-900 dark:text-white">VIZO Trading Company (Pvt.) Ltd.</h2>
            <h3 className="text-lg font-semibold text-navy-900 dark:text-white mt-1">Balance Sheet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">As of {formatDate(asOfDate)}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ASSETS */}
            <div>
              <h4 className="text-sm uppercase font-bold tracking-wider text-info-dark dark:text-info-light mb-3 pb-2 border-b-2 border-info">Assets</h4>
              <div className="space-y-1">
                {assets.map((a) => (
                  <a key={a.id} href={`/accounting/ledger?accountId=${a.id}`} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-50 dark:hover:bg-navy-700">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{a.name}</span>
                    <span className="tabular text-sm text-navy-900 dark:text-white">{formatMoney(a.balance)}</span>
                  </a>
                ))}
              </div>
              <div className="bg-info/5 border-2 border-info/30 rounded-lg mt-4 p-3 flex items-center justify-between">
                <span className="text-sm font-bold uppercase text-info-dark dark:text-info-light">Total Assets</span>
                <span className="tabular text-lg font-bold text-info-dark dark:text-info-light">{formatMoney(totalAssets)}</span>
              </div>
            </div>

            {/* LIABILITIES + EQUITY */}
            <div>
              <h4 className="text-sm uppercase font-bold tracking-wider text-warning-dark dark:text-warning-light mb-3 pb-2 border-b-2 border-warning">Liabilities</h4>
              <div className="space-y-1">
                {liabilities.map((a) => (
                  <a key={a.id} href={`/accounting/ledger?accountId=${a.id}`} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-50 dark:hover:bg-navy-700">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{a.name}</span>
                    <span className="tabular text-sm text-navy-900 dark:text-white">{formatMoney(a.balance)}</span>
                  </a>
                ))}
              </div>
              <div className="bg-warning/5 border-2 border-warning/30 rounded-lg mt-4 p-3 flex items-center justify-between">
                <span className="text-sm font-bold uppercase text-warning-dark dark:text-warning-light">Total Liabilities</span>
                <span className="tabular text-lg font-bold text-warning-dark dark:text-warning-light">{formatMoney(totalLiabilities)}</span>
              </div>

              <h4 className="text-sm uppercase font-bold tracking-wider text-brand-yellow-700 dark:text-brand-yellow mt-6 mb-3 pb-2 border-b-2 border-brand-yellow">Equity</h4>
              <div className="space-y-1">
                {equity.map((a) => (
                  <a key={a.id} href={`/accounting/ledger?accountId=${a.id}`} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-50 dark:hover:bg-navy-700">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{a.name}</span>
                    <span className="tabular text-sm text-navy-900 dark:text-white">{formatMoney(a.balance)}</span>
                  </a>
                ))}
              </div>
              <div className="bg-brand-yellow/5 border-2 border-brand-yellow/30 rounded-lg mt-4 p-3 flex items-center justify-between">
                <span className="text-sm font-bold uppercase text-brand-yellow-700 dark:text-brand-yellow">Total Equity</span>
                <span className="tabular text-lg font-bold text-brand-yellow-700 dark:text-brand-yellow">{formatMoney(totalEquity)}</span>
              </div>

              <div className="bg-success/5 border-2 border-success/30 rounded-lg mt-4 p-4 flex items-center justify-between">
                <span className="text-sm font-bold uppercase text-success-dark dark:text-success-light">Liabilities + Equity</span>
                <span className="tabular text-xl font-bold text-success-dark dark:text-success-light">{formatMoney(totalLiabilities + totalEquity)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-navy-700 text-center text-xs">
            {Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 ? (
              <span className="text-success font-semibold">✓ Balance Sheet balances</span>
            ) : (
              <span className="text-danger font-semibold">⚠ Imbalance: {formatMoney(Math.abs(totalAssets - totalLiabilities - totalEquity))}</span>
            )}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
