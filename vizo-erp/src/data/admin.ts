/**
 * Mock data for admin module: warehouses, users, roles, branches.
 */

import { initials } from "@/lib/format";

export type Warehouse = {
  id: number;
  code: string;
  name: string;
  city: string;
  branchId: number;
  managerId: number;
  isActive: boolean;
  productCount: number;
  totalValue: number;
};

export const warehouses: Warehouse[] = [
  { id: 1, code: "KHI-WH-01", name: "Karachi Main Warehouse", city: "Karachi · Saddar",        branchId: 1, managerId: 2, isActive: true, productCount: 28, totalValue: 18450000 },
  { id: 2, code: "KHI-WH-02", name: "Karachi Damaged Goods",  city: "Karachi · Saddar",        branchId: 1, managerId: 2, isActive: true, productCount: 14, totalValue: 245000 },
  { id: 3, code: "LHR-WH-01", name: "Lahore Distribution",    city: "Lahore · Hafeez Center",  branchId: 2, managerId: 3, isActive: true, productCount: 26, totalValue: 12480000 },
  { id: 4, code: "ISB-WH-01", name: "Islamabad Hub",          city: "Islamabad · Blue Area",   branchId: 3, managerId: 4, isActive: true, productCount: 22, totalValue: 8240000 },
];

export type Branch = {
  id: number;
  code: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  manager: string;
  isHeadOffice: boolean;
  isActive: boolean;
  invoicePrefix: string;
  poPrefix: string;
  voucherPrefix: string;
  warehouseCount: number;
  userCount: number;
  monthlyRevenue: number;
};

export const branchesAdmin: Branch[] = [
  { id: 1, code: "KHI", name: "Karachi Head Office", city: "Karachi", address: "Kohinoor Market, Saddar, Karachi", phone: "021 32412345", manager: "Umer Memon",  isHeadOffice: true,  isActive: true, invoicePrefix: "KHI-INV", poPrefix: "KHI-PO", voucherPrefix: "KHI-VCH", warehouseCount: 2, userCount: 12, monthlyRevenue: 12400000 },
  { id: 2, code: "LHR", name: "Lahore Branch",       city: "Lahore",  address: "Hafeez Center, Lahore",            phone: "042 35712345", manager: "Sara Khan",   isHeadOffice: false, isActive: true, invoicePrefix: "LHR-INV", poPrefix: "LHR-PO", voucherPrefix: "LHR-VCH", warehouseCount: 1, userCount: 8,  monthlyRevenue: 6850000 },
  { id: 3, code: "ISB", name: "Islamabad Branch",    city: "Islamabad", address: "Blue Area, Islamabad",            phone: "051 22812345", manager: "Bilal Ahmed", isHeadOffice: false, isActive: true, invoicePrefix: "ISB-INV", poPrefix: "ISB-PO", voucherPrefix: "ISB-VCH", warehouseCount: 1, userCount: 5,  monthlyRevenue: 2570000 },
];

export type Role = {
  id: number;
  name: string;
  description: string;
  isSystem: boolean;
  userCount: number;
  permissionCount: number;
};

export const roles: Role[] = [
  { id: 1, name: "SuperAdmin",        description: "Full system access — all modules, all branches",       isSystem: true,  userCount: 1,  permissionCount: 87 },
  { id: 2, name: "Accountant",        description: "Accounting, vouchers, expenses, reports",              isSystem: true,  userCount: 3,  permissionCount: 42 },
  { id: 3, name: "Order Department",  description: "Process orders, dispatch, returns, credit decisions",   isSystem: true,  userCount: 6,  permissionCount: 28 },
  { id: 4, name: "Sales",             description: "Create orders & customers, view own reports only",     isSystem: true,  userCount: 8,  permissionCount: 18 },
  { id: 5, name: "Purchase Officer",  description: "Create POs, GRNs, supplier management",                isSystem: false, userCount: 2,  permissionCount: 22 },
  { id: 6, name: "Branch Manager",    description: "Branch-scoped accounting, sales oversight",            isSystem: false, userCount: 3,  permissionCount: 56 },
  { id: 7, name: "Collections",       description: "AR aging, payment recording, customer follow-ups",     isSystem: false, userCount: 2,  permissionCount: 14 },
];

export type User = {
  id: number;
  fullName: string;
  initials: string;
  email: string;
  phone: string;
  employeeCode: string;
  roles: string[];
  branches: string[];
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt: string;
  createdAt: string;
};

const u = (
  id: number,
  fullName: string,
  email: string,
  phone: string,
  empCode: string,
  roles: string[],
  branches: string[],
  isActive: boolean,
  lastLogin: string
): User => ({
  id,
  fullName,
  initials: initials(fullName),
  email,
  phone,
  employeeCode: empCode,
  roles,
  branches,
  isActive,
  isLocked: false,
  lastLoginAt: lastLogin,
  createdAt: "2025-08-01",
});

export const users: User[] = [
  u(1,  "Umer Memon",     "umer@vizo.com.pk",          "0300 7287607", "EMP-001", ["SuperAdmin"],         ["KHI", "LHR", "ISB"], true,  "2 min ago"),
  u(2,  "Hassan Raza",    "hassan@vizo.com.pk",        "0321 1234567", "EMP-002", ["Accountant"],         ["KHI"],               true,  "12 min ago"),
  u(3,  "Sara Khan",      "sara@vizo.com.pk",          "0322 2345678", "EMP-003", ["Sales"],              ["LHR"],               true,  "5 min ago"),
  u(4,  "Bilal Ahmed",    "bilal@vizo.com.pk",         "0333 3456789", "EMP-004", ["Order Department"],   ["KHI"],               true,  "1 hour ago"),
  u(5,  "Fatima Sheikh",  "fatima@vizo.com.pk",        "0345 4567890", "EMP-005", ["Branch Manager"],     ["LHR"],               true,  "3 hours ago"),
  u(6,  "Ahmed Riaz",     "ahmed@vizo.com.pk",         "0317 5678901", "EMP-006", ["Purchase Officer"],   ["KHI"],               true,  "Yesterday"),
  u(7,  "Zara Malik",     "zara@vizo.com.pk",          "0307 6789012", "EMP-007", ["Sales"],              ["KHI"],               true,  "30 min ago"),
  u(8,  "Imran Iqbal",    "imran@vizo.com.pk",         "0334 7890123", "EMP-008", ["Sales"],              ["LHR"],               true,  "2 hours ago"),
  u(9,  "Nadia Hussain",  "nadia@vizo.com.pk",         "0301 8901234", "EMP-009", ["Accountant"],         ["LHR"],               true,  "1 day ago"),
  u(10, "Junaid Akhtar",  "junaid@vizo.com.pk",        "0314 9012345", "EMP-010", ["Order Department"],   ["ISB"],               true,  "4 hours ago"),
  u(11, "Rabia Yousaf",   "rabia@vizo.com.pk",         "0341 0123456", "EMP-011", ["Collections"],        ["KHI"],               true,  "6 hours ago"),
  u(12, "Asad Ali",       "asad@vizo.com.pk",          "0303 1234567", "EMP-012", ["Sales"],              ["KHI"],               false, "5 days ago"),
];

export function getUser(id: number) {
  return users.find((u) => u.id === id);
}

export function getRole(id: number) {
  return roles.find((r) => r.id === id);
}

export function getBranch(id: number) {
  return branchesAdmin.find((b) => b.id === id);
}

export function getWarehouse(id: number) {
  return warehouses.find((w) => w.id === id);
}
