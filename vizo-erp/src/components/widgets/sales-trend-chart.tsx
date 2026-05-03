"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useTheme } from "next-themes";
import { salesTrendData } from "@/data/mock";
import { formatCompact } from "@/lib/format";

export function SalesTrendChart() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const tickColor = isDark ? "#94A3B8" : "#64748B";
  const gridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(3,24,51,0.05)";

  if (!mounted) {
    return <div className="h-64 w-full bg-slate-50 dark:bg-navy-800/40 rounded-md animate-pulse" />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={salesTrendData} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EDC705" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#EDC705" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: tickColor, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: tickColor, fontSize: 11, fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              v >= 100000 ? `${(v / 100000).toFixed(1)}L` : `${(v / 1000).toFixed(0)}K`
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#031833",
              border: "none",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
            }}
            labelStyle={{ color: "#EDC705", fontSize: 11, fontWeight: 600 }}
            itemStyle={{ color: "white", fontFamily: "JetBrains Mono", fontWeight: 600 }}
            formatter={(value) => [formatCompact(Number(value)), "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#EDC705"
            strokeWidth={2.5}
            fill="url(#salesGradient)"
            activeDot={{
              r: 5,
              fill: "#EDC705",
              stroke: "#031833",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
