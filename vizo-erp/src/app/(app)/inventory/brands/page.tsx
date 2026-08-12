"use client";

import * as React from "react";
import { z } from "zod";
import { Plus, Tag, Edit3, Package, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EntityFormDialog, ConfirmDialog } from "@/components/dialogs";
import { brands } from "@/data/products";
import { toast } from "@/components/ui/toaster";

const Schema = z.object({
  name: z.string().min(2, "Name required").max(100),
  description: z.string().max(300, "Max 300 chars").optional().or(z.literal("")),
  isActive: z.boolean(),
});
type Form = z.infer<typeof Schema>;

export default function BrandsPage() {
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; brand?: typeof brands[number] } | null>(null);
  const [del, setDel] = React.useState<typeof brands[number] | null>(null);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Brands" }]}
        title="Brands"
        subtitle="Which handset family each item is made for"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => setDialog({ mode: "create" })}>
            <Plus />
            <span>New Brand</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map((b) => (
          <Card key={b.id} className="cursor-pointer hover:border-brand-yellow/40 transition-colors group">
            <CardBody>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="size-12 rounded-xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow group-hover:bg-brand-yellow group-hover:text-navy-900 transition-colors">
                  <Tag className="size-5" />
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => setDialog({ mode: "edit", brand: b })} aria-label="Edit brand"><Edit3 /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDel(b)} aria-label="Delete brand" className="text-danger"><Trash2 /></Button>
                </div>
              </div>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">{b.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{b.description}</p>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
                <Badge variant="muted" className="gap-1"><Package className="size-3" />{b.productCount} products</Badge>
                {b.isActive ? <StatusPill variant="success">Active</StatusPill> : <StatusPill variant="muted">Inactive</StatusPill>}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <EntityFormDialog<Form>
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        mode={dialog?.mode ?? "create"}
        title="Brand"
        schema={Schema}
        fields={[
          { name: "name", label: "Brand name", type: "text", placeholder: "e.g. VIZO Titan", required: true, fullWidth: true },
          { name: "description", label: "Description", type: "textarea", rows: 2, placeholder: "Short description shown on product cards", fullWidth: true },
          { name: "isActive", label: "Active", type: "switch", hint: "Inactive brands are hidden in product creation", fullWidth: true },
        ]}
        defaultValues={{
          name: dialog?.brand?.name ?? "",
          description: dialog?.brand?.description ?? "",
          isActive: dialog?.brand?.isActive ?? true,
        }}
      />

      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Delete "${del?.name}"?`}
        description={del && del.productCount > 0 ? `This brand has ${del.productCount} products that will need to be reassigned.` : "This action cannot be undone."}
        variant="danger"
        confirmLabel="Delete brand"
        onConfirm={() => { toast.success("Brand deleted"); setDel(null); }}
      />
    </>
  );
}
