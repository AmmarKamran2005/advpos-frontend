"use client";

import { Plus, Folder, FolderOpen, Edit3 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { categories } from "@/data/products";

export default function CategoriesPage() {
  const roots = categories.filter((c) => c.parentId === null);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Categories" }]}
        title="Categories"
        subtitle="Organize products in a hierarchical tree"
        actions={
          <Button variant="accent" size="md" className="gap-1.5">
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
                  <CategoryRow icon={FolderOpen} category={root} isRoot />
                  {children.map((child) => (
                    <div key={child.id} className="ml-7">
                      <CategoryRow icon={Folder} category={child} />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </>
  );
}

function CategoryRow({
  icon: Icon,
  category,
  isRoot,
}: {
  icon: typeof Folder;
  category: { name: string; productCount: number; isActive: boolean };
  isRoot?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 group">
      <Icon className={`size-4 ${isRoot ? "text-brand-yellow" : "text-slate-400"}`} />
      <span className={`text-sm flex-1 ${isRoot ? "font-semibold text-navy-900 dark:text-white" : "text-slate-700 dark:text-slate-200"}`}>
        {category.name}
      </span>
      <Badge variant="muted">{category.productCount} products</Badge>
      <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
        <Edit3 />
      </Button>
    </div>
  );
}
