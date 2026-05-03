"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Lock, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { users, type User } from "@/data/admin";

export default function UsersPage() {
  const [search, setSearch] = React.useState("");

  const filtered = users.filter((u) =>
    !search ||
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.employeeCode.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<User>[] = [
    {
      key: "fullName",
      header: "User",
      sortable: true,
      cell: (u) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={u.initials} size="sm" />
          <div>
            <div className="font-medium text-navy-900 dark:text-white inline-flex items-center gap-2">
              {u.fullName}
              {u.isLocked && <Lock className="size-3 text-danger" />}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
          </div>
        </div>
      ),
    },
    { key: "employeeCode", header: "Emp #", cell: (u) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{u.employeeCode}</span> },
    { key: "phone",        header: "Phone", cell: (u) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{u.phone}</span> },
    {
      key: "roles",
      header: "Roles",
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.map((r) => <Badge key={r} variant="info">{r}</Badge>)}
        </div>
      ),
    },
    {
      key: "branches",
      header: "Branches",
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.branches.map((b) => <Badge key={b} variant="muted">{b}</Badge>)}
        </div>
      ),
    },
    { key: "lastLoginAt", header: "Last Login", cell: (u) => <span className="text-xs text-slate-500 dark:text-slate-400">{u.lastLoginAt}</span> },
    { key: "isActive",    header: "Status",     cell: (u) => u.isActive ? <StatusPill variant="success">Active</StatusPill> : <StatusPill variant="muted">Inactive</StatusPill> },
    { key: "actions",     header: "",           cell: () => <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}><MoreHorizontal /></Button> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Users" }]}
        title="Users"
        subtitle={`${users.length} users · ${users.filter(u => u.isActive).length} active`}
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/admin/users/new">
              <Plus />
              <span>New User</span>
            </Link>
          </Button>
        }
      />

      <FilterBar
        searchPlaceholder="Search by name, email, employee code…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} pageSize={15} />
      </Card>
    </>
  );
}
