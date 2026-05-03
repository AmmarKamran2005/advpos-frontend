"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Phone, MapPin, Globe } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { parties, type Party } from "@/data/parties";
import { formatCompact, formatDate } from "@/lib/format";

export default function SuppliersPage() {
  const [search, setSearch] = React.useState("");
  const suppliers = parties.filter((p) => p.type === "SUPPLIER" || p.type === "BOTH");

  const filtered = React.useMemo(() => {
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(
      (p) =>
        p.legalName.toLowerCase().includes(q) ||
        p.partyCode.toLowerCase().includes(q) ||
        p.phone.includes(q)
    );
  }, [suppliers, search]);

  const totalAP = suppliers.reduce((s, p) => s + p.payableBalance, 0);

  const columns: Column<Party>[] = [
    {
      key: "legalName",
      header: "Supplier",
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
          {p.email && (
            <div className="inline-flex items-center gap-1.5 truncate max-w-[200px]">
              <Globe className="size-3 text-slate-400" />
              <span className="truncate">{p.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "city",
      header: "Location",
      cell: (p) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <MapPin className="size-3 text-slate-400" />
          {p.city}
        </span>
      ),
    },
    {
      key: "payableBalance",
      header: "Payable",
      align: "right",
      sortable: true,
      cell: (p) => (
        <span className="text-sm tabular font-semibold text-warning">
          {formatCompact(p.payableBalance, false)}
        </span>
      ),
    },
    {
      key: "lastSupplyAt",
      header: "Last Supply",
      sortable: true,
      cell: (p) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {p.lastSupplyAt ? formatDate(p.lastSupplyAt) : "—"}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (p) =>
        p.isActive ? (
          <StatusPill variant="success">Active</StatusPill>
        ) : (
          <StatusPill variant="muted">Inactive</StatusPill>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Parties", href: "/parties" }, { label: "Suppliers" }]}
        title="Suppliers"
        subtitle={`${suppliers.length} suppliers — track POs, GRNs and payables`}
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/parties/new?type=supplier">
              <Plus />
              <span>New Supplier</span>
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Active Suppliers
          </div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">
            {suppliers.filter((p) => p.isActive).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Total Payable
          </div>
          <div className="text-2xl tabular font-bold text-warning mt-1">
            {formatCompact(totalAP)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Open POs
          </div>
          <div className="text-2xl tabular font-bold text-info mt-1">8</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Pending GRNs
          </div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">2</div>
        </Card>
      </div>

      <FilterBar
        searchPlaceholder="Search suppliers by name, code, phone…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} rowHref={(p) => `/parties/${p.id}`} />
      </Card>
    </>
  );
}
