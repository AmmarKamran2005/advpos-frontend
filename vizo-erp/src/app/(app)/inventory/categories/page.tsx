"use client";

import * as React from "react";
import { z } from "zod";
import { Plus, Folder, FolderOpen, Edit3, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EntityFormDialog, ConfirmDialog } from "@/components/dialogs";
import { categories } from "@/data/products";
import { toast } from "@/components/ui/toaster";

const Schema = z.object({
  name: z.string().min(2, "Name required").max(100),
  parentId: z.coerce.number().optional().or(z.literal("")),
  isActive: z.boolean(),
});
type Form = z.infer<typeof Schema>;

export default function CategoriesPage() {
  const roots = categories.filter((c) => c.parentId === null);
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; cat?: typeof categories[number] } | null>(null);
  const [del, setDel] = React.useState<typeof categories[number] | null>(null);

  const fields: Parameters<typeof EntityFormDialog<Form>>[0]["fields"] = [
    { name: "name", label: "Category name", type: "text", placeholder: "e.g. Earbuds", required: true, fullWidth: true },
    { name: "parentId", label: "Parent category", type: "select", options: [{ value: "", label: "— Top level —" }, ...categories.filter((c) => c.parentId === null).map((c) => ({ value: c.id, label: c.name }))] },
    { name: "isActive", label: "Active", type: "switch", hint: "Inactive categories are hidden in product creation", fullWidth: true },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Categories" }]}
        title="Categories"
        subtitle="Organize products in a hierarchical tree"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => setDialog({ mode: "create" })}>
            <Plus />
            <span>New Category</span>
          </Button>
        }
      />

      <Card>
        <CardBody>
          <div className="space-y-1">
            {roots.map((root) => {
              const children = categories.filter((c) => c.parentId === root.id);
              return (
                <div key={root.id}>
                  <CategoryRow icon={FolderOpen} category={root} isRoot onEdit={() => setDialog({ mode: "edit", cat: root })} onDelete={() => setDel(root)} />
                  {children.map((child) => (
                    <div key={child.id} className="ml-7">
                      <CategoryRow icon={Folder} category={child} onEdit={() => setDialog({ mode: "edit", cat: child })} onDelete={() => setDel(child)} />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <EntityFormDialog<Form>
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        mode={dialog?.mode ?? "create"}
        title="Category"
        schema={Schema}
        fields={fields}
        defaultValues={{
          name: dialog?.cat?.name ?? "",
          parentId: (dialog?.cat?.parentId ?? "") as number | "",
          isActive: dialog?.cat?.isActive ?? true,
        }}
        successMessage={dialog?.mode === "edit" ? { title: "Category updated", description: dialog?.cat?.name } : { title: "Category created" }}
      />

      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Delete "${del?.name}"?`}
        description={del && del.productCount > 0
          ? `This category has ${del.productCount} products. They will be uncategorized.`
          : "This action cannot be undone."}
        variant="danger"
        confirmLabel="Delete category"
        onConfirm={() => { toast.success("Category deleted", { description: del?.name }); setDel(null); }}
      />
    </>
  );
}

function CategoryRow({ icon: Icon, category, isRoot, onEdit, onDelete }: {
  icon: typeof Folder; category: typeof categories[number]; isRoot?: boolean; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 group">
      <Icon className={`size-4 ${isRoot ? "text-brand-yellow" : "text-slate-400"}`} />
      <span className={`text-sm flex-1 ${isRoot ? "font-semibold text-navy-900 dark:text-white" : "text-slate-700 dark:text-slate-200"}`}>
        {category.name}
      </span>
      <Badge variant="muted">{category.productCount} products</Badge>
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${category.name}`}><Edit3 /></Button>
        <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Delete ${category.name}`} className="text-danger"><Trash2 /></Button>
      </div>
    </div>
  );
}
