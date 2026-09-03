/**
 * Users and roles.
 *
 * Locations, permissions and every other configurable list live in
 * settings.ts — this file only holds the people.
 */

import { initials } from "@/lib/format";

export type Role = {
  id: number;
  name: string;
  description: string;
  isSystem: boolean;
  userCount: number;
  permissionCount: number;
};

export const roles: Role[] = [
  { id: 1, name: "Super Admin",      description: "Full access — every module, plus users, setup and backup.",   isSystem: true, userCount: 1, permissionCount: 33 },
  { id: 2, name: "Accountant",       description: "Purchases, money in/out, ledgers and financial statements.",  isSystem: true, userCount: 2, permissionCount: 23 },
  { id: 3, name: "Order Department", description: "Order queue, packing, stock, transfers and dispatch.",        isSystem: true, userCount: 3, permissionCount: 17 },
  { id: 4, name: "Sales",            description: "Take customer orders, track status, follow up payments.",     isSystem: true, userCount: 4, permissionCount: 7 },
];

export type User = {
  id: number;
  fullName: string;
  initials: string;
  email: string;
  phone: string;
  employeeCode: string;
  roles: string[];
  locations: string[];
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
  locations: string[],
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
  locations,
  isActive,
  isLocked: false,
  lastLoginAt: lastLogin,
  createdAt: "2025-08-01",
});

export const users: User[] = [
  u(1,  "Umer Memon",    "vizo.com.pk@gmail.com"   ,   "0300 7287607", "EMP-001", ["Super Admin"],      ["LOC-01", "LOC-02", "LOC-03"], true,  "2 min ago"),
  u(2,  "Hassan Raza",   "accounts@advpos.pk", "0321 1234567", "EMP-002", ["Accountant"],       ["LOC-01", "LOC-02", "LOC-03"], true,  "12 min ago"),
  u(3,  "Nadia Hussain", "nadia@vizo.com.pk",  "0301 8901234", "EMP-003", ["Accountant"],       ["LOC-02"],                     true,  "1 day ago"),
  u(4,  "Bilal Ahmed",   "order@advpos.pk"   ,  "0333 3456789", "EMP-004", ["Order Department"], ["LOC-01", "LOC-02"],           true,  "1 hour ago"),
  u(5,  "Junaid Akhtar", "junaid@vizo.com.pk", "0314 9012345", "EMP-005", ["Order Department"], ["LOC-02"],                     true,  "4 hours ago"),
  u(6,  "Ahmed Riaz",    "ahmed@vizo.com.pk",  "0317 5678901", "EMP-006", ["Order Department"], ["LOC-01"],                     true,  "Yesterday"),
  u(7,  "Zara Malik",    "sales@advpos.pk"   ,   "0307 6789012", "EMP-007", ["Sales"],            ["LOC-03"],                     true,  "30 min ago"),
  u(8,  "Imran Iqbal",   "imran@vizo.com.pk",  "0334 7890123", "EMP-008", ["Sales"],            ["LOC-03"],                     true,  "2 hours ago"),
  u(9,  "Sara Khan",     "sara@vizo.com.pk",   "0322 2345678", "EMP-009", ["Sales"],            ["LOC-02"],                     true,  "5 min ago"),
  u(10, "Asad Ali",      "asad@vizo.com.pk",   "0303 1234567", "EMP-010", ["Sales"],            ["LOC-02"],                     false, "5 days ago"),
];

export function getUser(id: number) {
  return users.find((u) => u.id === id);
}

export function getRole(id: number) {
  return roles.find((r) => r.id === id);
}


