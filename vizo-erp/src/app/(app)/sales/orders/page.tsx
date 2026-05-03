"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Download, ShoppingCart, AlertTriangle, CheckCircle2, Truck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { orders, getStatusVariant, type Order, type OrderStatus } from "@/data/sales";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function OrdersPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "ALL">("ALL");

  const filtered = React.useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return o.orderNo.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [search, statusFilter]);

  const stats = React.useMemo(() => ({
    total: orders.length,
    creditHold: orders.filter((o) => o.status === "CREDIT_HOLD").length,
    inProcess: orders.filter((o) => ["CONFIRMED", "PROCESSING", "PACKED"].includes(o.status)).length,
    dispatched: orders.filter((o) => ["DISPATCHED", "INVOICED", "DELIVERED"].includes(o.status)).length,
    totalValue: orders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.total, 0),
  }), []);

  const columns: Column<Order>[] = [
    {
      key: "orderNo",
      header: "Order #",
      sortable: true,
      cell: (o) => (
        <div>
          <div className="tabular text-sm font-medium text-navy-900 dark:text-white">{o.orderNo}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(o.orderDate)}</div>
        </div>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
      sortable: true,
      cell: (o) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={o.customerInitials} size="sm" />
          <div className="min-w-0">
            <div className="font-medium text-navy-900 dark:text-white truncate">{o.customerName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{o.customerType} · {o.branch}</div>
          </div>
        </div>
      ),
    },
    {
      key: "salesPerson",
      header: "Sales Rep",
      cell: (o) => <span className="text-xs text-slate-600 dark:text-slate-300">{o.salesPerson}</span>,
    },
    {
      key: "itemCount",
      header: "Items",
      align: "right",
      cell: (o) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{o.itemCount}</span>,
    },
    {
      key: "total",
      header: "Amount",
      sortable: true,
      align: "right",
      cell: (o) => (
        <div className="text-right">
          <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(o.total)}</div>
          <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">{o.paymentMethod}</div>
        </div>
      ),
    },
    {
      key: "paymentStatus",
      header: "Payment",
      cell: (o) => (
        <Badge variant={o.paymentStatus === "PAID" ? "success" : o.paymentStatus === "PARTIAL" ? "warning" : "muted"}>
          {o.paymentStatus}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (o) => (
        <StatusPill variant={getStatusVariant(o.status)}>{o.status.replace("_", " ")}</StatusPill>
      ),
    },
  ];

  const STATUS_TABS: { key: OrderStatus | "ALL"; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "DRAFT", label: "Draft" },
    { key: "CREDIT_HOLD", label: "Credit Hold" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "PACKED", label: "Packed" },
    { key: "DISPATCHED", label: "Dispatched" },
    { key: "DELIVERED", label: "Delivered" },
    { key: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Orders" }]}
        title="Sales Orders"
        subtitle="Manage customer orders end-to-end"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5">
              <Download />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/sales/orders/new">
                <Plus />
                <span>New Order</span>
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Orders</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{stats.total}</div>
            </div>
            <ShoppingCart className="size-5 text-slate-400" />
          </div>
        </Card>
        <Card className="p-4 bg-warning/5 border-warning/20 cursor-pointer" onClick={() => setStatusFilter("CREDIT_HOLD")}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-warning-dark dark:text-warning-light">Credit Holds</div>
              <div className="text-2xl tabular font-bold text-warning mt-1">{stats.creditHold}</div>
            </div>
            <AlertTriangle className="size-5 text-warning" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">In Process</div>
              <div className="text-2xl tabular font-bold text-info mt-1">{stats.inProcess}</div>
            </div>
            <CheckCircle2 className="size-5 text-info" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Dispatched</div>
              <div className="text-2xl tabular font-bold text-success mt-1">{stats.dispatched}</div>
            </div>
            <Truck className="size-5 text-success" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Value</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatCompact(stats.totalValue)}</div>
        </Card>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-slate-200 dark:border-navy-700 overflow-x-auto scrollbar-thin">
        {STATUS_TABS.map((t) => {
          const count = t.key === "ALL" ? orders.length : orders.filter((o) => o.status === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={cn(
                "relative inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition-colors -mb-px outline-none whitespace-nowrap",
                statusFilter === t.key
                  ? "text-navy-900 dark:text-white"
                  : "text-slate-500 hover:text-navy-900 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              {t.label}
              <Badge variant="muted">{count}</Badge>
              {statusFilter === t.key && <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-brand-yellow rounded-t-full" />}
            </button>
          );
        })}
      </div>

      <FilterBar
        searchPlaceholder="Search by order number or customer…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} pageSize={15} rowHref={(o) => `/sales/orders/${o.id}`} />
      </Card>
    </>
  );
}
