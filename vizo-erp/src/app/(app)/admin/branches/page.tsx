"use client";

import Link from "next/link";
import { Plus, Building2, MapPin, Phone, Edit3, Star } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { branchesAdmin } from "@/data/admin";
import { formatCompact } from "@/lib/format";

export default function BranchesPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Branches" }]}
        title="Branches"
        subtitle="Legal/accounting units across cities"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/admin/branches/new">
              <Plus />
              <span>New Branch</span>
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branchesAdmin.map((b) => (
          <Card key={b.id} className="cursor-pointer hover:border-brand-yellow/40 transition-colors group">
            <CardBody>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className="size-12 rounded-xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow group-hover:bg-brand-yellow group-hover:text-navy-900 transition-colors">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-navy-900 dark:text-white inline-flex items-center gap-2">
                      {b.name}
                      {b.isHeadOffice && <Star className="size-3.5 text-brand-yellow fill-brand-yellow" />}
                    </h3>
                    <Badge variant="muted" className="mt-1 tabular">{b.code}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                  <Edit3 />
                </Button>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-4">
                <div className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3 text-slate-400" />
                  {b.address}
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <Phone className="size-3 text-slate-400" />
                  {b.phone}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-navy-700">
                <div>
                  <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Warehouses</div>
                  <div className="text-base font-bold text-navy-900 dark:text-white mt-0.5">{b.warehouseCount}</div>
                </div>
                <div>
                  <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Users</div>
                  <div className="text-base font-bold text-navy-900 dark:text-white mt-0.5">{b.userCount}</div>
                </div>
                <div>
                  <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">MTD Revenue</div>
                  <div className="text-base font-bold text-navy-900 dark:text-white mt-0.5">{formatCompact(b.monthlyRevenue, false)}</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-navy-700 flex items-center justify-between">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Mgr: <span className="font-semibold text-navy-900 dark:text-white">{b.manager}</span>
                </div>
                {b.isActive ? <StatusPill variant="success">Active</StatusPill> : <StatusPill variant="muted">Inactive</StatusPill>}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
