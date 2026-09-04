import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { WarehouseQueue } from "@/components/portals/warehouse/warehouse-queue";

export const metadata: Metadata = { title: "Warehouse · VIZO" };

/**
 * The same queue the keeper's dashboard opens on, reachable by name so the
 * Super Admin can look at it without signing in as somebody else.
 *
 * The page shell is a Server Component and only the queue is a client island
 * -- AGENTS.md rule 1.
 */
export default function WarehousePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Warehouse" }]}
        title="Stock to prepare"
        subtitle="Invoiced orders waiting to be picked and sent to the order department."
      />
      <WarehouseQueue />
    </>
  );
}
