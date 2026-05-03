"use client";

import { Plus, Building2, Edit3, Package, MapPin } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, StatusPill } from "@/components/ui/badge";
import { warehouses, branchesAdmin } from "@/data/admin";
import { formatCompact } from "@/lib/format";

export default function WarehousesPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Warehouses" }]}
        title="Warehouses"
        subtitle="Storage locations across all branches"
        actions={
          <Button variant="accent" size="md" className="gap-1.5">
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
                  <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                    <Edit3 />
                  </Button>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 mb-4">
                  <MapPin className="size-3 text-slate-400" />
                  {w.city}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-navy-700">
                  <div>
                    <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Products</div>
                    <div className="text-lg tabular font-bold text-navy-900 dark:text-white mt-1 inline-flex items-center gap-1.5">
                      <Package className="size-3.5 text-slate-400" />
                      {w.productCount}
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
    </>
  );
}
