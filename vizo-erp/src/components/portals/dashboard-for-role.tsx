"use client";

import * as React from "react";
import { useSession } from "@/components/providers/session-provider";
import { SalesDashboard } from "./sales/sales-dashboard";
import { OrderDeptDashboard } from "./order-dept/order-dept-dashboard";
import { AccountantDashboard } from "./accountant/accountant-dashboard";

/**
 * Each role opens on the work it actually does. Sales sees orders and money;
 * the order department sees a work queue; accounts sees the collections
 * waiting on confirmation. Admin keeps the full dashboard until its portal
 * is finalised in turn.
 */
export function DashboardForRole({ children }: { children: React.ReactNode }) {
  const { role } = useSession();

  if (role === "sales") return <SalesDashboard />;
  if (role === "order-dept") return <OrderDeptDashboard />;
  if (role === "accountant") return <AccountantDashboard />;
  return <>{children}</>;
}
