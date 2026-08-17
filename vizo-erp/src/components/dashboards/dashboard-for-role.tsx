"use client";

import * as React from "react";
import { useSession } from "@/components/providers/session-provider";
import { SalesDashboard } from "./sales-dashboard";
import { OrderDeptDashboard } from "./order-dept-dashboard";

/**
 * Each role opens on the work it actually does. Sales sees orders and money;
 * the order department sees a work queue. Accounts and admin keep the full
 * dashboard until their portals are finalised in turn.
 */
export function DashboardForRole({ children }: { children: React.ReactNode }) {
  const { role } = useSession();

  if (role === "sales") return <SalesDashboard />;
  if (role === "order-dept") return <OrderDeptDashboard />;
  return <>{children}</>;
}
