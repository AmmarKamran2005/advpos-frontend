import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Truck,
  Package,
  Wallet,
  BarChart3,
  Send,
  PackageCheck,
  PackageX,
  Settings2,
} from "lucide-react";
import { canAny, type RoleKey } from "@/data/settings";

export type NavBadge = {
  text: string;
  variant: "success" | "warning" | "danger" | "info" | "accent" | "muted";
};

export type NavChild = {
  label: string;
  href: string;
  match: string;
  badge?: NavBadge;
  /** Hidden unless the signed-in role holds at least one of these. */
  perms?: string[];
};

export type NavNode =
  | { type: "section"; label: string; perms?: string[] }
  | {
      type: "item";
      label: string;
      icon: LucideIcon;
      href: string;
      match: string;
      badge?: NavBadge;
      perms?: string[];
    }
  | {
      type: "group";
      label: string;
      icon: LucideIcon;
      match: string;
      children: NavChild[];
    };

/**
 * Labels here are the words the staff actually use — no accounting jargon on
 * screens the sales and order teams live in. The accounting group keeps the
 * standard statement names, because the accountant works by those.
 */
export const navigation: NavNode[] = [
  {
    type: "item",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    match: "dashboard",
  },

  { type: "section", label: "Daily Work" },
  {
    type: "group",
    label: "Sales",
    icon: ShoppingCart,
    match: "sales",
    children: [
      { label: "Orders",          href: "/sales/orders",       match: "sales.orders",   perms: ["orders.view"] },
      { label: "Sale Invoices",   href: "/sales/invoices",     match: "sales.invoices", perms: ["invoices.view"] },
      { label: "Counter Sale",    href: "/sales/direct",       match: "sales.direct",   perms: ["sales.direct"] },
      { label: "Sales Returns",   href: "/sales/returns",      match: "sales.returns",  perms: ["returns.sales"] },
      { label: "Limit Alerts",    href: "/sales/credit-holds", match: "sales.credit-holds", perms: ["limits.manage"], badge: { text: "3", variant: "warning" } },
    ],
  },
  {
    type: "group",
    label: "Purchases",
    icon: Truck,
    match: "purchases",
    children: [
      { label: "Orders to Supplier", href: "/purchases/orders",   match: "purchases.orders",   perms: ["purchases.view"] },
      { label: "Stock Received",     href: "/purchases/grns",     match: "purchases.grns",     perms: ["receipts.stock", "purchases.view"], badge: { text: "2", variant: "info" } },
      { label: "Purchase Invoices",  href: "/purchases/invoices", match: "purchases.invoices", perms: ["purchases.view"] },
      { label: "Purchase Returns",   href: "/purchases/returns",  match: "purchases.returns",  perms: ["purchases.view"] },
    ],
  },
  {
    type: "item",
    label: "Packing",
    icon: PackageCheck,
    href: "/packing",
    match: "packing",
    perms: ["orders.approve"],
  },
  {
    type: "item",
    label: "Dispatch",
    icon: Send,
    href: "/dispatch",
    match: "dispatch",
    perms: ["delivery.manage"],
  },
  {
    type: "item",
    label: "Claims",
    icon: PackageX,
    href: "/claims",
    match: "claims",
    perms: ["claims.view"],
  },
  {
    type: "item",
    label: "Delivery",
    icon: Truck,
    href: "/delivery",
    match: "delivery",
    perms: ["delivery.view"],
  },

  { type: "section", label: "People" },
  {
    type: "group",
    label: "People",
    icon: Users,
    match: "parties",
    children: [
      { label: "Customers",       href: "/parties/customers", match: "parties.customers", perms: ["customers.view"] },
      { label: "Suppliers",       href: "/parties/suppliers", match: "parties.suppliers", perms: ["suppliers.manage", "purchases.view"] },
      { label: "Customer Visits", href: "/parties/visits",    match: "parties.visits",    perms: ["visits.view"] },
    ],
  },

  { type: "section", label: "Stock" },
  {
    type: "group",
    label: "Stock",
    icon: Package,
    match: "inventory",
    children: [
      { label: "Items",            href: "/inventory/products",     match: "inventory.products",     perms: ["stock.view"] },
      { label: "Categories",       href: "/inventory/categories",   match: "inventory.categories",   perms: ["products.manage"] },
      { label: "Brands",           href: "/inventory/brands",       match: "inventory.brands",       perms: ["products.manage"] },
      { label: "Stock in Hand",    href: "/inventory/stock-levels", match: "inventory.stock-levels", perms: ["stock.view"] },
      { label: "Transfers",        href: "/inventory/transfers",    match: "inventory.transfers",    perms: ["stock.transfer"] },
      { label: "Stock Correction", href: "/inventory/adjustments",  match: "inventory.adjustments",  perms: ["stock.correct"] },
      { label: "Stock History",    href: "/inventory/movements",    match: "inventory.movements",    perms: ["stock.view"] },
    ],
  },

  { type: "section", label: "Money", perms: ["money.view", "ledger.view"] },
  {
    type: "group",
    label: "Money",
    icon: Wallet,
    match: "accounting",
    children: [
      { label: "Money Received",   href: "/accounting/vouchers",        match: "accounting.vouchers", perms: ["money.view"] },
      { label: "Expenses",         href: "/accounting/expenses",        match: "accounting.expenses", perms: ["expenses.manage"] },
      { label: "Account List",     href: "/accounting/coa",             match: "accounting.coa",      perms: ["ledger.view"] },
      { label: "Ledgers",          href: "/accounting/ledgers",         match: "accounting.ledgers",  perms: ["ledger.view"] },
      { label: "Manual Entries",   href: "/accounting/journal-entries", match: "accounting.je",       perms: ["ledger.manage"] },
      { label: "Trial Balance",    href: "/accounting/trial-balance",   match: "accounting.tb",       perms: ["statements.view"] },
      { label: "Income Statement", href: "/accounting/profit-loss",     match: "accounting.pl",       perms: ["statements.view"] },
      { label: "Balance Sheet",    href: "/accounting/balance-sheet",   match: "accounting.bs",       perms: ["statements.view"] },
      { label: "Year End",         href: "/accounting/period-close",    match: "accounting.pc",       perms: ["statements.view"] },
    ],
  },

  { type: "section", label: "Insights", perms: ["reports.view"] },
  {
    type: "group",
    label: "Reports",
    icon: BarChart3,
    match: "reports",
    children: [
      { label: "All Reports",     href: "/reports",                match: "reports.lib",      perms: ["reports.full"] },
      { label: "Sales Summary",   href: "/reports/sales-summary",  match: "reports.sales",    perms: ["reports.view"] },
      { label: "Top Customers",   href: "/reports/top-customers",  match: "reports.top-cust", perms: ["reports.full"] },
      { label: "Recovery — Customers", href: "/reports/aging/customer", match: "reports.ar-aging", perms: ["reports.full"] },
      { label: "Recovery — Suppliers", href: "/reports/aging/supplier", match: "reports.ap-aging", perms: ["reports.full"] },
      { label: "Slow Selling",    href: "/reports/slow-moving",    match: "reports.slow",     perms: ["stock.view"] },
      { label: "Not Selling",     href: "/reports/dead-stock",     match: "reports.dead",     perms: ["stock.view"] },
    ],
  },

  { type: "section", label: "Setup", perms: ["setup.manage", "users.manage", "activity.view"] },
  {
    type: "group",
    label: "Setup",
    icon: Settings2,
    match: "admin",
    children: [
      { label: "Locations",        href: "/admin/locations",     match: "admin.locations",  perms: ["setup.manage"] },
      { label: "Account Types",    href: "/admin/account-types", match: "admin.acctypes",   perms: ["setup.manage"] },
      { label: "Numbering",        href: "/admin/numbering",     match: "admin.numbering",  perms: ["setup.manage"] },
      { label: "Couriers",         href: "/admin/couriers",      match: "admin.couriers",   perms: ["setup.manage"] },
      { label: "Users",            href: "/admin/users",         match: "admin.users",      perms: ["users.manage"] },
      { label: "Roles",            href: "/admin/roles",         match: "admin.roles",      perms: ["users.manage"] },
      { label: "Settings",         href: "/admin/settings",      match: "admin.settings",   perms: ["setup.manage"] },
      { label: "Backup & Restore", href: "/admin/backup",        match: "admin.backup",     perms: ["backup.manage"] },
      { label: "Activity History", href: "/admin/audit-log",     match: "admin.audit",      perms: ["activity.view"] },
    ],
  },
];

/** Check if a current "match" key matches a target. e.g. "sales.orders" matches "sales" */
export function isActiveMatch(current: string | undefined, target: string) {
  if (!current || !target) return false;
  return current === target || current.startsWith(target + ".");
}

/** Below this, a group is not worth an accordion — show the links directly. */
const FLATTEN_AT = 2;

/**
 * Trim the tree down to what this role may see.
 *
 * Groups left with only a link or two are flattened into plain links: a role
 * with three screens should not have to open three accordions to reach them.
 * Section headings with nothing under them are dropped.
 */
export function navigationForRole(role: RoleKey): NavNode[] {
  const visible: NavNode[] = [];

  for (const node of navigation) {
    if (node.type === "item") {
      if (canAny(role, node.perms ?? [])) visible.push(node);
      continue;
    }

    if (node.type === "group") {
      const children = node.children.filter((c) => canAny(role, c.perms ?? []));
      if (children.length === 0) continue;

      if (children.length <= FLATTEN_AT) {
        for (const child of children) {
          visible.push({
            type: "item",
            label: child.label,
            icon: node.icon,
            href: child.href,
            match: child.match,
            badge: child.badge,
          });
        }
      } else {
        visible.push({ ...node, children });
      }
      continue;
    }

    visible.push(node);
  }

  // Drop section headings with nothing under them.
  return visible.filter((node, i) => {
    if (node.type !== "section") return true;
    const next = visible[i + 1];
    return next !== undefined && next.type !== "section";
  });
}
