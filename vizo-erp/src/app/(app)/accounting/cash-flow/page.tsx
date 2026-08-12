"use client";

import * as React from "react";
import { TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { formatMoney, formatDate } from "@/lib/format";
import { getLocation } from "@/data/settings";

const SECTIONS = [
  {
    title: "Operating Activities",
    items: [
      { label: "Net Profit",                              value: 7095000 },
      { label: "Depreciation",                            value: 245000 },
      { label: "(Increase) in Accounts Receivable",       value: -2400000 },
      { label: "(Increase) in Inventory",                  value: -850000 },
      { label: "Increase in Accounts Payable",            value: 480000 },
      { label: "Increase in Sales Tax Payable",           value: 124000 },
    ],
    total: "Net Cash from Operating",
  },
  {
    title: "Investing Activities",
    items: [
      { label: "Purchase of Vehicles",                     value: -480000 },
      { label: "Purchase of Office Equipment",             value: -125000 },
    ],
    total: "Net Cash used in Investing",
  },
  {
    title: "Financing Activities",
    items: [
      { label: "Owner's drawings",                          value: -200000 },
    ],
    total: "Net Cash used in Financing",
  },
];

export default function CashFlowPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [from, setFrom] = React.useState(monthStart);
  const [to,   setTo]   = React.useState(today);
  const [locationId, setLocationId] = React.useState<number | null>(null);

  const opening = 5240000;
  const totals = SECTIONS.map((s) => s.items.reduce((sum, i) => sum + i.value, 0));
  const netChange = totals.reduce((s, t) => s + t, 0);
  const closing = opening + netChange;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Cash Flow" }]}
        title="Cash Flow Statement"
        subtitle={`${formatDate(from)} → ${formatDate(to)} · ${locationId ? getLocation(locationId)?.name : "All Locations"}`}
        actions={
          <ReportToolbar
            mode="range"
            reportName="Cash Flow"
            fromDate={from}
            toDate={to}
            onRangeChange={(f, t) => { setFrom(f); setTo(t); }}
            locationId={locationId}
            onLocationChange={setLocationId}
          />
        }
      />

      <Card className="max-w-4xl mx-auto">
        <CardBody>
          <div className="text-center mb-6 pb-4 border-b-2 border-navy-900 dark:border-brand-yellow">
            <h2 className="text-xl font-bold text-navy-900 dark:text-white">VIZO Trading Company (Pvt.) Ltd.</h2>
            <h3 className="text-lg font-semibold text-navy-900 dark:text-white mt-1">Statement of Cash Flows</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">For the period ended {formatDate(to)}</p>
          </div>

          {SECTIONS.map((sec, idx) => (
            <div key={sec.title} className="mb-6">
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2 pb-2 border-b border-slate-200 dark:border-navy-700">{sec.title}</h4>
              {sec.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-50 dark:hover:bg-navy-700">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{it.label}</span>
                  <span className={`tabular text-sm ${it.value < 0 ? "text-danger" : "text-navy-900 dark:text-white"}`}>{it.value < 0 ? "(" : ""}{formatMoney(Math.abs(it.value))}{it.value < 0 ? ")" : ""}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2 mt-1 border-t border-slate-200 dark:border-navy-700 font-bold">
                <span className="text-sm text-navy-900 dark:text-white">{sec.total}</span>
                <span className={`tabular text-sm ${totals[idx] < 0 ? "text-danger" : "text-success"}`}>{totals[idx] < 0 ? "(" : ""}{formatMoney(Math.abs(totals[idx]))}{totals[idx] < 0 ? ")" : ""}</span>
              </div>
            </div>
          ))}

          <div className="space-y-2 mt-6 pt-4 border-t-2 border-navy-900 dark:border-brand-yellow">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700 dark:text-slate-300">Net change in cash</span>
              <span className={`tabular text-sm font-semibold ${netChange < 0 ? "text-danger" : "text-success"}`}>
                {netChange < 0 ? "(" : ""}{formatMoney(Math.abs(netChange))}{netChange < 0 ? ")" : ""}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700 dark:text-slate-300">Cash at beginning of period</span>
              <span className="tabular text-sm text-navy-900 dark:text-white">{formatMoney(opening)}</span>
            </div>
            <div className="flex items-center justify-between bg-success/5 border-2 border-success/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-success" />
                <span className="text-sm font-bold uppercase text-success-dark dark:text-success-light">Cash at end of period</span>
              </div>
              <span className="tabular text-xl font-bold text-success-dark dark:text-success-light">{formatMoney(closing)}</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
