"use client";

import { Plus, Shield, Users, Lock, Edit3 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { roles } from "@/data/admin";

export default function RolesPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Roles & Permissions" }]}
        title="Roles & Permissions"
        subtitle="Define what each user role can access"
        actions={
          <Button variant="accent" size="md" className="gap-1.5">
            <Plus />
            <span>New Role</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((r) => (
          <Card key={r.id} className="cursor-pointer hover:border-brand-yellow/40 transition-colors group">
            <CardBody>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="size-12 rounded-xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow group-hover:bg-brand-yellow group-hover:text-navy-900 transition-colors">
                  <Shield className="size-5" />
                </div>
                {r.isSystem ? (
                  <Badge variant="accent" className="gap-1">
                    <Lock className="size-3" />
                    System
                  </Badge>
                ) : (
                  <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                    <Edit3 />
                  </Button>
                )}
              </div>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">{r.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{r.description}</p>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
                <div>
                  <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Users</div>
                  <div className="text-base font-bold text-navy-900 dark:text-white mt-1 inline-flex items-center gap-1.5">
                    <Users className="size-3.5 text-slate-400" />
                    {r.userCount}
                  </div>
                </div>
                <div>
                  <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Permissions</div>
                  <div className="text-base font-bold text-navy-900 dark:text-white mt-1">{r.permissionCount}</div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
