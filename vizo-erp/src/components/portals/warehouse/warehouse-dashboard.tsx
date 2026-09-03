"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useSession } from "@/components/providers/session-provider";
import { WarehouseQueue } from "./warehouse-queue";

/**
 * The warehouse keeper opens straight onto their queue.
 *
 * Every other role gets a dashboard of figures because their work is spread
 * across several screens. The keeper's is not: there is one list, and when it
 * is empty there is nothing to do. A page of charts above it would be a page
 * of charts between them and the only thing they came here for.
 */
export function WarehouseDashboard() {
  const { user } = useSession();
  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <>
      <PageHeader
        title={`Good to see you, ${firstName}`}
        subtitle="Orders the owner has confirmed. Pick the stock, then send each one to the order department."
      />
      <WarehouseQueue />
    </>
  );
}
