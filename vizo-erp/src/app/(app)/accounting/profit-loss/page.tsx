"use client";

import { Calendar, Download, Printer } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { accounts } from "@/data/accounting";
import { formatMoney, formatPercent } from "@/lib/format";

export default function ProfitLossPage() {
  const revenue = accounts.filter((a) => a.type === "REVENUE" && !a.isGroup);
  const cogs = accounts.find((a) => a.code === "5001");
  const opex = accounts.filter((a) => a.type === "EXPENSE" && !a.isGroup && a.code !== "5001");

  const totalRevenue = revenue.reduce((s, a) => s + a.balance, 0);
  const cogsValue = cogs?.balance ?? 0;
  const grossProfit = totalRevenue - cogsValue;
  const totalOpex = opex.reduce((s, a) => s + a.balance, 0);
  const netProfit = grossProfit - totalOpex;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Profit & Loss" }]}
        title="Profit & Loss Statement"
        subtitle="May 2026 (Month-to-date)"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5"><Calendar /><span>Period</span></Button>
            <Button variant="secondary" size="md" className="gap-1.5"><Printer /><span className="hidden sm:inline">Print</span></Button>
            <Button variant="secondary" size="md" className="gap-1.5"><Download /><span className="hidden sm:inline">Export</span></Button>
          </>
        }
      />

      <Card className="max-w-4xl mx-auto">
        <CardBody>
          <div className="text-center mb-6 pb-4 border-b-2 border-navy-900 dark:border-brand-yellow">
            <h2 className="text-xl font-bold text-navy-900 dark:text-white">VIZO Trading Company (Pvt.) Ltd.</h2>
            <h3 className="text-lg font-semibold text-navy-900 dark:text-white mt-1">Profit & Loss Statement</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">For the period: 1 May 2026 (MTD)</p>
          </div>

          <Section title="Revenue">
            {revenue.map((a) => <Row key={a.id} label={a.name} value={a.balance} />)}
            <Total label="Total Revenue" value={totalRevenue} />
          </Section>

          <Section title="Cost of Goods Sold">
            <Row label={cogs?.name ?? "COGS"} value={cogsValue} />
            <Total label="Total COGS" value={cogsValue} />
          </Section>

          <div className="bg-info/5 border-2 border-info/20 rounded-lg my-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-bold tracking-wider text-info-dark dark:text-info-light">Gross Profit</div>
                <div className="text-2xs text-info-dark/60 mt-0.5">Margin: {formatPercent((grossProfit / totalRevenue) * 100)}</div>
              </div>
              <div className="text-2xl tabular font-bold text-info-dark dark:text-info-light">{formatMoney(grossProfit)}</div>
            </div>
          </div>

          <Section title="Operating Expenses">
            {opex.map((a) => <Row key={a.id} label={a.name} value={a.balance} />)}
            <Total label="Total Operating Expenses" value={totalOpex} />
          </Section>

          <div className="bg-success/5 border-2 border-success/30 rounded-lg my-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm uppercase font-bold tracking-wider text-success-dark dark:text-success-light">Net Profit</div>
                <div className="text-xs text-success-dark/60 mt-1">Net Margin: {formatPercent((netProfit / totalRevenue) * 100)}</div>
              </div>
              <div className="text-3xl tabular font-bold text-success-dark dark:text-success-light">{formatMoney(netProfit)}</div>
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2 pb-2 border-b border-slate-200 dark:border-navy-700">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      <span className="tabular text-sm text-navy-900 dark:text-white">{formatMoney(value)}</span>
    </div>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-2 mt-1 border-t border-slate-200 dark:border-navy-700">
      <span className="text-sm font-bold text-navy-900 dark:text-white">{label}</span>
      <span className="tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(value)}</span>
    </div>
  );
}
