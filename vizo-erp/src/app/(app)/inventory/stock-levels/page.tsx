"use client";

import * as React from "react";
import Link from "next/link";
import { Filter, Download, AlertCircle, AlertTriangle, Package } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { products, brands } from "@/data/products";
import { warehouses } from "@/data/admin";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

type StockRow = {
  id: number;
  productId: number;
  sku: string;
  name: string;
  brand: string;
  totalStock: number;
  reorderLevel: number;
  status: "active" | "low" | "out" | "inactive";
  costPrice: number;
  warehouses: { id: number; code: string; qty: number }[];
};

export default function StockLevelsPage() {
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "low" | "out">("all");

  const rows: StockRow[] = products.map((p) => {
    const brand = brands.find((b) => b.id === p.brandId)?.name ?? "—";
    const splits = warehouses.filter((w) => w.code !== "KHI-WH-02").map((w, i) => ({
      id: w.id,
      code: w.code,
      qty: Math.floor(p.totalStock * [0.5, 0.3, 0.2][i % 3]),
    }));
    return {
      id: p.id,
      productId: p.id,
      sku: p.sku,
      name: p.name,
      brand,
      totalStock: p.totalStock,
      reorderLevel: p.reorderLevel,
      status: p.status,
      costPrice: p.costPrice,
      warehouses: splits,
    };
  });

  const filtered = rows.filter((r) => {
    if (filter === "low" && r.status !== "low") return false;
    if (filter === "out" && r.status !== "out") return false;
    if (search) {
      const q = search.toLowerCase();
      return r.sku.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
    }
    return true;
  });

  const totalValue = rows.reduce((s, r) => s + r.totalStock * r.costPrice, 0);
  const lowCount = rows.filter((r) => r.status === "low").length;
  const outCount = rows.filter((r) => r.status === "out").length;

  const columns: Column<StockRow>[] = [
    {
      key: "name",
      header: "Product",
      sortable: true,
      cell: (r) => (
        <div>
          <Link href={`/inventory/products/${r.productId}`} className="text-sm font-medium text-navy-900 dark:text-white hover:text-brand-yellow-700 dark:hover:text-brand-yellow">
            {r.name}
          </Link>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular">{r.sku} · {r.brand}</div>
        </div>
      ),
    },
    ...warehouses.filter((w) => w.code !== "KHI-WH-02").map<Column<StockRow>>((wh) => ({
      key: `wh-${wh.code}`,
      header: wh.code,
      align: "right" as const,
      cell: (r) => {
        const v = r.warehouses.find((w) => w.id === wh.id)?.qty ?? 0;
        return <span className={cn("tabular text-sm", v === 0 ? "text-slate-300" : "text-navy-900 dark:text-white font-medium")}>{v}</span>;
      },
    })),
    {
      key: "totalStock",
      header: "Total",
      align: "right",
      sortable: true,
      cell: (r) => (
        <span className={cn("tabular text-sm font-bold",
          r.status === "out" ? "text-danger" : r.status === "low" ? "text-warning" : "text-navy-900 dark:text-white"
        )}>
          {r.totalStock}
        </span>
      ),
    },
    {
      key: "reorderLevel",
      header: "RP",
      align: "right",
      cell: (r) => <span className="tabular text-xs text-slate-500 dark:text-slate-400">{r.reorderLevel}</span>,
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      cell: (r) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{formatMoney(r.totalStock * r.costPrice)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => {
        if (r.status === "out") return <Badge variant="danger">Out</Badge>;
        if (r.status === "low") return <Badge variant="warning">Low</Badge>;
        return <Badge variant="success">OK</Badge>;
      },
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Stock Levels" }]}
        title="Stock Levels"
        subtitle="Real-time inventory across all warehouses"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5">
              <Filter />
              <span className="hidden sm:inline">Filters</span>
            </Button>
            <Button variant="secondary" size="md" className="gap-1.5">
              <Download />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total SKUs</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Inventory Value</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatCompact(totalValue)}</div>
        </Card>
        <Card className={cn("p-4 cursor-pointer transition-colors", filter === "low" && "ring-2 ring-warning")} onClick={() => setFilter(filter === "low" ? "all" : "low")}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-warning-dark dark:text-warning-light">Low Stock</div>
              <div className="text-2xl tabular font-bold text-warning mt-1">{lowCount}</div>
            </div>
            <AlertTriangle className="size-5 text-warning" />
          </div>
        </Card>
        <Card className={cn("p-4 cursor-pointer transition-colors", filter === "out" && "ring-2 ring-danger")} onClick={() => setFilter(filter === "out" ? "all" : "out")}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-danger-dark dark:text-danger-light">Out of Stock</div>
              <div className="text-2xl tabular font-bold text-danger mt-1">{outCount}</div>
            </div>
            <AlertCircle className="size-5 text-danger" />
          </div>
        </Card>
      </div>

      <FilterBar
        searchPlaceholder="Search products by SKU or name…"
        searchValue={search}
        onSearchChange={setSearch}
        chips={filter !== "all" ? [{ key: "filter", label: "Status", value: filter === "low" ? "Low Stock" : "Out of Stock" }] : []}
        onRemoveChip={() => setFilter("all")}
        onClearAll={() => { setFilter("all"); setSearch(""); }}
      />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} pageSize={15} />
      </Card>
    </>
  );
}
