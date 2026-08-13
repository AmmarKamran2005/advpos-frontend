/**
 * AdvPOS — Mock data (mobile accessories distribution)
 * --------------------------------------------------------------------------
 * The sample tenant is VIZO Pakistan: own-brand mobile accessories sold from
 * one premises split into three stock locations — Warehouse, Order Department
 * and Shop 2. Configuration (locations, roles, policies) lives in settings.ts.
 *
 * This will be replaced by real API calls when the backend is integrated.
 */

import type { RoleKey } from "./settings";

export type CurrentUser = {
  id: number;
  fullName: string;
  email: string;
  role: RoleKey;
  roleLabel: string;
  initials: string;
  avatarUrl: string | null;
  /** Location this user works out of. */
  locationId: number;
};

export type AppNotification = {
  id: number;
  type: "success" | "warning" | "danger" | "info";
  icon: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

export type QuickCreateItem = {
  label: string;
  icon: string;
  href: string;
  shortcut: string;
  /** Only offered to roles holding this capability. */
  perm: string;
};

/**
 * One demo account per role. The role switcher in the top bar swaps between
 * them so the whole app can be reviewed through each person's eyes.
 */
export const demoUsers: Record<RoleKey, CurrentUser> = {
  "super-admin": {
    id: 1,
    fullName: "Umer Memon",
    email: "admin@advpos.pk",
    role: "super-admin",
    roleLabel: "Super Admin",
    initials: "UM",
    avatarUrl: null,
    locationId: 1,
  },
  accountant: {
    id: 2,
    fullName: "Hassan Raza",
    email: "accounts@advpos.pk",
    role: "accountant",
    roleLabel: "Accountant",
    initials: "HR",
    avatarUrl: null,
    locationId: 1,
  },
  "order-dept": {
    id: 4,
    fullName: "Bilal Ahmed",
    email: "order@advpos.pk",
    role: "order-dept",
    roleLabel: "Order Department",
    initials: "BA",
    avatarUrl: null,
    locationId: 2,
  },
  sales: {
    id: 7,
    fullName: "Zara Malik",
    email: "sales@advpos.pk",
    role: "sales",
    roleLabel: "Sales",
    initials: "ZM",
    avatarUrl: null,
    locationId: 3,
  },
};

export const currentUser: CurrentUser = demoUsers["super-admin"];

/**
 * Sign-in details for the demo build. Every account uses the same password so
 * the client can hand one line to whoever is reviewing.
 *
 * These are placeholders for a prototype with no backend — there is nothing to
 * protect here. Real accounts arrive with the backend.
 */
export const DEMO_PASSWORD = "advpos1234";

export type DemoAccount = {
  role: RoleKey;
  name: string;
  email: string;
  password: string;
  /** One line on what this person does all day. */
  blurb: string;
  /** Where signing in as this person lands. */
  landing: string;
};

export const demoAccounts: DemoAccount[] = [
  {
    role: "sales",
    name: "Zara Malik",
    email: "sales@advpos.pk",
    password: DEMO_PASSWORD,
    blurb: "Takes customer orders and follows up on payments.",
    landing: "/dashboard",
  },
  {
    role: "order-dept",
    name: "Bilal Ahmed",
    email: "order@advpos.pk",
    password: DEMO_PASSWORD,
    blurb: "Checks stock, packs orders, moves goods and books deliveries.",
    landing: "/dashboard",
  },
  {
    role: "accountant",
    name: "Hassan Raza",
    email: "accounts@advpos.pk",
    password: DEMO_PASSWORD,
    blurb: "Records money in and out, keeps the ledgers and statements.",
    landing: "/dashboard",
  },
  {
    role: "super-admin",
    name: "Umer Memon",
    email: "admin@advpos.pk",
    password: DEMO_PASSWORD,
    blurb: "Sees everything, plus users, setup and backup.",
    landing: "/dashboard",
  },
];

export function findDemoAccount(email: string) {
  const needle = email.trim().toLowerCase();
  return demoAccounts.find((a) => a.email.toLowerCase() === needle);
}

export const notifications: AppNotification[] = [
  { id: 1, type: "warning", icon: "alert-triangle", title: "3 orders crossed their limit", body: "Waiting for your approval",                 time: "2 min ago",  unread: true  },
  { id: 2, type: "info",    icon: "package",        title: "Stock received GRN-26-0089",   body: "From China Mobile Plaza — 240 pcs",         time: "15 min ago", unread: true  },
  { id: 3, type: "success", icon: "banknote",       title: "Money received",               body: "PKR 1,45,000 from Hafeez Center #28",       time: "1 hour ago", unread: true  },
  { id: 4, type: "danger",  icon: "clock",          title: "7 invoices overdue",           body: "Recovery 60+ days needs attention",         time: "3 hours ago", unread: false },
  { id: 5, type: "info",    icon: "send",           title: "Delivery booked with TCS",     body: "INV-26-8861 — tracking 7841203355",         time: "5 hours ago", unread: false },
  { id: 6, type: "info",    icon: "database",       title: "Backup completed",             body: "Daily backup successful — 1.2 GB",          time: "Yesterday",  unread: false },
];

export const quickCreate: QuickCreateItem[] = [
  { label: "Customer Order",   icon: "shopping-cart", href: "/sales/orders/new",        shortcut: "O", perm: "orders.create" },
  { label: "Sale Invoice",     icon: "file-text",     href: "/sales/invoices/new",      shortcut: "I", perm: "invoices.create" },
  { label: "Order to Supplier",icon: "truck",         href: "/purchases/orders/new",    shortcut: "P", perm: "purchases.manage" },
  { label: "Stock Received",   icon: "package",       href: "/purchases/grns/new",      shortcut: "G", perm: "receipts.stock" },
  { label: "Money Received",   icon: "banknote",      href: "/accounting/vouchers/new", shortcut: "V", perm: "money.manage" },
  { label: "Customer",         icon: "user-plus",     href: "/parties/new",             shortcut: "C", perm: "customers.manage" },
  { label: "Item",             icon: "box",           href: "/inventory/products/new",  shortcut: "R", perm: "products.manage" },
];

/* ───────────────────────── Dashboard widgets data ───────────────────────── */

export const dashboardStats = {
  todaySales: { value: 842500, deltaPercent: 12.4, orders: 42 },
  collections: { value: 315000, deltaPercent: 5.2, cash: 120000, bank: 180000, wallet: 15000 },
  arOutstanding: { value: 18400000, deltaPercent: -2.1, overdue60Plus: 4250000 },
  apPayable: { value: 9620000, deltaPercent: 0, dueIn7Days: 840000 },
};

export const salesTrendData = [
  { date: "Apr 2",  revenue: 380000 },
  { date: "Apr 5",  revenue: 425000 },
  { date: "Apr 8",  revenue: 510000 },
  { date: "Apr 11", revenue: 470000 },
  { date: "Apr 14", revenue: 585000 },
  { date: "Apr 17", revenue: 620000 },
  { date: "Apr 20", revenue: 540000 },
  { date: "Apr 23", revenue: 695000 },
  { date: "Apr 26", revenue: 745000 },
  { date: "Apr 29", revenue: 820000 },
  { date: "May 1",  revenue: 842500 },
];

/** Sales split by the location the goods went out from. */
export const locationPerformance = [
  { location: "Order Department", revenue: 12400000, target: 16000000, color: "var(--color-brand-yellow)" },
  { location: "Shop 2",           revenue: 6850000,  target: 9500000,  color: "var(--color-info)" },
  { location: "Warehouse",       revenue: 2570000,  target: 4000000,  color: "var(--color-success)" },
];

/* ───────────── Top items ───────────── */
export const topProducts = [
  { rank: 1, name: "VIZO Titan T9 Wireless Earbuds",     sku: "VZ-TIT-T9-BLK",    units: 248, revenue: 242000, deltaPercent: 18 },
  { rank: 2, name: "VIZO VOLT 65W Type-C Charger",       sku: "VZ-VLT-65W-PD",    units: 412, revenue: 185000, deltaPercent: 9  },
  { rank: 3, name: "VIZO PowerX 20000mAh Power Bank",    sku: "VZ-PWX-20K-BLK",   units: 156, revenue: 132000, deltaPercent: -4 },
  { rank: 4, name: "VIZO VSP Bluetooth Speaker (Mini)",  sku: "VZ-VSP-MINI-RED",  units: 198, revenue: 98400,  deltaPercent: 22 },
  { rank: 5, name: "VIZO VR Type-C Data Cable 1.5m",     sku: "VZ-VR-TC-1.5M",    units: 184, revenue: 76500,  deltaPercent: 6  },
];

export const stockAlerts = [
  { kind: "danger",  title: "Out of stock", subtitle: "3 items sitting at zero across all locations",  cta: "View list",      icon: "alert-circle" },
  { kind: "warning", title: "Low stock",    subtitle: "9 items below their minimum quantity",          cta: "Review reorder", icon: "trending-down" },
  { kind: "info",    title: "Not selling",  subtitle: "PKR 18.2L tied up in 24 items (180+ days)",     cta: "Plan clearance", icon: "archive" },
];

export const cashPosition = {
  total: 4780000,
  breakdown: [
    { label: "Cash on Hand",   sublabel: "3 counters",           value: 840000,  color: "success", icon: "wallet"     },
    { label: "Bank Accounts",  sublabel: "HBL · Meezan · UBL",   value: 3720000, color: "info",    icon: "landmark"   },
    { label: "Mobile Wallets", sublabel: "Easypaisa · JazzCash", value: 220000,  color: "yellow",  icon: "smartphone" },
  ],
};

/* ───────────── Recent orders ───────────── */
export const recentOrders = [
  { orderNo: "ORD-26-0142", customer: "Hafeez Center #28",      type: "Wholesaler",  initials: "HC", location: "Order Department", amount: 145000, status: "Dispatched",  statusVariant: "success" },
  { orderNo: "ORD-26-0089", customer: "Mobile Zone Lahore",     type: "Retailer",    initials: "MZ", location: "Order Department", amount: 84500,  status: "Limit Cross", statusVariant: "warning" },
  { orderNo: "ORD-26-0141", customer: "Saddar Mobile Plaza",    type: "Retailer",    initials: "SM", location: "Shop 2",           amount: 32750,  status: "Confirmed",   statusVariant: "info"    },
  { orderNo: "ORD-26-0034", customer: "Blue Area Distributors", type: "Distributor", initials: "BA", location: "Warehouse",        amount: 218000, status: "Dispatched",  statusVariant: "success" },
  { orderNo: "ORD-26-0140", customer: "Cellular World KHI",     type: "Wholesaler",  initials: "CW", location: "Order Department", amount: 56200,  status: "Packing",     statusVariant: "muted"   },
  { orderNo: "ORD-26-0088", customer: "Faisal Mobile Mart",     type: "Retailer",    initials: "FM", location: "Shop 2",           amount: 18400,  status: "Delivered",   statusVariant: "success" },
];

/* ───────────── Activity feed ───────────── */
export type ActivityItem = {
  id: number;
  user: string;
  action: string;
  target?: string;
  detail: string;
  time: string;
  location?: string;
  iconKind: "success" | "warning" | "info" | "danger" | "accent";
  icon: string;
};

export const recentActivity: ActivityItem[] = [
  { id: 1, user: "Bilal Ahmed", action: "dispatched order",     target: "ORD-26-0142", detail: "Invoice INV-26-8867 generated automatically",              time: "2 min ago",   location: "Order Department", iconKind: "success", icon: "check" },
  { id: 2, user: "System",      action: "flagged",              target: "limit cross", detail: "Mobile Zone crossed its limit by PKR 12,400",              time: "15 min ago",  location: "Order Department", iconKind: "warning", icon: "alert-triangle" },
  { id: 3, user: "Bilal Ahmed", action: "received stock",       target: "GRN-26-0089", detail: "From China Mobile Plaza — 240 pcs — PKR 4,82,000",         time: "1 hour ago",  location: "Warehouse",        iconKind: "info",    icon: "package" },
  { id: 4, user: "Hassan Raza", action: "recorded money from",  target: "PKR 1,45,000",detail: "Hafeez Center #28 — Bank — allocated to 3 invoices",       time: "2 hours ago", location: "Order Department", iconKind: "success", icon: "banknote" },
  { id: 5, user: "Zara Malik",  action: "added new customer",   target: "Quetta Cellular", detail: "Retailer — limit PKR 50,000 — 15 days",                time: "3 hours ago", location: "Shop 2",           iconKind: "accent",  icon: "user-plus" },
];

/* ───────────── Daily briefing ───────────── */
export const dailyBriefing = {
  text: [
    { content: "Sales are " },
    { content: "up 12% week-over-week", highlight: true },
    { content: ", driven mainly by the " },
    { content: "Order Department", bold: true },
    { content: ". However, " },
    { content: "3 wholesalers", highlight: true },
    { content: " have crossed their credit limit — recommend collections action this week. Slow-selling stock value is at " },
    { content: "PKR 18.2L", highlight: true },
    { content: "; consider a clearance promotion." },
  ],
};
