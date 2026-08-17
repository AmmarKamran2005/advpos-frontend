"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp, ShoppingCart, Truck, Package, Users, CreditCard, AlertTriangle,
  Archive, BarChart3, FileText, Receipt, Search, Star,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const REPORTS = [
  { category: "Sales",     name: "Sales Summary",        href: "/reports/sales-summary",    icon: TrendingUp,   description: "Revenue, orders, average order value" },
  { category: "Sales",     name: "Sales by Salesperson", href: "/reports/sales-summary",    icon: Users,        description: "Performance per sales rep" },
  { category: "Sales",     name: "Sales by Product",     href: "/reports/sales-summary",    icon: ShoppingCart, description: "Top selling products" },
  { category: "Sales",     name: "Top Customers",        href: "/reports/top-customers",    icon: Star,         description: "Best customers by revenue", featured: true },

  { category: "Purchases", name: "Purchase Summary",     href: "/reports/sales-summary",    icon: Truck,        description: "Purchases by supplier and period" },
  { category: "Purchases", name: "Purchase by Supplier", href: "/reports/sales-summary",    icon: Users,        description: "Supplier performance" },

  { category: "Inventory", name: "Inventory Valuation",  href: "/reports/sales-summary",    icon: Package,      description: "Current stock value per location" },
  { category: "Inventory", name: "Slow Moving",           href: "/reports/slow-moving",      icon: AlertTriangle,description: "SKUs with low movement", featured: true },
  { category: "Inventory", name: "Dead Stock",            href: "/reports/dead-stock",       icon: Archive,      description: "No movement in 180+ days", featured: true },
  { category: "Inventory", name: "Stock Movements Log",   href: "/inventory/movements",      icon: FileText,     description: "Detailed inventory ledger" },

  { category: "Financial", name: "Trial Balance",         href: "/accounting/trial-balance", icon: BarChart3,    description: "Sum of debits and credits" },
  { category: "Financial", name: "Profit & Loss",         href: "/accounting/profit-loss",   icon: TrendingUp,   description: "Revenue minus expenses" },
  { category: "Financial", name: "Balance Sheet",         href: "/accounting/balance-sheet", icon: BarChart3,    description: "Financial position snapshot" },
  { category: "Financial", name: "Cash Flow",             href: "/accounting/cash-flow",     icon: Receipt,      description: "Cash inflows and outflows" },

  { category: "Receivable",name: "AR Aging",              href: "/reports/aging/customer",   icon: CreditCard,   description: "Outstanding by age bucket", featured: true },
  { category: "Receivable",name: "Customer Statement",    href: "/reports/sales-summary",    icon: FileText,     description: "Per-customer ledger" },

  { category: "Payable",   name: "AP Aging",              href: "/reports/aging/supplier",   icon: CreditCard,   description: "Supplier payables aging" },
  { category: "Payable",   name: "Supplier Ledger",       href: "/reports/sales-summary",    icon: FileText,     description: "Per-supplier transaction history" },
];

export default function ReportsPage() {
  const [search, setSearch] = React.useState("");
  const filtered = REPORTS.filter((r) =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase())
  );
  const categories = Array.from(new Set(filtered.map((r) => r.category)));
  const featured = REPORTS.filter((r) => r.featured);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports" }]}
        title="Report Library"
        subtitle={`${REPORTS.length} reports available · search or browse by category`}
      />

      <div className="relative mb-6 max-w-md">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Search reports…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {!search && (
        <>
          <h3 className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-3">⭐ Featured Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
            {featured.map((r) => (
              <ReportCard key={r.name} report={r} />
            ))}
          </div>
        </>
      )}

      {categories.map((cat) => (
        <div key={cat} className="mb-6">
          <h3 className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-3">{cat}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.filter((r) => r.category === cat).map((r) => (
              <ReportCard key={r.name} report={r} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function ReportCard({ report }: { report: typeof REPORTS[number] }) {
  const Icon = report.icon;
  return (
    <Link href={report.href}>
      <Card className="cursor-pointer hover:border-brand-yellow/40 transition-colors group h-full">
        <CardBody>
          <div className="flex items-start justify-between mb-3">
            <div className="size-10 rounded-lg bg-brand-yellow/10 flex items-center justify-center text-brand-yellow group-hover:bg-brand-yellow group-hover:text-navy-900 transition-colors">
              <Icon className="size-4" />
            </div>
            {report.featured && <Badge variant="accent">Featured</Badge>}
          </div>
          <h4 className="text-sm font-semibold text-navy-900 dark:text-white">{report.name}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{report.description}</p>
        </CardBody>
      </Card>
    </Link>
  );
}
