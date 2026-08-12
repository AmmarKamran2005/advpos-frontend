"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Phone, MapPin, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { parties, type Party } from "@/data/parties";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function CustomersPage() {
  const [search, setSearch] = React.useState("");
  const customers = parties.filter((p) => p.type === "CUSTOMER" || p.type === "BOTH");

  const filtered = React.useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (p) =>
        p.legalName.toLowerCase().includes(q) ||
        p.partyCode.toLowerCase().includes(q) ||
        p.phone.includes(q)
    );
  }, [customers, search]);

  const totalAR = customers.reduce((s, p) => s + p.currentBalance, 0);
  const overLimit = customers.filter((p) => p.creditLimit > 0 && p.currentBalance > p.creditLimit);

  const columns: Column<Party>[] = [
    {
      key: "legalName",
      header: "Customer",
      sortable: true,
      cell: (p) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={p.initials} size="sm" />
          <div>
            <div className="font-medium text-navy-900 dark:text-white">{p.legalName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {p.partyCode} · {p.category}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Contact",
      cell: (p) => (
        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <div className="inline-flex items-center gap-1.5">
            <Phone className="size-3 text-slate-400" />
            {p.phone}
          </div>
          <div className="inline-flex items-center gap-1.5">
            <MapPin className="size-3 text-slate-400" />
            {p.city}
          </div>
        </div>
      ),
    },
    {
      key: "creditLimit",
      header: "Credit",
      align: "right",
      sortable: true,
      cell: (p) => (
        <div className="text-right">
          <div className="text-sm tabular font-semibold text-navy-900 dark:text-white">
            {formatCompact(p.creditLimit, false)}
          </div>
          <div className="text-2xs text-slate-500 dark:text-slate-400">NET {p.creditDays}</div>
        </div>
      ),
    },
    {
      key: "currentBalance",
      header: "Outstanding",
      align: "right",
      sortable: true,
      cell: (p) => {
        const overLimit = p.creditLimit > 0 && p.currentBalance > p.creditLimit;
        const utilPct = p.creditLimit > 0 ? (p.currentBalance / p.creditLimit) * 100 : 0;
        return (
          <div className="text-right">
            <div
              className={cn(
                "text-sm tabular font-semibold",
                overLimit ? "text-danger" : "text-navy-900 dark:text-white"
              )}
            >
              {formatCompact(p.currentBalance, false)}
            </div>
            {p.creditLimit > 0 && (
              <div className="flex items-center justify-end gap-1.5 mt-1">
                <div className="w-12 h-1 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      overLimit ? "bg-danger" : utilPct > 80 ? "bg-warning" : "bg-success"
                    )}
                    style={{ width: `${Math.min(utilPct, 100)}%` }}
                  />
                </div>
                <span className="text-2xs text-slate-500 dark:text-slate-400 tabular">
                  {Math.round(utilPct)}%
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "salesPerson",
      header: "Sales Rep",
      cell: (p) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {p.salesPerson ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => {
        if (p.creditHoldPolicy === "BLOCK" && p.currentBalance > p.creditLimit) {
          return <StatusPill variant="danger">Blocked</StatusPill>;
        }
        return p.isActive ? (
          <StatusPill variant="success">Active</StatusPill>
        ) : (
          <StatusPill variant="muted">Inactive</StatusPill>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Parties", href: "/parties" }, { label: "Customers" }]}
        title="Customers"
        subtitle={`${customers.length} customers across all locationes`}
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/parties/new?type=customer">
              <Plus />
              <span>New Customer</span>
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Active Customers
          </div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">
            {customers.filter((p) => p.isActive).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Total Receivable
          </div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">
            {formatCompact(totalAR)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Over Credit Limit
          </div>
          <div className="text-2xl tabular font-bold text-danger mt-1">{overLimit.length}</div>
        </Card>
        <Card className="p-4 bg-warning/5 border-warning/20">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-warning-dark dark:text-warning-light">
                Action Required
              </div>
              <div className="text-2xl tabular font-bold text-warning-dark dark:text-warning-light mt-1">
                3
              </div>
              <div className="text-xs text-warning-dark/70 dark:text-warning-light/70 mt-1">
                Orders on credit hold
              </div>
            </div>
            <AlertTriangle className="size-5 text-warning" />
          </div>
        </Card>
      </div>

      <FilterBar
        searchPlaceholder="Search customers by name, code, phone…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} rowHref={(p) => `/parties/${p.id}`} />
      </Card>
    </>
  );
}
