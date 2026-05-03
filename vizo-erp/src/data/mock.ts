/**
 * VIZO ERP — Mock Data (mobile accessories distribution)
 * --------------------------------------------------------------------------
 * VIZO distributes its own brand of mobile accessories: Titan, PowerX, VSP,
 * VR series, VOLT — earbuds, chargers, cables, power banks, speakers, etc.
 * HQ: Kohinoor Market, Saddar, Karachi.
 *
 * This will be replaced by real API calls when backend is integrated.
 */

export type Branch = {
  id: number;
  code: string;
  name: string;
  city: string;
};

export type CurrentUser = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  initials: string;
  avatarUrl: string | null;
  branchId: number;
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
};

export const currentUser: CurrentUser = {
  id: 1,
  fullName: "Umer Memon",
  email: "umer@vizo.com.pk",
  role: "SuperAdmin",
  initials: "UM",
  avatarUrl: null,
  branchId: 1,
};

export const branches: Branch[] = [
  { id: 1, code: "KHI", name: "Karachi Head Office", city: "Karachi · Saddar" },
  { id: 2, code: "LHR", name: "Lahore Branch",       city: "Lahore · Hafeez Center" },
  { id: 3, code: "ISB", name: "Islamabad Branch",    city: "Islamabad · Blue Area" },
];

export const notifications: AppNotification[] = [
  { id: 1, type: "warning", icon: "alert-triangle", title: "3 orders on credit hold",   body: "Pending your override decision",    time: "2 min ago",  unread: true  },
  { id: 2, type: "info",    icon: "package",        title: "GRN-KHI-26-0089 received",  body: "From China Mobile Plaza, 240 units", time: "15 min ago", unread: true  },
  { id: 3, type: "success", icon: "banknote",       title: "Payment received",          body: "PKR 1,45,000 from Hafeez Center #28", time: "1 hour ago", unread: true  },
  { id: 4, type: "danger",  icon: "clock",          title: "7 invoices overdue",        body: "AR aging 60+ days needs attention", time: "3 hours ago", unread: false },
  { id: 5, type: "info",    icon: "database",       title: "Backup completed",          body: "Daily backup successful — 1.2 GB",  time: "Yesterday",  unread: false },
];

export const quickCreate: QuickCreateItem[] = [
  { label: "New Order",          icon: "shopping-cart", href: "/sales/orders/new",        shortcut: "O" },
  { label: "New Invoice",        icon: "file-text",     href: "/sales/invoices/new",      shortcut: "I" },
  { label: "New Purchase Order", icon: "truck",         href: "/purchases/orders/new",    shortcut: "P" },
  { label: "New GRN",            icon: "package",       href: "/purchases/grns/new",      shortcut: "G" },
  { label: "New Voucher",        icon: "banknote",      href: "/accounting/vouchers/new", shortcut: "V" },
  { label: "New Party",          icon: "user-plus",     href: "/parties/new",             shortcut: "C" },
  { label: "New Product",        icon: "box",           href: "/inventory/products/new",  shortcut: "R" },
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

export const branchPerformance = [
  { branch: "Karachi",   revenue: 12400000, target: 16000000, color: "var(--color-brand-yellow)" },
  { branch: "Lahore",    revenue: 6850000,  target: 12500000, color: "var(--color-info)" },
  { branch: "Islamabad", revenue: 2570000,  target: 6000000,  color: "var(--color-success)" },
];

/* ───────────── Top Products (VIZO mobile accessories) ─────────────
   Real VIZO product lines: Titan · PowerX · VSP · VR · VOLT
*/
export const topProducts = [
  { rank: 1, name: "VIZO Titan T9 Wireless Earbuds",     sku: "VZ-TIT-T9-BLK",    units: 248, revenue: 242000, deltaPercent: 18 },
  { rank: 2, name: "VIZO VOLT 65W Type-C Charger",       sku: "VZ-VLT-65W-PD",    units: 412, revenue: 185000, deltaPercent: 9  },
  { rank: 3, name: "VIZO PowerX 20000mAh Power Bank",    sku: "VZ-PWX-20K-BLK",   units: 156, revenue: 132000, deltaPercent: -4 },
  { rank: 4, name: "VIZO VSP Bluetooth Speaker (Mini)",  sku: "VZ-VSP-MINI-RED",  units: 198, revenue: 98400,  deltaPercent: 22 },
  { rank: 5, name: "VIZO VR Type-C Data Cable 1.5m",     sku: "VZ-VR-TC-1.5M",    units: 184, revenue: 76500,  deltaPercent: 6  },
];

export const stockAlerts = [
  { kind: "danger",  title: "Out of stock", subtitle: "3 SKUs in Lahore warehouse have zero stock",   cta: "View list",      icon: "alert-circle" },
  { kind: "warning", title: "Low stock",    subtitle: "9 SKUs below reorder level across branches",   cta: "Review reorder", icon: "trending-down" },
  { kind: "info",    title: "Dead stock",   subtitle: "PKR 18.2L tied up in 24 SKUs (180+ days)",     cta: "Plan clearance", icon: "archive" },
];

export const cashPosition = {
  total: 4780000,
  breakdown: [
    { label: "Cash on Hand",   sublabel: "3 cashiers",                value: 840000,  color: "success", icon: "wallet"     },
    { label: "Bank Accounts",  sublabel: "HBL · Meezan · UBL",        value: 3720000, color: "info",    icon: "landmark"   },
    { label: "Mobile Wallets", sublabel: "Easypaisa · JazzCash",      value: 220000,  color: "yellow",  icon: "smartphone" },
  ],
};

/* ───────────── Recent Orders (real customer types: mobile shops) ───────────── */
export const recentOrders = [
  { orderNo: "ORD-KHI-26-0142", customer: "Hafeez Center #28",     type: "Wholesaler",  initials: "HC", branch: "Karachi",   amount: 145000, status: "Dispatched",  statusVariant: "success" },
  { orderNo: "ORD-LHR-26-0089", customer: "Mobile Zone Lahore",    type: "Retailer",    initials: "MZ", branch: "Lahore",    amount: 84500,  status: "Credit Hold", statusVariant: "warning" },
  { orderNo: "ORD-KHI-26-0141", customer: "Saddar Mobile Plaza",   type: "Retailer",    initials: "SM", branch: "Karachi",   amount: 32750,  status: "Confirmed",   statusVariant: "info"    },
  { orderNo: "ORD-ISB-26-0034", customer: "Blue Area Distributors",type: "Distributor", initials: "BA", branch: "Islamabad", amount: 218000, status: "Dispatched",  statusVariant: "success" },
  { orderNo: "ORD-KHI-26-0140", customer: "Cellular World KHI",    type: "Wholesaler",  initials: "CW", branch: "Karachi",   amount: 56200,  status: "Packing",     statusVariant: "muted"   },
  { orderNo: "ORD-LHR-26-0088", customer: "Faisal Mobile Mart",    type: "Retailer",    initials: "FM", branch: "Lahore",    amount: 18400,  status: "Delivered",   statusVariant: "success" },
];

/* ───────────── Activity feed ───────────── */
export type ActivityItem = {
  id: number;
  user: string;
  action: string;
  target?: string;
  detail: string;
  time: string;
  branch?: string;
  iconKind: "success" | "warning" | "info" | "danger" | "accent";
  icon: string;
};

export const recentActivity: ActivityItem[] = [
  { id: 1, user: "Sara Khan",    action: "dispatched order",        target: "ORD-KHI-26-0142", detail: "Invoice INV-KHI-26-0142 generated automatically",    time: "2 min ago",   branch: "Karachi", iconKind: "success", icon: "check" },
  { id: 2, user: "System",       action: "placed order on",         target: "credit hold",     detail: "Mobile Zone Lahore exceeded credit limit by PKR 12,400", time: "15 min ago", branch: "Lahore",  iconKind: "warning", icon: "alert-triangle" },
  { id: 3, user: "Bilal Ahmed",  action: "received GRN",            target: "GRN-KHI-26-0089", detail: "From China Mobile Plaza · 240 units · PKR 4,82,000", time: "1 hour ago",  branch: "Karachi", iconKind: "info",    icon: "package" },
  { id: 4, user: "Hassan Raza",  action: "recorded payment of",     target: "PKR 1,45,000",    detail: "Hafeez Center #28 · Bank transfer · Allocated to 3 invoices", time: "2 hours ago", branch: "Karachi", iconKind: "success", icon: "banknote" },
  { id: 5, user: "You",          action: "added new customer",      target: "Quetta Cellular",  detail: "Retailer · Credit limit PKR 50,000 · NET 15",        time: "3 hours ago",                       iconKind: "accent",  icon: "user-plus" },
];

/* ───────────── AI Insight (daily briefing) ───────────── */
export const aiInsight = {
  text: [
    { content: "Sales are " },
    { content: "up 12% week-over-week", highlight: true },
    { content: ", driven mainly by " },
    { content: "Karachi branch", bold: true },
    { content: ". However, " },
    { content: "3 wholesalers in Lahore", highlight: true },
    { content: " have crossed their credit limit — recommend collections action this week. Slow-moving stock value is at " },
    { content: "PKR 18.2L", highlight: true },
    { content: "; consider a clearance promotion." },
  ],
};
