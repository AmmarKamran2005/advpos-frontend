"use client";

import * as React from "react";
import { z } from "zod";
import { Plus, Building2, Edit3, Package, MapPin, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EntityFormDialog, ConfirmDialog } from "@/components/dialogs";
import { warehouses, branchesAdmin, type Warehouse } from "@/data/admin";
import { formatCompact } from "@/lib/format";
import { toast } from "@/components/ui/toaster";

const Schema = z.object({
  code: z.string().min(3, "Min 3 chars").max(20).regex(/^[A-Z0-9-]+$/, "Uppercase letters/digits/hyphens only"),
  name: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  branchId: z.coerce.number().positive("Pick a branch"),
  isActive: z.boolean(),
});
type Form = z.infer<typeof Schema>;

export default function WarehousesPage() {
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; w?: Warehouse } | null>(null);
  const [del, setDel] = React.useState<Warehouse | null>(null);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Warehouses" }]}
        title="Warehouses"
        subtitle="Storage locations across all branches"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => setDialog({ mode: "create" })}>
            <Plus />
            <span>New Warehouse</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {warehouses.map((w) => {
          const branch = branchesAdmin.find((b) => b.id === w.branchId);
          return (
            <Card key={w.id} className="cursor-pointer hover:border-brand-yellow/40 transition-colors group">
              <CardBody>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="size-12 rounded-xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow group-hover:bg-brand-yellow group-hover:text-navy-900 transition-colors">
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-navy-900 dark:text-white">{w.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="tabular text-xs text-slate-500 dark:text-slate-400">{w.code}</span>
                        <Badge variant="muted">{branch?.name}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setDialog({ mode: "edit", w })} aria-label="Edit"><Edit3 /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDel(w)} className="text-danger" aria-label="Delete"><Trash2 /></Button>
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 mb-4">
                  <MapPin className="size-3 text-slate-400" />
                  {w.city}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-navy-700">
                  <div>
                    <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Products</div>
                    <div className="text-lg tabular font-bold text-navy-900 dark:text-white mt-1 inline-flex items-center gap-1.5">
                      <Package className="size-3.5 text-slate-400" />{w.productCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Value</div>
                    <div className="text-lg tabular font-bold text-navy-900 dark:text-white mt-1">{formatCompact(w.totalValue)}</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-navy-700 flex items-center justify-between">
                  {w.isActive ? <StatusPill variant="success">Active</StatusPill> : <StatusPill variant="muted">Inactive</StatusPill>}
                  <span className="text-xs text-slate-500 dark:text-slate-400">Mgr: User #{w.managerId}</span>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <EntityFormDialog<Form>
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        mode={dialog?.mode ?? "create"}
        title="Warehouse"
        schema={Schema}
        fields={[
          { name: "code", label: "Warehouse code", type: "text", placeholder: "KHI-WH-01", required: true, disabledOnEdit: true, hint: "Uppercase, hyphens allowed" },
          { name: "name", label: "Display name", type: "text", placeholder: "Karachi Main Warehouse", required: true },
          { name: "city", label: "City / Address", type: "text", placeholder: "Karachi · Saddar", required: true },
          { name: "branchId", label: "Owning branch", type: "select", required: true, options: branchesAdmin.map((b) => ({ value: b.id, label: b.name })) },
          { name: "isActive", label: "Active", type: "switch", hint: "Inactive warehouses are hidden in transfer/order screens", fullWidth: true },
        ]}
        defaultValues={{
          code: dialog?.w?.code ?? "",
          name: dialog?.w?.name ?? "",
          city: dialog?.w?.city ?? "",
          branchId: (dialog?.w?.branchId ?? 0) as number,
          isActive: dialog?.w?.isActive ?? true,
        }}
      />

      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Delete warehouse "${del?.name}"?`}
        description={del && del.productCount > 0
          ? `This warehouse holds ${del.productCount} products. You'll need to transfer the stock first.`
          : "This action cannot be undone."}
        variant="danger"
        confirmLabel="Delete warehouse"
        requireReason
        onConfirm={(r) => { toast.success("Warehouse deleted", { description: `Reason: ${r}` }); setDel(null); }}
      />
    </>
  );
}
