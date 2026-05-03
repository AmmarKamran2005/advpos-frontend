"use client";

import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { units, type UoM } from "@/data/products";

export default function UoMPage() {
  const columns: Column<UoM>[] = [
    { key: "code",     header: "Code",     cell: (u) => <span className="tabular text-sm font-bold text-navy-900 dark:text-white">{u.code}</span> },
    { key: "name",     header: "Name",     cell: (u) => <span className="text-sm text-slate-700 dark:text-slate-200">{u.name}</span> },
    { key: "decimals", header: "Decimals", align: "right", cell: (u) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{u.decimals}</span> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Units of Measure" }]}
        title="Units of Measure"
        subtitle="Quantity units used across products"
        actions={
          <Button variant="accent" size="md" className="gap-1.5">
            <Plus />
            <span>New Unit</span>
          </Button>
        }
      />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={units} />
      </Card>
    </>
  );
}
