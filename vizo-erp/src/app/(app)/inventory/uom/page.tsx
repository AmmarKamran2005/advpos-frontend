"use client";

import * as React from "react";
import { z } from "zod";
import { Plus, Edit3, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EntityFormDialog, ConfirmDialog } from "@/components/dialogs";
import { units, type UoM } from "@/data/products";
import { toast } from "@/components/ui/toaster";

const Schema = z.object({
  code: z.string().min(1, "Code required").max(10, "Max 10 chars").regex(/^[A-Z]+$/, "Uppercase letters only"),
  name: z.string().min(2, "Name required").max(100),
  decimals: z.coerce.number().min(0, "Cannot be negative").max(4, "Max 4"),
});
type Form = z.infer<typeof Schema>;

export default function UoMPage() {
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; u?: UoM } | null>(null);
  const [del, setDel] = React.useState<UoM | null>(null);

  const columns: Column<UoM>[] = [
    { key: "code",     header: "Code",     cell: (u) => <span className="tabular text-sm font-bold text-navy-900 dark:text-white">{u.code}</span> },
    { key: "name",     header: "Name",     cell: (u) => <span className="text-sm text-slate-700 dark:text-slate-200">{u.name}</span> },
    { key: "decimals", header: "Decimals", align: "right", cell: (u) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{u.decimals}</span> },
    { key: "actions",  header: "",         align: "right", cell: (u) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon-sm" onClick={() => setDialog({ mode: "edit", u })} aria-label="Edit"><Edit3 /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDel(u)} aria-label="Delete" className="text-danger"><Trash2 /></Button>
        </div>
      )
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Units of Measure" }]}
        title="Units of Measure"
        subtitle="Quantity units used across products"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => setDialog({ mode: "create" })}>
            <Plus />
            <span>New Unit</span>
          </Button>
        }
      />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={units} />
      </Card>

      <EntityFormDialog<Form>
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        mode={dialog?.mode ?? "create"}
        title="Unit of Measure"
        schema={Schema}
        size="md"
        fields={[
          { name: "code", label: "Code", type: "text", placeholder: "PCS, BOX, CTN", required: true, hint: "Uppercase letters only", disabledOnEdit: true },
          { name: "name", label: "Full name", type: "text", placeholder: "Pieces", required: true },
          { name: "decimals", label: "Decimal places", type: "number", min: 0, max: 4, hint: "0 for whole units, 3 for KG/LTR", fullWidth: true },
        ]}
        defaultValues={{
          code: dialog?.u?.code ?? "",
          name: dialog?.u?.name ?? "",
          decimals: dialog?.u?.decimals ?? 0,
        }}
      />

      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Delete "${del?.code}"?`}
        description="This unit will no longer be available for new products. Existing products keep their assigned unit."
        variant="danger"
        confirmLabel="Delete unit"
        onConfirm={() => { toast.success("Unit deleted"); setDel(null); }}
      />
    </>
  );
}
