"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Download, Upload, Phone, Mail, MapPin } from "lucide-react";
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

const TYPE_LABEL: Record<Party["type"], { label: string; variant: "info" | "warning" | "accent" }> = {
  CUSTOMER: { label: "Customer", variant: "info" },
  SUPPLIER: { label: "Supplier", variant: "warning" },
  BOTH:     { label: "Both",     variant: "accent" },
};

const RATING_COLOR: Record<Party["rating"], string> = {
  A: "bg-success-light text-success-dark dark:bg-success/15 dark:text-success-light",
  B: "bg-info-light text-info-dark dark:bg-info/15 dark:text-info-light",
  C: "bg-warning-light text-warning-dark dark:bg-warning/15 dark:text-warning-light",
  D: "bg-danger-light text-danger-dark dark:bg-danger/15 dark:text-danger-light",
};

export default function PartiesPage() {
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<Party["type"] | "ALL">("ALL");

  const filtered = React.useMemo(() => {
    return parties.filter((p) => {
      if (typeFilter !== "ALL" && p.type !== typeFilter && p.type !== "BOTH") return false;
      if (typeFilter === "ALL" && false) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.legalName.toLowerCase().includes(q) ||
          p.partyCode.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.city.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, typeFilter]);

  const columns: Column<Party>[] = [
    {
      key: "partyCode",
      header: "Code",
      sortable: true,
      cell: (p) => (
        <span className="tabular text-xs font-medium text-slate-600 dark:text-slate-400">
          {p.partyCode}
        </span>
      ),
    },
    {
      key: "legalName",
      header: "Party",
      sortable: true,
      cell: (p) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={p.initials} size="sm" />
          <div className="min-w-0">
            <div className="font-medium text-navy-900 dark:text-white">{p.legalName}</div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3" /> {p.phone}
              </span>
              {p.email && (
                <span className="inline-flex items-center gap-1 truncate hidden lg:inline-flex">
                  <Mail className="size-3" /> {p.email}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      cell: (p) => (
        <Badge variant={TYPE_LABEL[p.type].variant}>{TYPE_LABEL[p.type].label}</Badge>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (p) => (
        <span className="text-xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
          {p.category}
        </span>
      ),
    },
    {
      key: "city",
      header: "City",
      sortable: true,
      cell: (p) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <MapPin className="size-3 text-slate-400" />
          {p.city}
        </span>
      ),
    },
    {
      key: "currentBalance",
      header: "Balance",
      sortable: true,
      align: "right",
      cell: (p) => {
        if (p.type === "SUPPLIER") {
          return (
            <span className="tabular text-sm font-semibold text-warning">
              -{formatCompact(p.payableBalance, false)}
            </span>
          );
        }
        const overLimit = p.creditLimit > 0 && p.currentBalance > p.creditLimit;
        return (
          <div className="text-right">
            <div
              className={cn(
                "tabular text-sm font-semibold",
                overLimit ? "text-danger" : "text-navy-900 dark:text-white"
              )}
            >
              {formatCompact(p.currentBalance, false)}
            </div>
            {p.creditLimit > 0 && (
              <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                Limit {formatCompact(p.creditLimit, false)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "rating",
      header: "Rating",
      align: "center",
      cell: (p) => (
        <span
          className={cn(
            "inline-flex items-center justify-center size-7 rounded-md text-xs font-bold",
            RATING_COLOR[p.rating]
          )}
        >
          {p.rating}
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

  /* Quick stats */
  const stats = React.useMemo(() => {
    const customers = parties.filter((p) => p.type === "CUSTOMER" || p.type === "BOTH");
    const suppliers = parties.filter((p) => p.type === "SUPPLIER" || p.type === "BOTH");
    const totalAR = customers.reduce((s, p) => s + p.currentBalance, 0);
    const totalAP = suppliers.reduce((s, p) => s + p.payableBalance, 0);
    return {
      total: parties.length,
      customers: customers.length,
      suppliers: suppliers.length,
      totalAR,
      totalAP,
    };
  }, []);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Parties" }]}
        title="All Parties"
        subtitle="Customers, suppliers and counter-parties across all locationes"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5">
              <Upload />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button variant="secondary" size="md" className="gap-1.5">
              <Download />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/parties/new">
                <Plus />
                <span>New Party</span>
              </Link>
            </Button>
          </>
        }
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Total Parties
          </div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">
            {stats.total}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Customers
          </div>
          <div className="text-2xl tabular font-bold text-info mt-1">{stats.customers}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Total Receivable
          </div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">
            {formatCompact(stats.totalAR)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Total Payable
          </div>
          <div className="text-2xl tabular font-bold text-warning mt-1">
            {formatCompact(stats.totalAP)}
          </div>
        </Card>
      </div>

      {/* Type tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-slate-200 dark:border-navy-700">
        {(
          [
            ["ALL", "All Parties", parties.length],
            ["CUSTOMER", "Customers", parties.filter((p) => p.type === "CUSTOMER" || p.type === "BOTH").length],
            ["SUPPLIER", "Suppliers", parties.filter((p) => p.type === "SUPPLIER" || p.type === "BOTH").length],
            ["BOTH", "Both", parties.filter((p) => p.type === "BOTH").length],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key as Party["type"] | "ALL")}
            className={cn(
              "relative inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition-colors -mb-px outline-none",
              typeFilter === key
                ? "text-navy-900 dark:text-white"
                : "text-slate-500 hover:text-navy-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            {label}
            <Badge variant="muted">{count}</Badge>
            {typeFilter === key && (
              <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-brand-yellow rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      <FilterBar
        searchPlaceholder="Search by name, code, phone, city…"
        searchValue={search}
        onSearchChange={setSearch}
        chips={
          typeFilter !== "ALL"
            ? [{ key: "type", label: "Type", value: TYPE_LABEL[typeFilter].label }]
            : []
        }
        onRemoveChip={() => setTypeFilter("ALL")}
        onClearAll={() => {
          setTypeFilter("ALL");
          setSearch("");
        }}
      />

      <Card className="p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          rowHref={(p) => `/parties/${p.id}`}
          pageSize={10}
        />
      </Card>
    </>
  );
}
