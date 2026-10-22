"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { LogisticsList } from "@/components/purchases/logistics-manager";

/* The logistics companies duty is paid to — each one an account under
   2150 Logistics Companies (26 Sep). The same list opens from beside every
   Duty box on a purchase order; this is its own page for the sidebar. */
export default function LogisticsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Logistics Companies" }]}
        title="Logistics Companies"
        subtitle="Duty on a purchase is owed to one of these. Each has its own account in the ledger."
      />
      <Card className="max-w-3xl">
        <CardBody>
          <LogisticsList />
        </CardBody>
      </Card>
    </>
  );
}
