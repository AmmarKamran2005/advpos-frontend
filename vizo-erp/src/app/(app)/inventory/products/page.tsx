"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Download, Upload, LayoutGrid, List, Barcode, Package } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { products, brands, categories, type Product } from "@/data/products";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_PILL: Record<Product["status"], { label: string; variant: "success" | "warning" | "danger" | "muted" }> = {
  active:   { label: "Active",       variant: "success" },
  low:      { label: "Low Stock",    variant: "warning" },
  out:      { label: "Out of Stock", variant: "danger"  },
  inactive: { label: "Inactive",     variant: "muted"   },
};

export default function ProductsPage() {
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"table" | "grid">("table");

  const filtered = React.useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcodes.some((b) => b.includes(q))
    );
  }, [search]);

  const stats = React.useMemo(
    () => ({
      total: products.length,
      active: products.filter((p) => p.status === "active").length,
      low: products.filter((p) => p.status === "low").length,
      out: products.filter((p) => p.status === "out").length,
      totalValue: products.reduce((s, p) => s + p.totalStock * p.costPrice, 0),
    }),
    []
  );

  const columns: Column<Product>[] = [
    {
      key: "sku",
      header: "SKU",
      cell: (p) => (
        <span className="tabular text-xs font-medium text-slate-600 dark:text-slate-400">{p.sku}</span>
      ),
      sortable: true,
    },
    {
      key: "name",
      header: "Product",
      sortable: true,
      cell: (p) => (
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-lg bg-slate-100 dark:bg-navy-700 flex items-center justify-center flex-shrink-0">
            <Package className="size-4 text-slate-400" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-navy-900 dark:text-white truncate">{p.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 inline-flex items-center gap-2">
              <Barcode className="size-3" />
              <span className="tabular">{p.barcodes[0]}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (p) => {
        const cat = categories.find((c) => c.id === p.categoryId);
        const brand = brands.find((b) => b.id === p.brandId);
        return (
          <div>
            <div className="text-xs font-medium text-navy-900 dark:text-white">{cat?.name}</div>
            <div className="text-2xs text-slate-500 dark:text-slate-400">{brand?.name}</div>
          </div>
        );
      },
    },
    {
      key: "salePrice",
      header: "Sale Price",
      align: "right",
      sortable: true,
      cell: (p) => (
        <div className="text-right">
          <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">
            {formatMoney(p.salePrice)}
          </div>
          <div className="text-2xs text-slate-500 dark:text-slate-400">
            Cost {formatMoney(p.costPrice)}
          </div>
        </div>
      ),
    },
    {
      key: "totalStock",
      header: "Stock",
      align: "right",
      sortable: true,
      cell: (p) => (
        <div className="text-right">
          <div
            className={cn(
              "tabular text-sm font-semibold",
              p.status === "out" ? "text-danger" : p.status === "low" ? "text-warning" : "text-navy-900 dark:text-white"
            )}
          >
            {p.totalStock}
          </div>
          <div className="text-2xs text-slate-500 dark:text-slate-400">RP {p.minQty}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => <StatusPill variant={STATUS_PILL[p.status].variant}>{STATUS_PILL[p.status].label}</StatusPill>,
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Products" }]}
        title="Products"
        subtitle={`${products.length} products in catalog · VIZO mobile accessories`}
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5">
              <Upload />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
            <Button variant="secondary" size="md" className="gap-1.5">
              <Download />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/inventory/products/new">
                <Plus />
                <span>New Product</span>
              </Link>
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Products</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Active</div>
          <div className="text-2xl tabular font-bold text-success mt-1">{stats.active}</div>
        </Card>
        <Card className="p-4 bg-warning/5 border-warning/20">
          <div className="text-2xs uppercase font-semibold tracking-wider text-warning-dark dark:text-warning-light">Low Stock</div>
          <div className="text-2xl tabular font-bold text-warning mt-1">{stats.low}</div>
        </Card>
        <Card className="p-4 bg-danger/5 border-danger/20">
          <div className="text-2xs uppercase font-semibold tracking-wider text-danger-dark dark:text-danger-light">Out of Stock</div>
          <div className="text-2xl tabular font-bold text-danger mt-1">{stats.out}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Inventory Value</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatCompact(stats.totalValue)}</div>
        </Card>
      </div>

      <FilterBar
        searchPlaceholder="Search by SKU, name, or barcode…"
        searchValue={search}
        onSearchChange={setSearch}
        extraActions={
          <div className="flex items-center bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-lg p-0.5">
            <button
              onClick={() => setView("table")}
              className={cn("p-1.5 rounded-md transition-colors",
                view === "table"
                  ? "bg-navy-900 text-brand-yellow dark:bg-navy-700 dark:text-brand-yellow"
                  : "text-slate-500 hover:text-navy-900 dark:hover:text-white"
              )}
              title="Table view"
            >
              <List className="size-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={cn("p-1.5 rounded-md transition-colors",
                view === "grid"
                  ? "bg-navy-900 text-brand-yellow dark:bg-navy-700 dark:text-brand-yellow"
                  : "text-slate-500 hover:text-navy-900 dark:hover:text-white"
              )}
              title="Grid view"
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>
        }
      />

      {view === "table" ? (
        <Card className="p-0 overflow-hidden">
          <DataTable columns={columns} data={filtered} rowHref={(p) => `/inventory/products/${p.id}`} />
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((p) => (
            <Link key={p.id} href={`/inventory/products/${p.id}`}>
              <Card className="cursor-pointer hover:border-brand-yellow/40 transition-colors h-full">
                <div className="aspect-square bg-slate-50 dark:bg-navy-700 rounded-t-xl flex items-center justify-center">
                  <Package className="size-12 text-slate-300 dark:text-navy-600" />
                </div>
                <div className="p-3">
                  <Badge variant="muted" className="text-2xs mb-1.5">
                    {brands.find((b) => b.id === p.brandId)?.name}
                  </Badge>
                  <div className="text-sm font-medium text-navy-900 dark:text-white line-clamp-2 leading-snug">{p.name}</div>
                  <div className="text-2xs text-slate-500 dark:text-slate-400 mt-1 tabular">{p.sku}</div>
                  <div className="flex items-end justify-between mt-3">
                    <div className="tabular font-bold text-navy-900 dark:text-white">{formatMoney(p.salePrice)}</div>
                    <StatusPill variant={STATUS_PILL[p.status].variant}>{p.totalStock}</StatusPill>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
