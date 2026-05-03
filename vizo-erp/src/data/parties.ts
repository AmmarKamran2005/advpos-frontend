/**
 * Mock parties data — VIZO mobile accessories distribution counterparties.
 * Real-world Pakistani mobile shop names from Hafeez Center, Saddar, etc.
 */

import { initials } from "@/lib/format";

export type PartyType = "CUSTOMER" | "SUPPLIER" | "BOTH";
export type PartyCategory = "RETAILER" | "WHOLESALER" | "DISTRIBUTOR" | "MANUFACTURER" | "AGENT";

export type Party = {
  id: number;
  partyCode: string;
  type: PartyType;
  legalName: string;
  displayName: string;
  initials: string;
  phone: string;
  email: string | null;
  city: string;
  province: string;
  category: PartyCategory;
  ntn: string | null;
  creditLimit: number;
  creditDays: number;
  creditHoldPolicy: "NONE" | "WARN" | "BLOCK";
  currentBalance: number;
  payableBalance: number;
  lastPaymentAt: string | null;
  lastPurchaseAt: string | null;
  lastSupplyAt: string | null;
  salesPerson: string | null;
  isActive: boolean;
  createdAt: string;
  branchId: number;
  rating: "A" | "B" | "C" | "D";
};

const make = (
  id: number,
  partyCode: string,
  type: PartyType,
  legalName: string,
  city: string,
  category: PartyCategory,
  phone: string,
  opts: Partial<Party> = {}
): Party => ({
  id,
  partyCode,
  type,
  legalName,
  displayName: legalName,
  initials: initials(legalName),
  phone,
  email: opts.email ?? null,
  city,
  province: opts.province ?? cityToProvince(city),
  category,
  ntn: opts.ntn ?? null,
  creditLimit: opts.creditLimit ?? 0,
  creditDays: opts.creditDays ?? 0,
  creditHoldPolicy: opts.creditHoldPolicy ?? "WARN",
  currentBalance: opts.currentBalance ?? 0,
  payableBalance: opts.payableBalance ?? 0,
  lastPaymentAt: opts.lastPaymentAt ?? null,
  lastPurchaseAt: opts.lastPurchaseAt ?? null,
  lastSupplyAt: opts.lastSupplyAt ?? null,
  salesPerson: opts.salesPerson ?? null,
  isActive: opts.isActive ?? true,
  createdAt: opts.createdAt ?? "2025-08-01",
  branchId: opts.branchId ?? 1,
  rating: opts.rating ?? "B",
});

function cityToProvince(city: string): string {
  if (["Karachi", "Hyderabad", "Sukkur", "Quetta"].includes(city)) return city === "Quetta" ? "Balochistan" : "Sindh";
  if (["Lahore", "Faisalabad", "Multan", "Rawalpindi", "Sialkot", "Gujranwala"].includes(city)) return "Punjab";
  if (["Islamabad"].includes(city)) return "Islamabad Capital";
  if (["Peshawar", "Mardan", "Abbottabad"].includes(city)) return "KPK";
  return "Pakistan";
}

export const parties: Party[] = [
  /* CUSTOMERS */
  make(1,  "VZ-C-0001", "CUSTOMER", "Hafeez Center Shop #28",     "Lahore",     "WHOLESALER",  "0300 4567890",  { creditLimit: 500000, creditDays: 30, currentBalance: 245000, lastPaymentAt: "2026-04-25", salesPerson: "Sara Khan",   ntn: "1234567-8", email: "info@hafeezshop28.pk", rating: "A", branchId: 2 }),
  make(2,  "VZ-C-0002", "CUSTOMER", "Mobile Zone Lahore",         "Lahore",     "RETAILER",    "0321 1234567",  { creditLimit: 200000, creditDays: 15, currentBalance: 212400, lastPaymentAt: "2026-03-10", creditHoldPolicy: "BLOCK", salesPerson: "Sara Khan", rating: "C", branchId: 2 }),
  make(3,  "VZ-C-0003", "CUSTOMER", "Saddar Mobile Plaza",        "Karachi",    "RETAILER",    "0333 9876543",  { creditLimit: 150000, creditDays: 30, currentBalance: 32750,  lastPaymentAt: "2026-04-28", salesPerson: "Hassan Raza", ntn: "9876543-2", email: "saddarmobile@gmail.com", rating: "B" }),
  make(4,  "VZ-C-0004", "CUSTOMER", "Blue Area Distributors",     "Islamabad",  "DISTRIBUTOR", "0345 6789012",  { creditLimit: 1500000, creditDays: 45, currentBalance: 884000, lastPaymentAt: "2026-04-20", salesPerson: "Bilal Ahmed", ntn: "5678901-2", rating: "A", branchId: 3 }),
  make(5,  "VZ-C-0005", "CUSTOMER", "Cellular World KHI",         "Karachi",    "WHOLESALER",  "0317 8901234",  { creditLimit: 800000, creditDays: 30, currentBalance: 156200, lastPaymentAt: "2026-04-15", salesPerson: "Hassan Raza", ntn: "3456789-0", rating: "B" }),
  make(6,  "VZ-C-0006", "CUSTOMER", "Faisal Mobile Mart",         "Lahore",     "RETAILER",    "0322 3344556",  { creditLimit: 100000, creditDays: 15, currentBalance: 18400,  lastPaymentAt: "2026-04-29", salesPerson: "Sara Khan", rating: "B", branchId: 2 }),
  make(7,  "VZ-C-0007", "CUSTOMER", "Quetta Cellular",            "Quetta",     "RETAILER",    "0307 5566778",  { creditLimit: 50000, creditDays: 15, currentBalance: 0, lastPaymentAt: null, salesPerson: "Hassan Raza", rating: "B" }),
  make(8,  "VZ-C-0008", "CUSTOMER", "Mobilink Connect Lahore",    "Lahore",     "WHOLESALER",  "0301 2233445",  { creditLimit: 600000, creditDays: 30, currentBalance: 425000, lastPaymentAt: "2026-04-18", salesPerson: "Sara Khan", rating: "A", branchId: 2 }),
  make(9,  "VZ-C-0009", "CUSTOMER", "Mobile Mart Multan",         "Multan",     "RETAILER",    "0334 6677889",  { creditLimit: 75000, creditDays: 15, currentBalance: 64500, lastPaymentAt: "2026-03-22", creditHoldPolicy: "WARN", salesPerson: "Bilal Ahmed", rating: "C", branchId: 2 }),
  make(10, "VZ-C-0010", "CUSTOMER", "Star Communications",        "Faisalabad", "DISTRIBUTOR", "0300 7788990",  { creditLimit: 1200000, creditDays: 45, currentBalance: 985000, lastPaymentAt: "2026-04-22", salesPerson: "Sara Khan", ntn: "2233445-6", rating: "A", branchId: 2 }),
  make(11, "VZ-C-0011", "CUSTOMER", "Pak Mobile Centre",          "Peshawar",   "RETAILER",    "0314 8899001",  { creditLimit: 100000, creditDays: 15, currentBalance: 28000, lastPaymentAt: "2026-04-17", salesPerson: "Bilal Ahmed", rating: "B", branchId: 3 }),
  make(12, "VZ-C-0012", "CUSTOMER", "Margalla Distributors",      "Islamabad",  "DISTRIBUTOR", "0345 1122334",  { creditLimit: 1000000, creditDays: 45, currentBalance: 218000, lastPaymentAt: "2026-04-30", salesPerson: "Bilal Ahmed", ntn: "7788990-1", rating: "A", branchId: 3 }),
  make(13, "VZ-C-0013", "CUSTOMER", "Eden Mobile Hyderabad",      "Hyderabad",  "RETAILER",    "0341 5566778",  { creditLimit: 75000, creditDays: 15, currentBalance: 12000, lastPaymentAt: "2026-04-26", salesPerson: "Hassan Raza", rating: "B" }),
  make(14, "VZ-C-0014", "CUSTOMER", "Universal Mobile Sialkot",   "Sialkot",    "WHOLESALER",  "0307 4455667",  { creditLimit: 400000, creditDays: 30, currentBalance: 195000, lastPaymentAt: "2026-04-12", salesPerson: "Sara Khan", rating: "B", branchId: 2 }),
  make(15, "VZ-C-0015", "CUSTOMER", "Galaxy Phones & Accessories","Rawalpindi", "RETAILER",    "0333 7788990",  { creditLimit: 150000, creditDays: 30, currentBalance: 88500, lastPaymentAt: "2026-04-19", salesPerson: "Bilal Ahmed", rating: "B", branchId: 3 }),

  /* SUPPLIERS */
  make(20, "VZ-S-0001", "SUPPLIER", "China Mobile Plaza Trading",   "Karachi", "MANUFACTURER", "+86 138 0012 3456", { payableBalance: 1850000, lastSupplyAt: "2026-04-25", ntn: "9999991-1", email: "sales@cmp-trading.cn", rating: "A" }),
  make(21, "VZ-S-0002", "SUPPLIER", "Shenzhen Electronics Hub",      "Karachi", "MANUFACTURER", "+86 139 2233 4455", { payableBalance: 1240000, lastSupplyAt: "2026-04-20", ntn: "9999992-2", email: "info@sz-electronics.cn", rating: "A" }),
  make(22, "VZ-S-0003", "SUPPLIER", "Karachi Wholesale Cells",       "Karachi", "WHOLESALER",   "0321 4455667",       { payableBalance: 480000, lastSupplyAt: "2026-04-18", ntn: "9999993-3", rating: "B" }),
  make(23, "VZ-S-0004", "SUPPLIER", "Pak Accessories Imports",       "Karachi", "WHOLESALER",   "0301 5566778",       { payableBalance: 320000, lastSupplyAt: "2026-04-15", ntn: "9999994-4", rating: "B" }),
  make(24, "VZ-S-0005", "SUPPLIER", "Audio Tech International",      "Lahore",  "MANUFACTURER", "+86 137 6677 8899",  { payableBalance: 950000, lastSupplyAt: "2026-04-10", ntn: "9999995-5", rating: "A", branchId: 2 }),

  /* BOTH (rare but exist — supplier who also buys returned/excess) */
  make(30, "VZ-B-0001", "BOTH",     "Tech Bazaar Pvt Ltd",           "Lahore",  "WHOLESALER",   "0322 9988776",       { creditLimit: 300000, creditDays: 30, currentBalance: 95000, payableBalance: 240000, lastPaymentAt: "2026-04-21", lastSupplyAt: "2026-04-12", salesPerson: "Sara Khan", ntn: "8888888-1", rating: "B", branchId: 2 }),
];

export function getParty(id: number) {
  return parties.find((p) => p.id === id);
}

export function getPartyByCode(code: string) {
  return parties.find((p) => p.partyCode === code);
}
