/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AdvPOS — Configuration store
 * ─────────────────────────────────────────────────────────────────────────────
 * Everything the business might want to change later lives HERE, not scattered
 * as literals across pages. Locations, account types, code prefixes, document
 * series, roles, couriers, policies — all of it is data, and all of it is
 * editable from the Setup section.
 *
 * Rule for this codebase: if you are about to type a business-specific list
 * inside a component, put it in this file instead.
 *
 * When the backend lands, this file becomes a `/api/settings` response.
 */

/* ═══════════════════════════ Company ═══════════════════════════ */

export type CompanyProfile = {
  name: string;
  legalName: string;
  addressLine: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  ntn: string;
  strn: string;
  /** Month the financial year starts. 10 = October (client runs Oct–Sep). */
  fiscalYearStartMonth: number;
  currencyCode: string;
  currencySymbol: string;
  /** Rate used to convert foreign-currency documents. 1.00 = disabled. */
  foreignRate: number;
};

export const company: CompanyProfile = {
  name: "VIZO Pakistan",
  legalName: "VIZO Trading Company",
  addressLine: "Kohinoor Market, Saddar",
  city: "Karachi",
  country: "Pakistan",
  phone: "021 3241 2345",
  email: "info@vizo.com.pk",
  ntn: "4270118-9",
  strn: "17-00-8823-115-46",
  fiscalYearStartMonth: 10,
  currencyCode: "PKR",
  currencySymbol: "PKR",
  foreignRate: 1.0,
};

/** Fiscal year label for the currently open period. */
export const currentPeriod = {
  from: "2025-10-01",
  to: "2026-09-30",
  label: "FY 2025–26",
  isClosed: false,
};

/* ═══════════════════════════ Locations ═══════════════════════════ */
/**
 * Replaces the old branch + warehouse split. One flat list. The business runs
 * a single branch, so a "location" is simply a place stock can sit.
 * Add / rename / deactivate from Setup → Locations.
 */

export type LocationKind = "warehouse" | "shop" | "department" | "claim";

export type StockLocation = {
  id: number;
  code: string;
  name: string;
  kind: LocationKind;
  inCharge: string;
  address: string;
  isActive: boolean;
  /** Pre-selected on new documents. Exactly one location should carry this. */
  isDefault: boolean;
  /** Stock here is NOT counted as sellable (e.g. claim / damaged goods). */
  excludeFromSellable: boolean;
};

export const locations: StockLocation[] = [
  {
    id: 1,
    code: "LOC-01",
    name: "Warehouse",
    kind: "warehouse",
    inCharge: "Bilal Ahmed",
    address: "Kohinoor Market, Saddar, Karachi",
    isActive: true,
    isDefault: false,
    excludeFromSellable: false,
  },
  {
    id: 2,
    code: "LOC-02",
    name: "Order Department",
    kind: "department",
    inCharge: "Junaid Akhtar",
    address: "Kohinoor Market, Saddar, Karachi",
    isActive: true,
    isDefault: true,
    excludeFromSellable: false,
  },
  {
    id: 3,
    code: "LOC-03",
    name: "Shop 2",
    kind: "shop",
    inCharge: "Zara Malik",
    address: "Saddar Mobile Plaza, Karachi",
    isActive: true,
    isDefault: false,
    excludeFromSellable: false,
  },
];

export const locationKindLabels: Record<LocationKind, string> = {
  warehouse: "Warehouse",
  shop: "Shop",
  department: "Department",
  claim: "Claim / Damaged",
};

export function getLocation(id: number) {
  return locations.find((l) => l.id === id);
}

export function getLocationByCode(code: string) {
  return locations.find((l) => l.code === code);
}

export const activeLocations = () => locations.filter((l) => l.isActive);

export const defaultLocation = () =>
  locations.find((l) => l.isDefault && l.isActive) ?? locations[0];

/* ═══════════════════════════ Account types ═══════════════════════════ */
/**
 * Mirrors the account taxonomy the business already uses. Each type owns a
 * code prefix, so a new receivable becomes ACR01512 automatically.
 *
 * Prefixes confirmed from live data: ACR (receivables), E (expenses),
 * R (revenue). The rest follow the same shape and are editable in Setup.
 */

export type AccountGroup = "Assets" | "Capital" | "Expenses" | "Liabilities" | "Revenue";

export type AccountType = {
  id: number;
  name: string;
  group: AccountGroup;
  prefix: string;
  codeLength: number;
  normalBalance: "debit" | "credit";
  /** Shows on Balance Sheet (true) or Income Statement (false). */
  onBalanceSheet: boolean;
  /** Built-in types the posting engine depends on — renameable, not deletable. */
  isSystem: boolean;
};

export const accountTypes: AccountType[] = [
  { id: 1,  name: "Assets",              group: "Assets",      prefix: "A",   codeLength: 7, normalBalance: "debit",  onBalanceSheet: true,  isSystem: true },
  { id: 2,  name: "Current Assets",      group: "Assets",      prefix: "CA",  codeLength: 7, normalBalance: "debit",  onBalanceSheet: true,  isSystem: true },
  { id: 3,  name: "Cash & Bank",         group: "Assets",      prefix: "CB",  codeLength: 7, normalBalance: "debit",  onBalanceSheet: true,  isSystem: true },
  { id: 4,  name: "Inventory",           group: "Assets",      prefix: "INV", codeLength: 7, normalBalance: "debit",  onBalanceSheet: true,  isSystem: true },
  { id: 5,  name: "Acc Receivables",     group: "Assets",      prefix: "ACR", codeLength: 5, normalBalance: "debit",  onBalanceSheet: true,  isSystem: true },
  { id: 6,  name: "Fixed Assets",        group: "Assets",      prefix: "FA",  codeLength: 7, normalBalance: "debit",  onBalanceSheet: true,  isSystem: true },
  { id: 7,  name: "Capital",             group: "Capital",     prefix: "C",   codeLength: 7, normalBalance: "credit", onBalanceSheet: true,  isSystem: true },
  { id: 8,  name: "Owners Profit & Loss",group: "Capital",     prefix: "OPL", codeLength: 7, normalBalance: "credit", onBalanceSheet: true,  isSystem: true },
  { id: 9,  name: "Expenses",            group: "Expenses",    prefix: "E",   codeLength: 7, normalBalance: "debit",  onBalanceSheet: false, isSystem: true },
  { id: 10, name: "Liabilities",         group: "Liabilities", prefix: "L",   codeLength: 7, normalBalance: "credit", onBalanceSheet: true,  isSystem: true },
  { id: 11, name: "Current Liabilities", group: "Liabilities", prefix: "CL",  codeLength: 7, normalBalance: "credit", onBalanceSheet: true,  isSystem: true },
  { id: 12, name: "Acc Payables",        group: "Liabilities", prefix: "ACP", codeLength: 5, normalBalance: "credit", onBalanceSheet: true,  isSystem: true },
  { id: 13, name: "Fixed Liabilities",   group: "Liabilities", prefix: "FL",  codeLength: 7, normalBalance: "credit", onBalanceSheet: true,  isSystem: true },
  { id: 14, name: "Revenue",             group: "Revenue",     prefix: "R",   codeLength: 7, normalBalance: "credit", onBalanceSheet: false, isSystem: true },
];

export const accountGroups: AccountGroup[] = [
  "Assets",
  "Capital",
  "Expenses",
  "Liabilities",
  "Revenue",
];

export function getAccountType(id: number) {
  return accountTypes.find((t) => t.id === id);
}

export function accountTypesInGroup(group: AccountGroup) {
  return accountTypes.filter((t) => t.group === group);
}

/** Build the next code for a type, e.g. ACR01512 */
export function nextAccountCode(typeId: number, lastSequence: number) {
  const type = getAccountType(typeId);
  if (!type) return "";
  return `${type.prefix}${String(lastSequence + 1).padStart(type.codeLength, "0")}`;
}

/* ═══════════════════════════ Document series ═══════════════════════════ */
/**
 * Every document's numbering. Prefix and padding are editable, so the business
 * can switch from INV-0001 to SI/26/0001 without a code change.
 */

export type DocumentSeries = {
  id: number;
  key: string;
  label: string;
  prefix: string;
  /** Insert the 2-digit fiscal year, e.g. INV-26-0142 */
  includeYear: boolean;
  padding: number;
  nextNumber: number;
};

export const documentSeries: DocumentSeries[] = [
  { id: 1,  key: "sales.order",      label: "Customer Order",   prefix: "ORD", includeYear: true, padding: 4, nextNumber: 143 },
  { id: 2,  key: "sales.invoice",    label: "Sale Invoice",     prefix: "INV", includeYear: true, padding: 4, nextNumber: 8868 },
  { id: 3,  key: "sales.return",     label: "Sales Return",     prefix: "SR",  includeYear: true, padding: 4, nextNumber: 41 },
  { id: 4,  key: "purchase.order",   label: "Order to Supplier",prefix: "PO",  includeYear: true, padding: 4, nextNumber: 62 },
  { id: 5,  key: "purchase.receipt", label: "Stock Received",   prefix: "GRN", includeYear: true, padding: 4, nextNumber: 90 },
  { id: 6,  key: "purchase.invoice", label: "Purchase Invoice", prefix: "PI",  includeYear: true, padding: 4, nextNumber: 2029 },
  { id: 7,  key: "purchase.return",  label: "Purchase Return",  prefix: "PR",  includeYear: true, padding: 4, nextNumber: 9 },
  { id: 8,  key: "stock.transfer",   label: "Stock Transfer",   prefix: "TRF", includeYear: true, padding: 4, nextNumber: 3671 },
  { id: 9,  key: "stock.correction", label: "Stock Correction", prefix: "ADJ", includeYear: true, padding: 4, nextNumber: 24 },
  { id: 10, key: "money.received",   label: "Money Received",   prefix: "RV",  includeYear: true, padding: 4, nextNumber: 512 },
  { id: 11, key: "money.paid",       label: "Money Paid",       prefix: "PV",  includeYear: true, padding: 4, nextNumber: 388 },
  { id: 12, key: "manual.entry",     label: "Manual Entry",     prefix: "JV",  includeYear: true, padding: 4, nextNumber: 180 },
  { id: 13, key: "delivery.run",     label: "Delivery",         prefix: "DLV", includeYear: true, padding: 4, nextNumber: 218 },
];

export function getSeries(key: string) {
  return documentSeries.find((s) => s.key === key);
}

/** Preview what the next document number will look like. */
export function formatDocNumber(series: DocumentSeries, n = series.nextNumber, year = 26) {
  const seq = String(n).padStart(series.padding, "0");
  return series.includeYear ? `${series.prefix}-${year}-${seq}` : `${series.prefix}-${seq}`;
}

/* ═══════════════════════════ Compatibility (a.k.a. Brand) ═══════════════════════════ */
/**
 * In the client's catalogue this field answers "which phone does this fit?" —
 * the goods themselves are all own-brand. Kept under the label the staff
 * already use ("Brand") with the meaning spelled out in the UI.
 */

export type Compatibility = {
  id: number;
  code: string;
  name: string;
  productCount: number;
  isActive: boolean;
};

export const compatibilities: Compatibility[] = [
  { id: 1, code: "01", name: "Samsung",  productCount: 46,  isActive: true },
  { id: 2, code: "02", name: "Motorola", productCount: 12,  isActive: true },
  { id: 3, code: "03", name: "L.G",      productCount: 9,   isActive: true },
  { id: 4, code: "04", name: "iPhone",   productCount: 68,  isActive: true },
  { id: 5, code: "05", name: "China",    productCount: 822, isActive: true },
  { id: 6, code: "06", name: "Universal",productCount: 140, isActive: true },
];

export function getCompatibility(id: number) {
  return compatibilities.find((c) => c.id === id);
}

/* ═══════════════════════════ Payment methods ═══════════════════════════ */

export type PaymentMethod = {
  id: number;
  name: string;
  kind: "cash" | "bank" | "wallet" | "credit";
  isActive: boolean;
};

export const paymentMethods: PaymentMethod[] = [
  { id: 1, name: "Cash",      kind: "cash",   isActive: true },
  { id: 2, name: "Bank",      kind: "bank",   isActive: true },
  { id: 3, name: "JazzCash",  kind: "wallet", isActive: true },
  { id: 4, name: "Easypaisa", kind: "wallet", isActive: true },
  { id: 5, name: "Credit",    kind: "credit", isActive: true },
];

/* ═══════════════════════════ Couriers / delivery ═══════════════════════════ */
/**
 * Deliveries are handled by third-party courier companies. The business books
 * a consignment, gets a tracking number, and (for COD) collects the cash back
 * from the courier days later.
 *
 * Placeholder shape until the client confirms their exact process — the fields
 * here cover the common Pakistani courier flow.
 */

export type Courier = {
  id: number;
  name: string;
  shortName: string;
  contactPerson: string;
  phone: string;
  /** Days the courier typically holds COD cash before settling. */
  codSettlementDays: number;
  /** Flat booking charge per consignment, PKR. */
  bookingCharge: number;
  /** Percent of COD value the courier keeps as service fee. */
  codFeePercent: number;
  trackingUrlTemplate: string;
  isActive: boolean;
};

export const couriers: Courier[] = [
  { id: 1, name: "TCS Courier",      shortName: "TCS",      contactPerson: "Rashid Mehmood", phone: "021 111 123 456", codSettlementDays: 7,  bookingCharge: 220, codFeePercent: 1.5, trackingUrlTemplate: "https://www.tcsexpress.com/track/{tracking}", isActive: true },
  { id: 2, name: "Leopards Courier", shortName: "Leopards", contactPerson: "Adnan Siddiqui", phone: "021 111 300 786", codSettlementDays: 5,  bookingCharge: 180, codFeePercent: 1.2, trackingUrlTemplate: "https://leopardscourier.com/track/{tracking}", isActive: true },
  { id: 3, name: "M&P Express",      shortName: "M&P",      contactPerson: "Kamran Tariq",   phone: "021 111 202 202", codSettlementDays: 10, bookingCharge: 200, codFeePercent: 1.4, trackingUrlTemplate: "https://mulphilog.com/track/{tracking}", isActive: true },
  { id: 4, name: "Trax Logistics",   shortName: "Trax",     contactPerson: "Sana Iqbal",     phone: "021 111 872 900", codSettlementDays: 4,  bookingCharge: 165, codFeePercent: 1.0, trackingUrlTemplate: "https://trax.pk/track/{tracking}", isActive: true },
  { id: 5, name: "BlueEx",           shortName: "BlueEx",   contactPerson: "Hamza Sheikh",   phone: "021 111 258 339", codSettlementDays: 6,  bookingCharge: 190, codFeePercent: 1.3, trackingUrlTemplate: "https://blue-ex.com/track/{tracking}", isActive: false },
  { id: 6, name: "Own Rider",        shortName: "Rider",    contactPerson: "In-house",       phone: "0300 7287607",    codSettlementDays: 0,  bookingCharge: 0,   codFeePercent: 0,   trackingUrlTemplate: "", isActive: true },
];

export function getCourier(id: number) {
  return couriers.find((c) => c.id === id);
}

export const activeCouriers = () => couriers.filter((c) => c.isActive);

/* ═══════════════════════ Delivery channels ═══════════════════════ */
/**
 * Goods leave the order department by one of four routes, and each route has a
 * different person who can say "it arrived". That is the whole problem the
 * business asked us to solve: how do we find out?
 *
 * Nobody watches a screen waiting to confirm a delivery, so the system has to
 * come back and ask. `remindAfterDays` is how long to wait before the first
 * nudge — a Karachi hand-delivery is same-day, a truck to Lahore is not — and
 * `remindEveryHours` is how often to ask again until someone answers.
 */

export type ChannelKey = "local" | "online" | "cargo" | "logistics";

/** Who is allowed to mark this channel delivered. */
export type ConfirmedBy =
  | "sales-rep"      // the rep who owns the order — he handed it over himself
  | "order-dept"     // back office
  | "cargo-handler"; // the person in Karachi who chases cargo

export type DeliveryChannel = {
  key: ChannelKey;
  name: string;
  description: string;
  confirmedBy: ConfirmedBy;
  /** Courier/transporter names offered for this channel. */
  carriers: string[];
  /** Wait this long after dispatch before the first reminder. */
  remindAfterDays: number;
  /** Then ask again this often until someone answers. */
  remindEveryHours: number;
  /** Mark delivered from the carrier's own system. Needs a backend. */
  autoConfirm: boolean;
  /** Consignment note number is required (bilty for freight). */
  requiresBilty: boolean;
  isActive: boolean;
};

export const deliveryChannels: DeliveryChannel[] = [
  {
    key: "local",
    name: "Karachi — own team",
    description: "Karachi stock handed to the city's own sales rep, delivered by hand.",
    confirmedBy: "sales-rep",
    carriers: ["Own rider", "Sales rep"],
    remindAfterDays: 0,
    remindEveryHours: 6,
    autoConfirm: false,
    requiresBilty: false,
    isActive: true,
  },
  {
    key: "online",
    name: "Online courier",
    description: "Booked with a courier that has its own tracking portal.",
    confirmedBy: "order-dept",
    carriers: ["PostEx", "TCS Courier", "Leopards Courier", "M&P Express", "Trax Logistics"],
    remindAfterDays: 2,
    remindEveryHours: 24,
    /* The courier's portal exists but has never been used. Manual until the
       backend can read it — then this becomes a single switch. */
    autoConfirm: false,
    requiresBilty: false,
    isActive: true,
  },
  {
    key: "cargo",
    name: "Local cargo",
    description: "Goods transport companies. Confirmed by phone with the customer.",
    confirmedBy: "cargo-handler",
    carriers: ["Pak International Cargo", "Rehman Cargo", "Mehran Railway Cargo"],
    remindAfterDays: 2,
    remindEveryHours: 24,
    autoConfirm: false,
    requiresBilty: true,
    isActive: true,
  },
  {
    key: "logistics",
    name: "Heavy — logistics",
    description: "Bulk consignments by freight. The bilty receipt is the proof.",
    confirmedBy: "cargo-handler",
    carriers: ["Pak International Cargo", "NLC", "Daewoo Cargo"],
    /* Deliberately manual: freight has no tracking feed to read, and these are
       the highest-value consignments — a guessed "delivered" is worst here. */
    remindAfterDays: 4,
    remindEveryHours: 24,
    autoConfirm: false,
    requiresBilty: true,
    isActive: true,
  },
];

export function getChannel(key: ChannelKey) {
  return deliveryChannels.find((c) => c.key === key);
}

export const activeChannels = () => deliveryChannels.filter((c) => c.isActive);

/* ═══════════════════════════ Roles & permissions ═══════════════════════════ */
/**
 * The permission matrix is data, not scattered `if (role === "sales")` checks.
 * Pages ask `can(role, "orders.approve")`; the sidebar filters itself the
 * same way. Adding a fifth role means adding a row here.
 */

export type RoleKey = "super-admin" | "accountant" | "order-dept" | "sales";

export type AppRole = {
  key: RoleKey;
  name: string;
  description: string;
  /** Where this role lands after login. */
  homePath: string;
  color: "navy" | "info" | "success" | "yellow";
};

export const appRoles: AppRole[] = [
  {
    key: "super-admin",
    name: "Super Admin",
    description: "Full access — every module, plus users, setup and backup.",
    homePath: "/dashboard",
    color: "navy",
  },
  {
    key: "accountant",
    name: "Accountant",
    description: "Purchases, money in/out, ledgers and financial statements.",
    homePath: "/dashboard",
    color: "info",
  },
  {
    key: "order-dept",
    name: "Order Department",
    description: "Order queue, packing, stock, transfers and dispatch.",
    homePath: "/dashboard",
    color: "success",
  },
  {
    key: "sales",
    name: "Sales",
    description: "Take customer orders, track their status, follow up payments.",
    homePath: "/dashboard",
    color: "yellow",
  },
];

export function getRoleByKey(key: RoleKey) {
  return appRoles.find((r) => r.key === key);
}

/** Every capability the UI can gate on, grouped for the Setup screen. */
export type PermissionDef = {
  key: string;
  label: string;
  group: string;
};

export const permissionCatalog: PermissionDef[] = [
  { key: "orders.view",       label: "See customer orders",        group: "Sales" },
  { key: "orders.create",     label: "Take a customer order",      group: "Sales" },
  { key: "orders.approve",    label: "Approve & pack orders",      group: "Sales" },
  { key: "invoices.view",     label: "See sale invoices",          group: "Sales" },
  { key: "invoices.create",   label: "Make a sale invoice",        group: "Sales" },
  { key: "returns.sales",     label: "Handle sales returns",       group: "Sales" },
  { key: "customers.view",    label: "See customers",              group: "Sales" },
  { key: "customers.manage",  label: "Add & edit customers",       group: "Sales" },
  { key: "customers.tax",     label: "Fill customer tax details",  group: "Sales" },
  { key: "limits.manage",     label: "Set credit limits",          group: "Sales" },
  { key: "visits.view",       label: "See customer visits",        group: "Sales" },

  { key: "purchases.view",    label: "See purchases",              group: "Purchases" },
  { key: "purchases.manage",  label: "Make purchase documents",    group: "Purchases" },
  { key: "receipts.stock",    label: "Receive stock",              group: "Purchases" },
  { key: "suppliers.manage",  label: "Add & edit suppliers",       group: "Purchases" },

  { key: "stock.view",        label: "See stock",                  group: "Stock" },
  { key: "stock.transfer",    label: "Move stock between locations",group: "Stock" },
  { key: "stock.correct",     label: "Correct stock",              group: "Stock" },
  { key: "products.manage",   label: "Add & edit items",           group: "Stock" },
  { key: "cost.view",         label: "See cost price",             group: "Stock" },

  { key: "money.view",        label: "See money in / out",         group: "Money" },
  { key: "money.manage",      label: "Record money in / out",      group: "Money" },
  { key: "ledger.view",       label: "See ledgers & accounts",     group: "Money" },
  { key: "ledger.manage",     label: "Make manual entries",        group: "Money" },
  { key: "statements.view",   label: "See financial statements",   group: "Money" },
  { key: "expenses.manage",   label: "Record expenses",            group: "Money" },

  { key: "delivery.view",     label: "See deliveries",             group: "Delivery" },
  { key: "delivery.manage",   label: "Book & update deliveries",   group: "Delivery" },

  { key: "reports.view",      label: "See reports",                group: "Reports" },
  { key: "reports.full",      label: "See profit & cost reports",  group: "Reports" },

  { key: "setup.manage",      label: "Change setup & settings",    group: "Administration" },
  { key: "users.manage",      label: "Add & edit users",           group: "Administration" },
  { key: "backup.manage",     label: "Backup & restore",           group: "Administration" },
  { key: "activity.view",     label: "See activity history",       group: "Administration" },
  { key: "records.delete",    label: "Delete records",             group: "Administration" },
];

export const permissionGroups = Array.from(
  new Set(permissionCatalog.map((p) => p.group))
);

/** Which capabilities each role holds. Editable from Setup → Roles. */
export const rolePermissions: Record<RoleKey, string[]> = {
  "super-admin": permissionCatalog.map((p) => p.key),

  accountant: [
    "orders.view",
    "invoices.view", "invoices.create", "returns.sales",
    "customers.view", "customers.manage", "customers.tax", "limits.manage", "visits.view",
    "purchases.view", "purchases.manage", "suppliers.manage",
    "stock.view", "cost.view",
    "money.view", "money.manage",
    "ledger.view", "ledger.manage", "statements.view", "expenses.manage",
    "delivery.view",
    "reports.view", "reports.full",
    "activity.view", "records.delete",
  ],

  "order-dept": [
    "orders.view", "orders.create", "orders.approve",
    "invoices.view", "invoices.create", "returns.sales",
    "customers.view", "visits.view",
    "purchases.view", "receipts.stock",
    "stock.view", "stock.transfer", "stock.correct", "products.manage", "cost.view",
    "delivery.view", "delivery.manage",
    "reports.view",
  ],

  /**
   * Deliberately narrow. A rep takes orders and opens customer accounts —
   * nothing else. Tax registration and credit limits are left out on purpose:
   * a limit the person selling against it can raise is not a limit.
   */
  sales: [
    "orders.view", "orders.create",
    "customers.view", "customers.manage",
    "reports.view",
  ],
};

/** Does this role hold this capability? */
export function can(role: RoleKey, permission: string) {
  return rolePermissions[role]?.includes(permission) ?? false;
}

/** Does this role hold at least one of these capabilities? */
export function canAny(role: RoleKey, permissions: string[]) {
  if (permissions.length === 0) return true;
  return permissions.some((p) => can(role, p));
}

/* ═══════════════════════════ Operating policies ═══════════════════════════ */
/**
 * Behavioural switches. Each one is a decision the business can revisit
 * without touching code.
 */

export type StockPolicy = {
  /** Block a sale that would push stock below zero, or just warn. */
  negativeStock: "block" | "warn" | "allow";
  /** Warn when an item drops to its minimum quantity. */
  lowStockAlerts: boolean;
  /** Show packet (carton) columns beside piece quantities. */
  showPacking: boolean;
  /** Let one item carry several barcodes. */
  multipleBarcodes: boolean;
};

export const stockPolicy: StockPolicy = {
  negativeStock: "warn",
  lowStockAlerts: true,
  showPacking: true,
  multipleBarcodes: true,
};

export type SalesPolicy = {
  /** Cap on a single invoice's value, PKR. 0 = no cap. */
  perInvoiceLimitDefault: number;
  /** Cap on a customer's total outstanding balance, PKR. 0 = no cap. */
  ledgerLimitDefault: number;
  /** Default payment terms in days. */
  creditDaysDefault: number;
  /** Stop the order, or let it through with a warning, when a limit is crossed. */
  onLimitCross: "block" | "warn";
  /** Require an approval step between order and invoice. */
  requireOrderApproval: boolean;
  /** Attribute each invoice to a salesman. */
  trackSalesman: boolean;
  /** Show a "Share on WhatsApp" action on orders and invoices. */
  whatsappShare: boolean;
};

export const salesPolicy: SalesPolicy = {
  perInvoiceLimitDefault: 150000,
  ledgerLimitDefault: 500000,
  creditDaysDefault: 15,
  onLimitCross: "warn",
  requireOrderApproval: true,
  trackSalesman: true,
  whatsappShare: true,
};

export type DeliveryPolicy = {
  /** Deliveries are booked with third-party courier companies. */
  enabled: boolean;
  defaultCourierId: number;
  /** Charge the booking fee to the customer on the invoice. */
  chargeCustomer: boolean;
  /** Track cash-on-delivery settlement from the courier. */
  trackCod: boolean;
  /** Ask for a delivery photo or signature. */
  requireProof: boolean;
};

export const deliveryPolicy: DeliveryPolicy = {
  enabled: true,
  defaultCourierId: 1,
  chargeCustomer: false,
  trackCod: true,
  requireProof: false,
};

/* ═══════════════════════════ Keyboard shortcuts ═══════════════════════════ */
/**
 * The staff coming from the old system drive it entirely from the keyboard.
 * Single source of truth so the shortcut sheet and the handlers cannot drift.
 */

export type Shortcut = {
  keys: string;
  label: string;
  group: "Record" | "Navigation" | "Grid" | "Global";
};

export const shortcuts: Shortcut[] = [
  { keys: "F2",     label: "Save & confirm",            group: "Record" },
  { keys: "F3",     label: "Search",                    group: "Record" },
  { keys: "F4",     label: "New entry",                 group: "Record" },
  { keys: "F5",     label: "Refresh",                   group: "Record" },
  { keys: "F9",     label: "Print",                     group: "Record" },
  { keys: "Esc",    label: "Close / go back",           group: "Record" },

  { keys: "Ctrl+←", label: "Previous record",           group: "Navigation" },
  { keys: "Ctrl+→", label: "Next record",               group: "Navigation" },
  { keys: "Ctrl+↑", label: "First record",              group: "Navigation" },
  { keys: "Ctrl+↓", label: "Last record",               group: "Navigation" },

  { keys: "Enter",  label: "Next cell",                 group: "Grid" },
  { keys: "↓",      label: "New row (from last row)",   group: "Grid" },
  { keys: "Ctrl+D", label: "Delete row",                group: "Grid" },
  { keys: "Tab",    label: "Next field",                group: "Grid" },

  { keys: "Ctrl+K", label: "Command palette",           group: "Global" },
  { keys: "?",      label: "Shortcut help",             group: "Global" },
];
