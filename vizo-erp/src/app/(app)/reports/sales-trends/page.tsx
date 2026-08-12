"use client";

import * as React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCompact } from "@/lib/format";

const REGIONS = [
  { month: "Nov", Karachi: 8200000, Lahore: 4200000, Islamabad: 1800000 },
  { month: "Dec", Karachi: 9100000, Lahore: 5800000, Islamabad: 2100000 },
  { month: "Jan", Karachi: 10400000, Lahore: 6200000, Islamabad: 2400000 },
  { month: "Feb", Karachi: 9800000, Lahore: 5900000, Islamabad: 2200000 },
  { month: "Mar", Karachi: 11200000, Lahore: 7100000, Islamabad: 2600000 },
  { month: "Apr", Karachi: 12400000, Lahore: 6850000, Islamabad: 2570000 },
];

const PRODUCTS = [
  { product: "Titan T9 Earbuds",     month1: 480000, month2: 620000, month3: 720000, month4: 845000 },
  { product: "VOLT 65W Charger",      month1: 320000, month2: 380000, month3: 420000, month4: 485000 },
  { product: "PowerX 20K Power Bank", month1: 280000, month2: 240000, month3: 220000, month4: 198000 },
  { product: "VSP Bluetooth Speaker", month1: 145000, month2: 168000, month3: 185000, month4: 210000 },
  { product: "VR Type-C Cable 1.5m",  month1: 220000, month2: 245000, month3: 268000, month4: 295000 },
];

export default function SalesTrendsPage() {
  const { resolvedTheme } = useTheme();
  const mounted = resolvedTheme !== undefined;

  const [from, setFrom] = React.useState(() => new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = React.useState<number | null>(null);

  const isDark = resolvedTheme === "dark";
  const tickColor = isDark ? "#94A3B8" : "#64748B";
  const gridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(3,24,51,0.05)";

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Sales Trends" }]}
        title="Sales Trends"
        subtitle="By region and product · last 6 months"
        actions={
          <ReportToolbar mode="range" reportName="Sales Trends" fromDate={from} toDate={to} onRangeChange={(f, t) => { setFrom(f); setTo(t); }} locationId={locationId} onLocationChange={setLocationId} />
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">Revenue by Location</h3>
              <Badge variant="success">▲ 18%</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Monthly revenue across cities</p>
            <div className="h-72">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={REGIONS} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke={gridColor} vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: tickColor, fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${v / 1000}K`} />
                    <Tooltip contentStyle={{ backgroundColor: "#031833", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12 }} labelStyle={{ color: "#EDC705" }} itemStyle={{ color: "white" }} formatter={(v) => formatCompact(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Karachi"   stackId="a" fill="#EDC705" />
                    <Bar dataKey="Lahore"    stackId="a" fill="#3B82F6" />
                    <Bar dataKey="Islamabad" stackId="a" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">Top Products Trend</h3>
              <Badge variant="muted">5 SKUs</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Last 4 months — by revenue</p>
            <div className="h-72">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={PRODUCTS.map((p) => ({ name: p.product, m1: p.month1, m2: p.month2, m3: p.month3, m4: p.month4 }))} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke={gridColor} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 9 }} axisLine={false} tickLine={false} angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: tickColor, fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip contentStyle={{ backgroundColor: "#031833", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12 }} labelStyle={{ color: "#EDC705" }} itemStyle={{ color: "white" }} />
                    <Line type="monotone" dataKey="m1" stroke="#94A3B8" strokeWidth={2} name="Jan" dot={false} />
                    <Line type="monotone" dataKey="m2" stroke="#3B82F6" strokeWidth={2} name="Feb" dot={false} />
                    <Line type="monotone" dataKey="m3" stroke="#F59E0B" strokeWidth={2} name="Mar" dot={false} />
                    <Line type="monotone" dataKey="m4" stroke="#EDC705" strokeWidth={3} name="Apr" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardBody>
            <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Sales Heat Map — by Region</h3>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 px-2 py-2">Region</th>
                    {REGIONS.map((r) => (
                      <th key={r.month} className="text-right text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2">{r.month}</th>
                    ))}
                    <th className="text-right text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(["Karachi", "Lahore", "Islamabad"] as const).map((city) => {
                    const total = REGIONS.reduce((s, r) => s + r[city], 0);
                    const max = Math.max(...REGIONS.map((r) => r[city]));
                    return (
                      <tr key={city}>
                        <td className="px-2 py-2 text-sm font-semibold text-navy-900 dark:text-white">{city}</td>
                        {REGIONS.map((r) => {
                          const intensity = r[city] / max;
                          return (
                            <td key={r.month} className="px-3 py-1">
                              <div className="rounded-md text-right text-xs tabular font-medium px-2 py-1.5 text-navy-900 dark:text-white" style={{ backgroundColor: `rgba(237, 199, 5, ${intensity * 0.5})` }}>
                                {formatCompact(r[city], false)}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-1 text-right tabular text-sm font-bold text-navy-900 dark:text-white">{formatCompact(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
