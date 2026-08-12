"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Edit3,
  MoreHorizontal,
  Package,
  Barcode,
  Image as ImageIcon,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { getProduct, getCategory, getBrand } from "@/data/products";
import { activeLocations } from "@/data/settings";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const product = getProduct(id);

  if (!product) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Product not found"
        action={
          <Button variant="accent" asChild>
            <Link href="/inventory/products">Back to Products</Link>
          </Button>
        }
      />
    );
  }

  const category = getCategory(product.categoryId);
  const brand = getBrand(product.brandId);
  const margin = ((product.salePrice - product.costPrice) / product.salePrice) * 100;

  /* Stock per location (mock split) */
  const stockByWh = activeLocations()
    .filter((w) => w.code !== "LOC-01")
    .map((w, i) => ({
      id: w.id,
      location: w.name,
      qty: Math.floor(product.totalStock * [0.5, 0.3, 0.2][i % 3]),
      reserved: Math.floor(product.totalStock * [0.05, 0.03, 0.02][i % 3]),
      available: 0,
      cost: product.costPrice,
    }))
    .map((r) => ({ ...r, available: r.qty - r.reserved }));

  /* Mock recent movements */
  const movements = [
    { id: 1, date: "2026-04-30", type: "SALE",         qty: -12, ref: "ORD-26-0142", location: "LOC-01", balance: product.totalStock },
    { id: 2, date: "2026-04-29", type: "PURCHASE",     qty: 240, ref: "GRN-26-0089", location: "LOC-01", balance: product.totalStock + 12 },
    { id: 3, date: "2026-04-28", type: "SALE",         qty: -24, ref: "ORD-26-0088", location: "LOC-03", balance: product.totalStock - 228 },
    { id: 4, date: "2026-04-25", type: "TRANSFER_OUT", qty: -50, ref: "TRF-26-0012", location: "LOC-01", balance: product.totalStock - 204 },
    { id: 5, date: "2026-04-25", type: "TRANSFER_IN",  qty: 50,  ref: "TRF-26-0012", location: "LOC-03", balance: product.totalStock - 154 },
  ];

  const stockColumns: Column<(typeof stockByWh)[number]>[] = [
    { key: "location", header: "Location", cell: (r) => <span className="text-sm font-medium text-navy-900 dark:text-white">{r.location}</span> },
    { key: "qty",       header: "On Hand",   align: "right", cell: (r) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{r.qty}</span> },
    { key: "reserved",  header: "Reserved",  align: "right", cell: (r) => <span className="tabular text-sm text-warning">{r.reserved}</span> },
    { key: "available", header: "Available", align: "right", cell: (r) => <span className="tabular text-sm font-semibold text-success">{r.available}</span> },
    { key: "cost",      header: "Avg Cost",  align: "right", cell: (r) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{formatMoney(r.cost)}</span> },
    { key: "value",     header: "Value",     align: "right", cell: (r) => <span className="tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(r.qty * r.cost)}</span> },
  ];

  const movementColumns: Column<(typeof movements)[number]>[] = [
    { key: "date",      header: "Date",      cell: (m) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(m.date)}</span> },
    { key: "type",      header: "Type",      cell: (m) => {
        const v = m.qty > 0 ? "success" : "danger";
        return <Badge variant={v}>{m.type}</Badge>;
      }
    },
    { key: "ref",       header: "Reference", cell: (m) => <span className="tabular text-xs font-medium text-navy-900 dark:text-white">{m.ref}</span> },
    { key: "location", header: "Location", cell: (m) => <span className="text-xs text-slate-600 dark:text-slate-300">{m.location}</span> },
    { key: "qty",       header: "Qty",       align: "right", cell: (m) => (
        <span className={cn("tabular text-sm font-bold inline-flex items-center gap-1",
          m.qty > 0 ? "text-success" : "text-danger"
        )}>
          {m.qty > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {Math.abs(m.qty)}
        </span>
      )
    },
    { key: "balance",   header: "Balance",   align: "right", cell: (m) => <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{m.balance}</span> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Inventory" },
          { label: "Products", href: "/inventory/products" },
          { label: product.name },
        ]}
        title={
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-slate-100 dark:bg-navy-700 flex items-center justify-center">
              <Package className="size-6 text-slate-400" />
            </div>
            <div>
              <div>{product.name}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="tabular text-xs text-slate-500 dark:text-slate-400">{product.sku}</span>
                <Badge variant="muted">{brand?.name}</Badge>
                <Badge variant="info">{category?.name}</Badge>
                <StatusPill variant={product.status === "out" ? "danger" : product.status === "low" ? "warning" : "success"}>
                  {product.status === "out" ? "Out of Stock" : product.status === "low" ? "Low Stock" : "Active"}
                </StatusPill>
              </div>
            </div>
          </div>
        }
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5" asChild>
              <Link href={`/inventory/products/new?id=${product.id}`}>
                <Edit3 />
                Edit
              </Link>
            </Button>
            <Button variant="accent" size="md" asChild>
              <Link href={`/inventory/adjustments/new?productId=${product.id}`}>
                Adjust Stock
              </Link>
            </Button>
            <Button variant="ghost" size="icon" aria-label="More">
              <MoreHorizontal />
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Stock</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{product.totalStock}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">RP {product.minQty}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Sale Price</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(product.salePrice)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Avg Cost</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(product.costPrice)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Margin</div>
          <div className="text-2xl tabular font-bold text-success mt-1">{margin.toFixed(1)}%</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 inline-flex items-center gap-1">
            <TrendingUp className="size-3" /> {formatMoney(product.salePrice - product.costPrice)} per unit
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Stock Value</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(product.totalStock * product.costPrice)}</div>
        </Card>
      </div>

      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="overflow-x-auto scrollbar-thin flex-nowrap">
          <TabsTrigger value="stock">Stock by Location</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="barcodes">Barcodes</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card className="p-0 overflow-hidden">
            <DataTable columns={stockColumns} data={stockByWh} />
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card className="p-0 overflow-hidden">
            <DataTable columns={movementColumns} data={movements} pageSize={10} />
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Price Lists</h3>
              <div className="space-y-3">
                {[
                  { name: "Default Retail", price: product.salePrice },
                  { name: "Wholesale (5%+)",   price: Math.round(product.salePrice * 0.92) },
                  { name: "Distributor (10%+)",price: Math.round(product.salePrice * 0.85) },
                ].map((pl) => (
                  <div key={pl.name} className="flex items-center justify-between py-3 border-b last:border-0 border-slate-100 dark:border-navy-700">
                    <div>
                      <div className="text-sm font-medium text-navy-900 dark:text-white">{pl.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Margin: {(((pl.price - product.costPrice) / pl.price) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-lg tabular font-bold text-navy-900 dark:text-white">
                      {formatMoney(pl.price)}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="barcodes">
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Barcodes</h3>
              <div className="space-y-3">
                {product.barcodes.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-navy-700 rounded-lg">
                    <Barcode className="size-5 text-brand-yellow" />
                    <div className="flex-1">
                      <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">EAN-13</div>
                      <div className="tabular text-base font-bold text-navy-900 dark:text-white">{b}</div>
                    </div>
                    <Button variant="ghost" size="sm">Print</Button>
                  </div>
                ))}
              </div>
              <Button variant="secondary" size="md" className="mt-4">+ Add Barcode</Button>
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardBody>
              <EmptyState
                icon={ImageIcon}
                title="No product images"
                description="Upload product photos to make them appear in invoices and the catalog."
                action={<Button variant="accent">Upload Images</Button>}
              />
            </CardBody>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
