"use client";

import * as React from "react";
import { useSession } from "@/components/providers/session-provider";
import { SalesDashboard } from "./sales-dashboard";

/**
 * The sales team needs a different first screen from everyone else: orders and
 * money, not revenue charts. Other roles keep the full dashboard until each of
 * their portals is finalised in turn.
 */
export function DashboardForRole({ children }: { children: React.ReactNode }) {
  const { role } = useSession();

  if (role === "sales") return <SalesDashboard />;
  return <>{children}</>;
}
