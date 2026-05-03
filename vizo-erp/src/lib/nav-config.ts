import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Truck,
  Package,
  BookOpen,
  Moon,
  BarChart3,
  Sparkles,
  MessageSquare,
  Shield,
} from "lucide-react";

export type NavBadge = {
  text: string;
  variant: "success" | "warning" | "danger" | "info" | "accent" | "muted";
};

export type NavChild = {
  label: string;
  href: string;
  match: string;
  badge?: NavBadge;
};

export type NavNode =
  | { type: "section"; label: string }
  | {
      type: "item";
      label: string;
      icon: LucideIcon;
      href: string;
      match: string;
      badge?: NavBadge;
    }
  | {
      type: "group";
      label: string;
      icon: LucideIcon;
      match: string;
      children: NavChild[];
    };

export const navigation: NavNode[] = [
  {
    type: "item",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    match: "dashboard",
  },

  { type: "section", label: "Sales & Customers" },
  {
    type: "group",
    label: "Sales",
    icon: ShoppingCart,
    match: "sales",
    children: [
      { label: "Orders",        href: "/sales/orders",       match: "sales.orders" },
      { label: "Invoices",      href: "/sales/invoices",     match: "sales.invoices" },
      { label: "Sales Returns", href: "/sales/returns",      match: "sales.returns" },
      { label: "Credit Holds",  href: "/sales/credit-holds", match: "sales.credit-holds", badge: { text: "3", variant: "warning" } },
    ],
  },
  {
    type: "group",
    label: "Parties",
    icon: Users,
    match: "parties",
    children: [
      { label: "All Parties",     href: "/parties",           match: "parties.all" },
      { label: "Customers",       href: "/parties/customers", match: "parties.customers" },
      { label: "Suppliers",       href: "/parties/suppliers", match: "parties.suppliers" },
      { label: "Customer Visits", href: "/parties/visits",    match: "parties.visits" },
    ],
  },

  { type: "section", label: "Purchases" },
  {
    type: "group",
    label: "Purchases",
    icon: Truck,
    match: "purchases",
    children: [
      { label: "Purchase Orders",   href: "/purchases/orders",   match: "purchases.orders" },
      { label: "Goods Receipts",    href: "/purchases/grns",     match: "purchases.grns", badge: { text: "2", variant: "info" } },
      { label: "Purchase Invoices", href: "/purchases/invoices", match: "purchases.invoices" },
      { label: "Purchase Returns",  href: "/purchases/returns",  match: "purchases.returns" },
    ],
  },

  { type: "section", label: "Inventory" },
  {
    type: "group",
    label: "Inventory",
    icon: Package,
    match: "inventory",
    children: [
      { label: "Products",         href: "/inventory/products",     match: "inventory.products" },
      { label: "Categories",       href: "/inventory/categories",   match: "inventory.categories" },
      { label: "Brands",           href: "/inventory/brands",       match: "inventory.brands" },
      { label: "Units of Measure", href: "/inventory/uom",          match: "inventory.uom" },
      { label: "Stock Levels",     href: "/inventory/stock-levels", match: "inventory.stock-levels" },
      { label: "Stock Movements",  href: "/inventory/movements",    match: "inventory.movements" },
      { label: "Stock Adjustments",href: "/inventory/adjustments",  match: "inventory.adjustments" },
      { label: "Stock Transfers",  href: "/inventory/transfers",    match: "inventory.transfers" },
      { label: "Warehouses",       href: "/inventory/warehouses",   match: "inventory.warehouses" },
    ],
  },

  { type: "section", label: "Accounting" },
  {
    type: "group",
    label: "Accounting",
    icon: BookOpen,
    match: "accounting",
    children: [
      { label: "Chart of Accounts", href: "/accounting/coa",             match: "accounting.coa" },
      { label: "Journal Entries",   href: "/accounting/journal-entries", match: "accounting.je" },
      { label: "Vouchers",          href: "/accounting/vouchers",        match: "accounting.vouchers" },
      { label: "Expenses",          href: "/accounting/expenses",        match: "accounting.expenses" },
      { label: "General Ledger",    href: "/accounting/ledger",          match: "accounting.ledger" },
      { label: "Trial Balance",     href: "/accounting/trial-balance",   match: "accounting.tb" },
      { label: "Profit & Loss",     href: "/accounting/profit-loss",     match: "accounting.pl" },
      { label: "Balance Sheet",     href: "/accounting/balance-sheet",   match: "accounting.bs" },
      { label: "Cash Flow",         href: "/accounting/cash-flow",       match: "accounting.cf" },
      { label: "Period Close",      href: "/accounting/period-close",    match: "accounting.pc" },
    ],
  },
  {
    type: "group",
    label: "Zakat",
    icon: Moon,
    match: "zakat",
    children: [
      { label: "Periods",      href: "/zakat/periods",      match: "zakat.periods" },
      { label: "Calculations", href: "/zakat/calculations", match: "zakat.calc" },
    ],
  },

  { type: "section", label: "Insights" },
  {
    type: "group",
    label: "Reports",
    icon: BarChart3,
    match: "reports",
    children: [
      { label: "Report Library",    href: "/reports",                  match: "reports.lib" },
      { label: "Sales Reports",     href: "/reports/sales-summary",    match: "reports.sales" },
      { label: "Purchase Reports",  href: "/reports/purchase-summary", match: "reports.purch" },
      { label: "Inventory Reports", href: "/reports/inventory",        match: "reports.inv" },
      { label: "AR Aging",          href: "/reports/aging/customer",   match: "reports.ar-aging" },
      { label: "AP Aging",          href: "/reports/aging/supplier",   match: "reports.ap-aging" },
      { label: "Top Customers",     href: "/reports/top-customers",    match: "reports.top-cust" },
      { label: "Slow Moving",       href: "/reports/slow-moving",      match: "reports.slow" },
      { label: "Dead Stock",        href: "/reports/dead-stock",       match: "reports.dead" },
      { label: "Sales Trends",      href: "/reports/sales-trends",     match: "reports.trends" },
    ],
  },
  {
    type: "item",
    label: "AI Assistant",
    icon: Sparkles,
    href: "/ai-assistant",
    match: "ai",
    badge: { text: "NEW", variant: "accent" },
  },

  { type: "section", label: "Communication" },
  {
    type: "group",
    label: "SMS / Notifications",
    icon: MessageSquare,
    match: "sms",
    children: [
      { label: "SMS History", href: "/notifications/sms",       match: "sms.history" },
      { label: "Templates",   href: "/notifications/templates", match: "sms.templates" },
      { label: "Gateways",    href: "/notifications/gateways",  match: "sms.gateways" },
    ],
  },

  { type: "section", label: "Administration" },
  {
    type: "group",
    label: "Administration",
    icon: Shield,
    match: "admin",
    children: [
      { label: "Users",               href: "/admin/users",     match: "admin.users" },
      { label: "Roles & Permissions", href: "/admin/roles",     match: "admin.roles" },
      { label: "Branches",            href: "/admin/branches",  match: "admin.branches" },
      { label: "Audit Log",           href: "/admin/audit-log", match: "admin.audit" },
      { label: "Backup & Restore",    href: "/admin/backup",    match: "admin.backup" },
      { label: "System Settings",     href: "/admin/settings",  match: "admin.settings" },
      { label: "LLM Usage & Cost",    href: "/admin/llm-usage", match: "admin.llm" },
    ],
  },
];

/** Check if a current "match" key matches a target. e.g. "sales.orders" matches "sales" */
export function isActiveMatch(current: string | undefined, target: string) {
  if (!current || !target) return false;
  return current === target || current.startsWith(target + ".");
}
