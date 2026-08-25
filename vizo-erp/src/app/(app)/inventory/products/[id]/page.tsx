"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  Edit3, Package, Barcode, Image as ImageIcon, TrendingUp, AlertCircle,
  ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, Save, X, Plus, Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SelectNative } from "@/components/ui/select-native";
import { Badge, StatusPill } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /inventory/products/{id}. `stockSpread` is the real per-location balance
   off StockBalance -- the old screen split one total across locations with
   hard-coded percentages, which looked plausible and was invented. */
type StockRow = { locationId: number; locationCode: string; locationName: string; qty: number };

type Product = {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  categoryId: number;
  categoryName: string;
  brandId: number;
  brandName: string;
  packing: number;
  minQty: number;
  maxQty: number;
  openingCost: number;
  costPrice: number;
  salePrice: number;
  taxRatePercent: number;
  hideStock: boolean;
  isActive: boolean;
  imageUrl: string | null;
  createdAt: string;
  barcodes: string[];
  totalStock: number;
  stockSpread: StockRow[];
  status: "active" | "low" | "out";
};

/* GET /inventory/movements?productId= */
type Movement = {
  id: number;
  locationId: number;
  locationName: string;
  movementType: string;
  movementTypeName: string;
  movedAt: string;
  referenceNo: string | null;
  qty: number;
  balanceAfter: number;
  user: string | null;
};
type MovementPage = { total: number; page: number; pageSize: number; items: Movement[] };

type Lookups = {
  categories: { id: number; name: string; parentId: number | null }[];
  brands: { id: number; code: string; name: string }[];
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/** The editable subset — exactly the fields ProductRequest carries. */
type Draft = {
  sku: string; name: string; description: string;
  categoryId: string; brandId: string;
  packing: string; minQty: string; maxQty: string;
  openingCost: string; costPrice: string; salePrice: string; taxRatePercent: string;
  hideStock: boolean; isActive: boolean; imageUrl: string;
  barcodes: string[];
};

function toDraft(p: Product): Draft {
  return {
    sku: p.sku, name: p.name, description: p.description ?? "",
    categoryId: String(p.categoryId), brandId: String(p.brandId),
    packing: String(p.packing), minQty: String(p.minQty), maxQty: String(p.maxQty),
    openingCost: String(p.openingCost), costPrice: String(p.costPrice),
    salePrice: String(p.salePrice), taxRatePercent: String(p.taxRatePercent),
    hideStock: p.hideStock, isActive: p.isActive, imageUrl: p.imageUrl ?? "",
    barcodes: [...p.barcodes],
  };
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);

  const [product, setProduct] = React.useState<Product | null>(null);
  const [movements, setMovements] = React.useState<Movement[]>([]);
  const [lookups, setLookups] = React.useState<Lookups>({ categories: [], brands: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    try {
      const [p, mv, lk] = await Promise.all([
        axios.get<Product>(`${API_BASE_URL}/inventory/products/${id}`, { headers: authHeader() }),
        axios.get<MovementPage>(`${API_BASE_URL}/inventory/movements`, {
          params: { productId: id, pageSize: 100 }, headers: authHeader(),
        }),
        axios.get<Lookups>(`${API_BASE_URL}/inventory/lookups`, { headers: authHeader() }),
      ]);
      setProduct(p.data);
      setMovements(mv.data.items);
      setLookups({ categories: lk.data.categories, brands: lk.data.brands });
      setNotFound(false);
      setError(null);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true);
      else setError(apiMessage(e, "Could not load this product."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  function beginEdit() {
    if (!product) return;
    setDraft(toDraft(product));
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(null);
  }

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function save() {
    if (!draft || !product) return;
    if (!draft.sku.trim() || !draft.name.trim()) {
      toast.error("SKU and name are both required.");
      return;
    }
    setSaving(true);
    try {
      await axios.put(
        `${API_BASE_URL}/inventory/products/${product.id}`,
        {
          sku: draft.sku.trim(),
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          categoryId: Number(draft.categoryId),
          brandId: Number(draft.brandId),
          packing: Number(draft.packing) || 0,
          minQty: Number(draft.minQty) || 0,
          maxQty: Number(draft.maxQty) || 0,
          openingCost: Number(draft.openingCost) || 0,
          costPrice: Number(draft.costPrice) || 0,
          salePrice: Number(draft.salePrice) || 0,
          taxRatePercent: Number(draft.taxRatePercent) || 0,
          hideStock: draft.hideStock,
          isActive: draft.isActive,
          imageUrl: draft.imageUrl.trim() || null,
          barcodes: draft.barcodes.map((b) => b.trim()).filter(Boolean),
        },
        { headers: authHeader() }
      );
      /* Re-read: the server upper-cases the SKU and reconciles the barcode
         rows, so the screen must show what was actually stored. */
      await load();
      setEditing(false);
      setDraft(null);
      toast.success("Product saved");
    } catch (e) {
      toast.error("Could not save the product", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  /* ── loading / not found / error ─────────────────────────────────── */

  if (loading) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Inventory" }, { label: "Products", href: "/inventory/products" }]} title="Loading…" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Product not found"
        description={`No product with id ${id}.`}
        action={<Button variant="accent" asChild><Link href="/inventory/products">Back to Products</Link></Button>}
      />
    );
  }

  if (error || !product) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Inventory" }, { label: "Products", href: "/inventory/products" }]} title="Product" />
        <Card>
          <CardBody className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy-900 dark:text-white">{error}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                The API must be running on {API_BASE_URL}.
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" /> Try again
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  /* ── derived ─────────────────────────────────────────────────────── */

  const margin = product.salePrice > 0
    ? ((product.salePrice - product.costPrice) / product.salePrice) * 100
    : 0;

  const stockColumns: Column<StockRow & { id: number }>[] = [
    { key: "locationName", header: "Location", cell: (r) => <span className="text-sm font-medium text-navy-900 dark:text-white">{r.locationName}</span> },
    { key: "locationCode", header: "Code", cell: (r) => <span className="tabular text-xs text-slate-500 dark:text-slate-400">{r.locationCode}</span> },
    { key: "qty", header: "On Hand", align: "right", cell: (r) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{r.qty}</span> },
    { key: "cost", header: "Avg Cost", align: "right", cell: () => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{formatMoney(product.costPrice)}</span> },
    { key: "value", header: "Value", align: "right", cell: (r) => <span className="tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(r.qty * product.costPrice)}</span> },
  ];

  /* DataTable needs an `id` on every row; stockSpread keys on locationId. */
  const stockRows = product.stockSpread.map((s) => ({ ...s, id: s.locationId }));

  const movementColumns: Column<Movement>[] = [
    { key: "movedAt", header: "Date", cell: (m) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(m.movedAt)}</span> },
    {
      key: "movementType", header: "Type",
      cell: (m) => <Badge variant={m.qty > 0 ? "success" : "danger"}>{m.movementTypeName}</Badge>,
    },
    { key: "referenceNo", header: "Reference", cell: (m) => <span className="tabular text-xs font-medium text-navy-900 dark:text-white">{m.referenceNo ?? "—"}</span> },
    { key: "locationName", header: "Location", cell: (m) => <span className="text-xs text-slate-600 dark:text-slate-300">{m.locationName}</span> },
    {
      key: "qty", header: "Qty", align: "right",
      cell: (m) => (
        <span className={cn("tabular text-sm font-bold inline-flex items-center gap-1", m.qty > 0 ? "text-success" : "text-danger")}>
          {m.qty > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {Math.abs(m.qty)}
        </span>
      ),
    },
    { key: "balanceAfter", header: "Balance", align: "right", cell: (m) => <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{m.balanceAfter}</span> },
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
            <div className="size-12 rounded-xl bg-slate-100 dark:bg-navy-700 flex items-center justify-center overflow-hidden">
              {product.imageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={product.imageUrl} alt={product.name} className="size-full object-cover" />
                : <Package className="size-6 text-slate-400" />}
            </div>
            <div>
              <div>{product.name}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="tabular text-xs text-slate-500 dark:text-slate-400">{product.sku}</span>
                <Badge variant="muted">{product.brandName}</Badge>
                <Badge variant="info">{product.categoryName}</Badge>
                <StatusPill variant={product.status === "out" ? "danger" : product.status === "low" ? "warning" : "success"}>
                  {product.status === "out" ? "Out of Stock" : product.status === "low" ? "Low Stock" : "Active"}
                </StatusPill>
                {!product.isActive && <Badge variant="warning">Inactive</Badge>}
              </div>
            </div>
          </div>
        }
        actions={
          editing ? (
            <>
              <Button variant="accent" size="md" className="gap-1.5" onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button variant="ghost" size="md" className="gap-1.5" onClick={cancelEdit} disabled={saving}>
                <X className="size-4" /> Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="md" className="gap-1.5" onClick={beginEdit}>
                <Edit3 /> Edit
              </Button>
              <Button variant="accent" size="md" asChild>
                <Link href={`/inventory/adjustments/new?productId=${product.id}`}>Adjust Stock</Link>
              </Button>
            </>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Stock</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{product.totalStock}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Reorder at {product.minQty}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Sale Price</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(product.salePrice)}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">+{product.taxRatePercent}% tax</div>
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

      {/* ── EDIT FORM ─────────────────────────────────────────────── */}
      {editing && draft && (
        <Card className="mb-6 border-brand-yellow/40">
          <CardBody>
            <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Edit product</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Fld label="SKU"><Input value={draft.sku} onChange={(e) => setField("sku", e.target.value)} /></Fld>
              <Fld label="Name"><Input value={draft.name} onChange={(e) => setField("name", e.target.value)} /></Fld>
              <Fld label="Description"><Input value={draft.description} onChange={(e) => setField("description", e.target.value)} /></Fld>
              <Fld label="Category">
                <SelectNative value={draft.categoryId} onChange={(e) => setField("categoryId", e.target.value)}>
                  {lookups.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectNative>
              </Fld>
              <Fld label="Brand">
                <SelectNative value={draft.brandId} onChange={(e) => setField("brandId", e.target.value)}>
                  {lookups.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </SelectNative>
              </Fld>
              <Fld label="Packing (units per carton)"><Input type="number" value={draft.packing} onChange={(e) => setField("packing", e.target.value)} /></Fld>
              <Fld label="Reorder level"><Input type="number" value={draft.minQty} onChange={(e) => setField("minQty", e.target.value)} /></Fld>
              <Fld label="Maximum level"><Input type="number" value={draft.maxQty} onChange={(e) => setField("maxQty", e.target.value)} /></Fld>
              <Fld label="Opening cost"><Input type="number" step="0.01" value={draft.openingCost} onChange={(e) => setField("openingCost", e.target.value)} /></Fld>
              <Fld label="Cost price"><Input type="number" step="0.01" value={draft.costPrice} onChange={(e) => setField("costPrice", e.target.value)} /></Fld>
              <Fld label="Sale price"><Input type="number" step="0.01" value={draft.salePrice} onChange={(e) => setField("salePrice", e.target.value)} /></Fld>
              <Fld label="Tax rate %"><Input type="number" step="0.01" value={draft.taxRatePercent} onChange={(e) => setField("taxRatePercent", e.target.value)} /></Fld>
              <Fld label="Image URL"><Input value={draft.imageUrl} onChange={(e) => setField("imageUrl", e.target.value)} placeholder="https://…" /></Fld>
            </div>

            <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
              <label className="flex items-center gap-2.5 text-sm text-navy-900 dark:text-white">
                <Switch checked={draft.isActive} onCheckedChange={(v) => setField("isActive", v)} /> Active
              </label>
              <label className="flex items-center gap-2.5 text-sm text-navy-900 dark:text-white">
                <Switch checked={draft.hideStock} onCheckedChange={(v) => setField("hideStock", v)} /> Hide stock from sales screens
              </label>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
              <Label className="mb-2 inline-block">Barcodes</Label>
              <div className="space-y-2 max-w-md">
                {draft.barcodes.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={b}
                      onChange={(e) => setField("barcodes", draft.barcodes.map((x, j) => (j === i ? e.target.value : x)))}
                      placeholder="EAN-13"
                    />
                    <Button variant="ghost" size="icon" aria-label="Remove barcode"
                      onClick={() => setField("barcodes", draft.barcodes.filter((_, j) => j !== i))}>
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </div>
                ))}
                <Button variant="secondary" size="sm" className="gap-1.5"
                  onClick={() => setField("barcodes", [...draft.barcodes, ""])}>
                  <Plus className="size-4" /> Add barcode
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

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
            {stockRows.length === 0
              ? <CardBody><EmptyState icon={Package} title="No stock anywhere" description="This product has no balance at any location yet." /></CardBody>
              : <DataTable columns={stockColumns} data={stockRows} />}
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card className="p-0 overflow-hidden">
            {movements.length === 0
              ? <CardBody><EmptyState icon={ArrowUpRight} title="No movements" description="Nothing has moved in or out of stock for this product." /></CardBody>
              : <DataTable columns={movementColumns} data={movements} pageSize={10} />}
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Pricing</h3>
              {/* The old screen listed "Wholesale (5%+)" and "Distributor
                  (10%+)" tiers computed from the retail price. There is no
                  price-list table behind them, so they are not shown; the real
                  figures on the product row are. */}
              <div className="space-y-3 max-w-xl">
                <PriceRow label="Cost price" value={formatMoney(product.costPrice)} />
                <PriceRow label="Opening cost" value={formatMoney(product.openingCost)} />
                <PriceRow label="Sale price (excl. tax)" value={formatMoney(product.salePrice)} />
                <PriceRow label={`Tax at ${product.taxRatePercent}%`} value={formatMoney(product.salePrice * (product.taxRatePercent / 100))} />
                <PriceRow label="Sale price (incl. tax)" value={formatMoney(product.salePrice * (1 + product.taxRatePercent / 100))} strong />
                <PriceRow label="Margin per unit" value={`${formatMoney(product.salePrice - product.costPrice)} · ${margin.toFixed(1)}%`} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                Per-customer and tiered price lists are not in the database yet, so no tiers are shown here.
              </p>
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="barcodes">
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Barcodes</h3>
              {product.barcodes.length === 0 ? (
                <EmptyState icon={Barcode} title="No barcodes" description="Use Edit to add one." />
              ) : (
                <div className="space-y-3">
                  {product.barcodes.map((b) => (
                    <div key={b} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-navy-700 rounded-lg">
                      <Barcode className="size-5 text-brand-yellow" />
                      <div className="flex-1">
                        <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">EAN-13</div>
                        <div className="tabular text-base font-bold text-navy-900 dark:text-white">{b}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="secondary" size="md" className="mt-4 gap-1.5" onClick={beginEdit} disabled={editing}>
                <Plus className="size-4" /> Add Barcode
              </Button>
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardBody>
              {product.imageUrl ? (
                <div className="max-w-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.imageUrl} alt={product.name} className="w-full rounded-lg border border-slate-200 dark:border-navy-700" />
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 break-all">{product.imageUrl}</div>
                </div>
              ) : (
                <EmptyState
                  icon={ImageIcon}
                  title="No product image"
                  description="Set an image URL from Edit to show it here and on invoices."
                  action={<Button variant="accent" onClick={beginEdit} disabled={editing}>Edit product</Button>}
                />
              )}
            </CardBody>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 inline-block">{label}</Label>
      {children}
    </div>
  );
}

function PriceRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0 border-slate-100 dark:border-navy-700">
      <div className="text-sm text-slate-600 dark:text-slate-300">{label}</div>
      <div className={cn("tabular", strong ? "text-lg font-bold text-navy-900 dark:text-white" : "text-sm font-semibold text-navy-900 dark:text-white")}>
        {value}
      </div>
    </div>
  );
}
