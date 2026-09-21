"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  Edit3, Package, Barcode, Image as ImageIcon, TrendingUp, AlertCircle,
  RefreshCw, Loader2, Save, X, Plus, History as HistoryIcon, Download, ArrowRight, Wand2, ScanLine,
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
import { ProductImage } from "@/components/products/product-image";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { downloadXlsx, exportError } from "@/lib/export";
import { PricingFields, pricingDraftFrom, pricingProblem, type PricingDraft } from "@/components/inventory/pricing-fields";
import { BarcodeFields, cleanBarcodes } from "@/components/inventory/barcode-fields";
import { ProductMovements } from "@/components/inventory/product-movements";
import {
  HistoryTimeline, HistorySummaryTiles, type HistoryEvent, type HistorySummary,
} from "@/components/inventory/product-history";

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
  costPrice: number;
  dutyPrice: number;
  marginPrice: number;
  /** Margin as a percentage of landed cost (cost + duty). */
  marginPercent: number;
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

/** The editable subset — exactly the fields ProductRequest carries.
 *  The SKU is shown, not typed: it is printed on labels and invoices already,
 *  so it only changes when a scanned barcode carries one of our own SKUs. */
type Draft = {
  sku: string; name: string; description: string;
  categoryId: string; brandId: string;
  packing: string; minQty: string; maxQty: string;
  taxRatePercent: string;
  pricing: PricingDraft;
  hideStock: boolean; isActive: boolean; imageUrl: string;
  barcodes: string[];
};

function toDraft(p: Product): Draft {
  return {
    sku: p.sku, name: p.name, description: p.description ?? "",
    categoryId: String(p.categoryId), brandId: String(p.brandId),
    packing: String(p.packing), minQty: String(p.minQty), maxQty: String(p.maxQty),
    taxRatePercent: String(p.taxRatePercent),
    pricing: pricingDraftFrom(p),
    hideStock: p.hideStock, isActive: p.isActive, imageUrl: p.imageUrl ?? "",
    barcodes: p.barcodes.length ? [...p.barcodes] : [""],
  };
}

/* useSearchParams needs a suspense boundary above it, so the page is only the
   boundary and the screen lives one level down. */
export default function ProductDetailPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-64" />}>
      <ProductDetail />
    </React.Suspense>
  );
}

const TABS = ["stock", "movements", "history", "pricing", "barcodes", "images"] as const;

function ProductDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const searchParams = useSearchParams();
  const initialTab = TABS.find((t) => t === searchParams.get("tab")) ?? "stock";

  const [product, setProduct] = React.useState<Product | null>(null);
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
      /* The movements and the history load themselves, when their tab is
         opened -- most visits to a product never look at either. */
      const [p, lk] = await Promise.all([
        axios.get<Product>(`${API_BASE_URL}/inventory/products/${id}`, { headers: authHeader() }),
        axios.get<Lookups>(`${API_BASE_URL}/inventory/lookups`, { headers: authHeader() }),
      ]);
      setProduct(p.data);
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
    if (!draft.name.trim()) {
      toast.error("The product needs a name.");
      return;
    }
    const priceIssue = pricingProblem(draft.pricing);
    if (priceIssue) {
      toast.error("Check the prices", { description: priceIssue });
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
          costPrice: Number(draft.pricing.cost) || 0,
          dutyPrice: Number(draft.pricing.duty) || 0,
          salePrice: Number(draft.pricing.sale) || 0,
          taxRatePercent: Number(draft.taxRatePercent) || 0,
          hideStock: draft.hideStock,
          isActive: draft.isActive,
          imageUrl: draft.imageUrl.trim() || null,
          barcodes: cleanBarcodes(draft.barcodes),
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

  /* On LANDED cost -- cost plus duty -- the same base the pricing form uses,
     so the figure here is the figure somebody typed. */
  const landed = product.costPrice + product.dutyPrice;
  const margin = product.marginPercent;

  const stockColumns: Column<StockRow & { id: number }>[] = [
    { key: "locationName", header: "Location", cell: (r) => <span className="text-sm font-medium text-navy-900 dark:text-white">{r.locationName}</span> },
    { key: "locationCode", header: "Code", cell: (r) => <span className="tabular text-xs text-slate-500 dark:text-slate-400">{r.locationCode}</span> },
    { key: "qty", header: "On Hand", align: "right", cell: (r) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{r.qty}</span> },
    { key: "cost", header: "Landed Cost", align: "right", cell: () => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{formatMoney(landed)}</span> },
    { key: "value", header: "Value", align: "right", cell: (r) => <span className="tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(r.qty * landed)}</span> },
  ];

  /* DataTable needs an `id` on every row; stockSpread keys on locationId. */
  const stockRows = product.stockSpread.map((s) => ({ ...s, id: s.locationId }));

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
            <ProductImage url={product.imageUrl} name={product.name} size="xl" />
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
              <Button variant="secondary" size="md" className="gap-1.5" asChild>
                <Link href={`/inventory/products/${product.id}/history`}><HistoryIcon /> <span className="hidden sm:inline">History</span></Link>
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
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Landed Cost</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(landed)}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular">
            {formatMoney(product.costPrice)} + {formatMoney(product.dutyPrice)} duty
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Margin</div>
          <div className={cn("text-2xl tabular font-bold mt-1", margin <= 0 ? "text-danger" : margin < 15 ? "text-warning" : "text-success")}>
            {margin.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 inline-flex items-center gap-1">
            <TrendingUp className="size-3" /> {formatMoney(product.marginPrice)} per unit
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Stock Value</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(product.totalStock * landed)}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">at landed cost</div>
        </Card>
      </div>

      {/* ── EDIT FORM ─────────────────────────────────────────────── */}
      {editing && draft && (
        <Card className="mb-6 border-brand-yellow/40">
          <CardBody>
            <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Edit product</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Fld label="SKU (auto-generated, kept)">
                <div className="relative">
                  <Wand2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-yellow" />
                  <Input readOnly tabIndex={-1} value={draft.sku} className="pl-9 tabular font-semibold bg-slate-50 dark:bg-navy-900 cursor-default" />
                </div>
                {draft.sku !== product.sku && (
                  <p className="mt-1 inline-flex items-center gap-1 text-2xs font-medium text-navy-900 dark:text-brand-yellow">
                    <ScanLine className="size-3" /> Changes to the SKU read from a scanned barcode
                  </p>
                )}
              </Fld>
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
              <Fld label="Tax rate %"><Input type="number" step="0.01" value={draft.taxRatePercent} onChange={(e) => setField("taxRatePercent", e.target.value)} /></Fld>
              <Fld label="Image URL"><Input value={draft.imageUrl} onChange={(e) => setField("imageUrl", e.target.value)} placeholder="https://…" /></Fld>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
              <Label className="mb-3 inline-block">Pricing</Label>
              <PricingFields value={draft.pricing} onChange={(pr) => setField("pricing", pr)} />
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
              <div className="max-w-md">
                <BarcodeFields
                  value={draft.barcodes}
                  onChange={(b) => setField("barcodes", b)}
                  productId={product.id}
                  onSkuFound={(sku) => setField("sku", sku)}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="overflow-x-auto scrollbar-thin flex-nowrap">
          <TabsTrigger value="stock">Stock by Location</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
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
          {/* Cards, one per movement and ONE per transfer; each opens its own
              page, and that page opens the complete transfer. */}
          <ProductMovements productId={product.id} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryPreview productId={product.id} />
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
                <PriceRow label="Duty" value={formatMoney(product.dutyPrice)} />
                <PriceRow label="Landed cost" value={formatMoney(landed)} strong />
                <PriceRow label={`Margin (${margin.toFixed(1)}% of landed cost)`} value={formatMoney(product.marginPrice)} />
                <PriceRow label="Sale price (excl. tax)" value={formatMoney(product.salePrice)} strong />
                <PriceRow label={`Tax at ${product.taxRatePercent}%`} value={formatMoney(product.salePrice * (product.taxRatePercent / 100))} />
                <PriceRow label="Sale price (incl. tax)" value={formatMoney(product.salePrice * (1 + product.taxRatePercent / 100))} strong />
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
                <div className="max-w-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.imageUrl} alt={product.name} className="w-full max-h-[70vh] object-contain bg-white rounded-lg border border-slate-200 dark:border-navy-700" />
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

/* ─────────────────────────── the History tab ─────────────────────────── */

type HistoryPreviewData = { summary: HistorySummary; total: number; items: HistoryEvent[] };

/**
 * The headline figures and the last few events; the whole story is one click
 * further on, on its own page, where a phone has the room to read it.
 */
function HistoryPreview({ productId }: { productId: number }) {
  const [data, setData] = React.useState<HistoryPreviewData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    axios.get<HistoryPreviewData>(`${API_BASE_URL}/inventory/products/${productId}/history`, {
      params: { pageSize: 6 }, headers: authHeader(),
    })
      .then((r) => { if (live) setData(r.data); })
      .catch((e) => { if (live) setError(apiMessage(e, "Could not load the history.")); });
    return () => { live = false; };
  }, [productId]);

  async function exportAll() {
    setExporting(true);
    try {
      await downloadXlsx(`inventory/products/${productId}/history/export`, {}, `product-${productId}-history.xlsx`);
      toast.success("History exported");
    } catch (e) {
      toast.error("Could not export", { description: await exportError(e) });
    } finally {
      setExporting(false);
    }
  }

  if (error) return <Card className="p-4 text-sm text-danger">{error}</Card>;
  if (!data) return <Skeleton className="h-72" />;

  return (
    <div className="space-y-4">
      <HistorySummaryTiles s={data.summary} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-navy-900 dark:text-white">Latest</h3>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={exportAll} disabled={exporting}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download />} Export Excel
          </Button>
          <Button variant="accent" size="sm" className="gap-1.5" asChild>
            <Link href={`/inventory/products/${productId}/history`}>Full history ({data.total}) <ArrowRight /></Link>
          </Button>
        </div>
      </div>
      <HistoryTimeline events={data.items} />
    </div>
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
