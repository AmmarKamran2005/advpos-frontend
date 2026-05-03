"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Wallet, Landmark, Smartphone, Banknote, ArrowDownToLine, ArrowUpFromLine, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { vouchers, type Voucher, type VoucherType } from "@/data/accounting";
import { formatMoney, formatDate, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<VoucherType, typeof Wallet> = {
  CR: ArrowDownToLine,
  CP: ArrowUpFromLine,
  BR: Landmark,
  BP: Landmark,
  WR: Smartphone,
  WP: Smartphone,
  JV: FileText,
};

const TYPE_COLOR: Record<VoucherType, string> = {
  CR: "bg-success/10 text-success",
  CP: "bg-danger/10 text-danger",
  BR: "bg-info/10 text-info",
  BP: "bg-warning/10 text-warning",
  WR: "bg-brand-yellow/10 text-brand-yellow",
  WP: "bg-brand-yellow/10 text-brand-yellow",
  JV: "bg-slate-100 text-slate-600 dark:bg-navy-700 dark:text-slate-300",
};

export default function VouchersPage() {
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<VoucherType | "ALL">("ALL");

  const filtered = React.useMemo(() => {
    return vouchers.filter((v) => {
      if (typeFilter !== "ALL" && v.type !== typeFilter) return false;
      if (search && !v.voucherNo.toLowerCase().includes(search.toLowerCase()) && !v.partyName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, typeFilter]);

  const columns: Column<Voucher>[] = [
    { key: "voucherNo", header: "Voucher #", cell: (v) => (
        <div className="flex items-center gap-2">
          <div className={cn("size-7 rounded-md flex items-center justify-center", TYPE_COLOR[v.type])}>
            {React.createElement(TYPE_ICON[v.type], { className: "size-3.5" })}
          </div>
          <div>
            <div className="tabular text-sm font-medium text-navy-900 dark:text-white">{v.voucherNo}</div>
            <div className="text-2xs text-slate-500 dark:text-slate-400">{v.typeName}</div>
          </div>
        </div>
      )
    },
    { key: "date",         header: "Date",          cell: (v) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(v.date)}</span> },
    { key: "partyName",    header: "Party",         cell: (v) => (
        <div>
          <div className="text-sm font-medium text-navy-900 dark:text-white">{v.partyName}</div>
          <div className="text-2xs text-slate-500 dark:text-slate-400">{v.partyType}</div>
        </div>
      )
    },
    { key: "paymentMethod", header: "Method",       cell: (v) => (
        <div>
          <Badge variant="muted">{v.paymentMethod}</Badge>
          {v.paymentProvider && <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">{v.paymentProvider}</div>}
        </div>
      )
    },
    { key: "reference",    header: "Reference",     cell: (v) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{v.reference}</span> },
    { key: "narration",    header: "Narration",     cell: (v) => <span className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">{v.narration}</span> },
    { key: "amount",       header: "Amount",        align: "right", cell: (v) => (
        <span className={cn("tabular text-sm font-bold",
          ["CR", "BR", "WR"].includes(v.type) ? "text-success" : ["CP", "BP", "WP"].includes(v.type) ? "text-danger" : "text-navy-900 dark:text-white"
        )}>
          {["CR", "BR", "WR"].includes(v.type) ? "+" : ["CP", "BP", "WP"].includes(v.type) ? "-" : ""}{formatMoney(v.amount)}
        </span>
      )
    },
    { key: "status",       header: "Status",        cell: (v) => (
        <StatusPill variant={v.status === "POSTED" ? "success" : v.status === "RECONCILED" ? "info" : v.status === "CANCELLED" ? "danger" : "muted"}>
          {v.status}
        </StatusPill>
      )
    },
  ];

  const TYPES: { key: VoucherType | "ALL"; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "CR", label: "Cash Receipt" },
    { key: "CP", label: "Cash Payment" },
    { key: "BR", label: "Bank Receipt" },
    { key: "BP", label: "Bank Payment" },
    { key: "WR", label: "Wallet Receipt" },
    { key: "WP", label: "Wallet Payment" },
    { key: "JV", label: "Journal" },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Vouchers" }]}
        title="Vouchers"
        subtitle="Cash, bank, mobile wallet & journal vouchers"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/accounting/vouchers/new"><Plus /><span>New Voucher</span></Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Receipts (Today)</div>
              <div className="text-2xl tabular font-bold text-success mt-1">{formatCompact(157400)}</div>
            </div>
            <ArrowDownToLine className="size-5 text-success" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Payments (Today)</div>
              <div className="text-2xl tabular font-bold text-danger mt-1">{formatCompact(320000)}</div>
            </div>
            <ArrowUpFromLine className="size-5 text-danger" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Wallet Receipts</div>
              <div className="text-2xl tabular font-bold text-brand-yellow mt-1">{formatCompact(37000)}</div>
            </div>
            <Wallet className="size-5 text-brand-yellow" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Pending Reconciliation</div>
          <div className="text-2xl tabular font-bold text-warning mt-1">3</div>
        </Card>
      </div>

      {/* Type tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-slate-200 dark:border-navy-700 overflow-x-auto scrollbar-thin">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setTypeFilter(t.key)}
            className={cn(
              "relative inline-flex items-center px-3.5 py-2.5 text-sm font-medium transition-colors -mb-px outline-none whitespace-nowrap",
              typeFilter === t.key
                ? "text-navy-900 dark:text-white"
                : "text-slate-500 hover:text-navy-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            {t.label}
            {typeFilter === t.key && <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-brand-yellow rounded-t-full" />}
          </button>
        ))}
      </div>

      <FilterBar searchPlaceholder="Search vouchers…" searchValue={search} onSearchChange={setSearch} />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} />
      </Card>
    </>
  );
}
