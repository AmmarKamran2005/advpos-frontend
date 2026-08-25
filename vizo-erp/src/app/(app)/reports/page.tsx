"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  TrendingUp, ShoppingCart, Truck, Package, Users, CreditCard, AlertTriangle,
  Archive, BarChart3, FileText, Receipt, Search, Star, AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /reports -> headline numbers for this landing page, so it shows something
   real rather than being a menu of links. */
type ReportsIndex = {
  monthRevenue: number;
  monthInvoices: number;
  receivable: number;
  stockValue: number;
  stockUnits: number;
  activeCustomers: number;
  activeProducts: number;
  openClaims: number;
  deliveriesInFlight: number;
};

const EMPTY: ReportsIndex = {
  monthRevenue: 0, monthInvoices: 0, receivable: 0, stockValue: 0, stockUnits: 0,
  activeCustomers: 0, activeProducts: 0, openClaims: 0, deliveriesInFlight: 0,
};

/* `href: null` means there is no report behind it yet.
   Six of these used to point at /reports/sales-summary, so clicking
   "Purchase Summary" or "Supplier Ledger" quietly showed the sales report
   instead. A card that says "not built" is honest; one that shows the wrong
   numbers is not. */
type Entry = {
  category: string;
  name: string;
  href: string | null;
  icon: typeof TrendingUp;
  description: string;
  featured?: boolean;
};

const REPORTS: Entry[] = [
  { category: "Sales", name: "Sales Summary", href: "/reports/sales-summary", icon: TrendingUp, description: "Revenue, invoices, margin, daily trend" },
  { category: "Sales", name: "Top Customers", href: "/reports/top-customers", icon: Star, description: "Best customers by revenue and margin", featured: true },
  { category: "Sales", name: "Sales by Salesperson", href: null, icon: Users, description: "Performance per sales rep" },
  { category: "Sales", name: "Sales by Product", href: null, icon: ShoppingCart, description: "Top selling products" },

  { category: "Purchases", name: "Supplier Payables", href: "/purchases/invoices", icon: Truck, description: "Open purchase invoices and what is due" },
  { category: "Purchases", name: "Purchase Summary", href: null, icon: Truck, description: "Purchases by supplier and period" },

  { category: "Inventory", name: "Inventory Valuation", href: "/inventory/stock-levels", icon: Package, description: "Current stock value per location" },
  { category: "Inventory", name: "Slow Moving", href: "/reports/slow-moving", icon: AlertTriangle, description: "Months of cover on the shelf", featured: true },
  { category: "Inventory", name: "Dead Stock", href: "/reports/dead-stock", icon: Archive, description: "Nothing sold in the window", featured: true },
  { category: "Inventory", name: "Stock Movements Log", href: "/inventory/movements", icon: FileText, description: "Every in and out, with running balance" },

  { category: "Financial", name: "Trial Balance", href: "/accounting/trial-balance", icon: BarChart3, description: "Sum of debits and credits" },
  { category: "Financial", name: "Profit & Loss", href: "/accounting/profit-loss", icon: TrendingUp, description: "Revenue minus expenses" },
  { category: "Financial", name: "Balance Sheet", href: "/accounting/balance-sheet", icon: BarChart3, description: "Financial position snapshot" },
  { category: "Financial", name: "Cash Flow", href: "/accounting/cash-flow", icon: Receipt, description: "Cash in and out per account" },

  { category: "Receivable", name: "AR Aging", href: "/reports/aging/customer", icon: CreditCard, description: "Outstanding by age bucket", featured: true },
  { category: "Receivable", name: "Customer Statement", href: "/parties/customers", icon: FileText, description: "Pick a customer to open their ledger" },

  { category: "Payable", name: "AP Aging", href: "/reports/aging/supplier", icon: CreditCard, description: "Supplier payables by age bucket" },
  { category: "Payable", name: "Supplier Ledger", href: null, icon: FileText, description: "Per-supplier transaction history" },
];

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function ReportsPage() {
  const [search, setSearch] = React.useState("");
  const [stats, setStats] = React.useState<ReportsIndex>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<ReportsIndex>(`${API_BASE_URL}/reports`, { headers: authHeader() });
      setStats(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the headline figures."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const filtered = REPORTS.filter((r) =>
    !search ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );
  const categories = Array.from(new Set(filtered.map((r) => r.category)));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports" }]}
        title="Reports"
        subtitle="Everything the business is doing, counted from the ledger"
      />

      {error && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Revenue this month" loading={loading} value={formatCompact(stats.monthRevenue)} sub={`${stats.monthInvoices} invoices`} />
        <Stat label="Receivable" loading={loading} value={formatCompact(stats.receivable)} tone="text-warning" />
        <Stat label="Stock value" loading={loading} value={formatCompact(stats.stockValue)} sub={`${stats.stockUnits.toLocaleString()} units`} />
        <Stat label="Open claims" loading={loading} value={String(stats.openClaims)} sub={`${stats.deliveriesInFlight} deliveries out`} tone="text-info" />
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search reports…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 max-w-md"
            />
          </div>
        </CardBody>
      </Card>

      {categories.map((cat) => (
        <div key={cat} className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            {cat}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.filter((r) => r.category === cat).map((r) => {
              const Icon = r.icon;
              const body = (
                <div
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border transition-colors h-full",
                    r.href
                      ? "bg-white dark:bg-navy-800 border-slate-200 dark:border-navy-700 hover:border-brand-yellow/50"
                      : "bg-slate-50 dark:bg-navy-800/40 border-dashed border-slate-200 dark:border-navy-700"
                  )}
                >
                  <div className={cn(
                    "size-9 rounded-lg grid place-items-center shrink-0",
                    r.href ? "bg-brand-yellow/10 text-brand-yellow-700 dark:text-brand-yellow" : "bg-slate-200/60 dark:bg-navy-700 text-slate-400"
                  )}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-medium",
                        r.href ? "text-navy-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                      )}>
                        {r.name}
                      </span>
                      {r.featured && r.href && <Badge variant="accent">Popular</Badge>}
                      {!r.href && <Badge variant="muted">Not built</Badge>}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.description}</div>
                  </div>
                </div>
              );

              return r.href ? (
                <Link key={r.name} href={r.href} className="block">{body}</Link>
              ) : (
                <div key={r.name} title="No report behind this yet">{body}</div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function Stat({
  label, value, sub, loading, tone,
}: { label: string; value: string; sub?: string; loading: boolean; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      {loading ? (
        <Skeleton className="h-8 w-24 mt-1" />
      ) : (
        <>
          <div className={`text-2xl tabular font-bold mt-1 ${tone ?? "text-navy-900 dark:text-white"}`}>{value}</div>
          {sub && <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>}
        </>
      )}
    </Card>
  );
}
