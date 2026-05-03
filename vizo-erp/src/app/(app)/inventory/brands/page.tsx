"use client";

import { Plus, Tag, Edit3, Package } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, StatusPill } from "@/components/ui/badge";
import { brands } from "@/data/products";

export default function BrandsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Brands" }]}
        title="Brands"
        subtitle="VIZO product lines"
        actions={
          <Button variant="accent" size="md" className="gap-1.5">
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
                <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                  <Edit3 />
                </Button>
              </div>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">{b.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{b.description}</p>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
                <Badge variant="muted" className="gap-1">
                  <Package className="size-3" />
                  {b.productCount} products
                </Badge>
                {b.isActive ? <StatusPill variant="success">Active</StatusPill> : <StatusPill variant="muted">Inactive</StatusPill>}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
