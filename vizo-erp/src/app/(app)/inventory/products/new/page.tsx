"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useForm, useWatch } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import {
  Save, ArrowLeft, Image as ImageIcon, Loader2, AlertCircle, RefreshCw, X, Wand2, ScanLine, CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { PricingFields, EMPTY_PRICING, pricingProblem, type PricingDraft } from "@/components/inventory/pricing-fields";
import { BarcodeFields, cleanBarcodes } from "@/components/inventory/barcode-fields";
import { cn } from "@/lib/utils";

/* GET /inventory/lookups -> the lists this form needs, plus which brand to
   start on (VIZO -- everything this company sells carries it). */
type Lookups = {
  categories: { id: number; name: string; parentId: number | null }[];
  brands: { id: number; code: string; name: string }[];
  defaultBrandId: number | null;
};

/* POST /inventory/products/sku-preview */
type Preview = {
  sku: string | null;
  source: "generated" | "barcode" | "incomplete";
  barcodeSkuTaken: boolean | null;
  parts: { word: string; model: string | null; category: string; color: string | null };
  duplicate: { id: number; name: string; sku: string } | null;
};

/* THE SKU IS NOT ON THIS FORM ANY MORE, and neither are the prices.

   The SKU is worked out by the server from the name and the category (see
   backend Services/SkuGenerator.cs); the box on screen is a preview of it.
   The prices are five linked boxes that live in their own component,
   because each one rewrites the others as it is typed in -- a job a
   per-field validator cannot do. Both are checked on Save. */
const Schema = z.object({
  name: z.string().trim().min(2, "Name required").max(200, "Max 200 characters"),
  description: z.string().max(500, "Max 500 chars").optional().or(z.literal("")),
  categoryId: z.coerce.number({ message: "Pick a category" }).positive("Pick a category"),
  brandId: z.coerce.number({ message: "Pick a brand" }).positive("Pick a brand"),
  packing: z.coerce.number().min(1, "At least 1 piece per packet"),
  taxRatePercent: z.coerce.number().min(0).max(100, "Cannot exceed 100%"),
  minQty: z.coerce.number().min(0, "Cannot be negative"),
  maxQty: z.coerce.number().min(0, "Cannot be negative"),
  hideStock: z.boolean(),
  isActive: z.boolean(),
  imageUrl: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof Schema>;

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function NewProductPage() {
  const router = useRouter();

  const [lookups, setLookups] = React.useState<Lookups>({ categories: [], brands: [], defaultBrandId: null });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [pricing, setPricing] = React.useState<PricingDraft>(EMPTY_PRICING);
  const [pricingError, setPricingError] = React.useState<string | null>(null);
  const [barcodes, setBarcodes] = React.useState<string[]>([""]);

  /* The preview, tagged with the inputs it was worked out for, so a stale one
     is recognised as stale without an extra piece of state to keep in step. */
  const [previewFor, setPreviewFor] = React.useState<{ key: string; data: Preview | null } | null>(null);

  const form = useForm<FormValues>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      name: "", description: "",
      categoryId: 0 as unknown as number,
      brandId: 0 as unknown as number,
      packing: 1,
      taxRatePercent: 0,
      minQty: 0, maxQty: 0,
      hideStock: false, isActive: true,
      imageUrl: "",
    },
  });

  const [name, categoryId, brandId, imageUrl] = useWatch({
    control: form.control, name: ["name", "categoryId", "brandId", "imageUrl"],
  });

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/inventory/lookups`, { headers: authHeader() });
      setLookups({
        categories: res.data.categories,
        brands: res.data.brands,
        defaultBrandId: res.data.defaultBrandId ?? null,
      });
      /* VIZO, pre-selected. The person can still change it. */
      if (res.data.defaultBrandId && !form.getValues("brandId"))
        form.setValue("brandId", res.data.defaultBrandId);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load categories and brands."));
    } finally {
      setLoading(false);
    }
  }, [form]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  /* ── the live SKU and the duplicate check ──────────────────────────────
     Asked for 400 ms after the person stops typing, so a name typed at speed
     is one request rather than twenty. Each answer is filed under the inputs
     it was asked for, and only the one matching what is on screen now counts. */
  const codes = React.useMemo(() => cleanBarcodes(barcodes), [barcodes]);
  const trimmedName = (name ?? "").trim();
  const wantsPreview = trimmedName.length >= 2 || codes.length > 0;
  const previewKey = JSON.stringify([trimmedName, Number(categoryId) || 0, Number(brandId) || 0, codes]);

  React.useEffect(() => {
    if (!wantsPreview) return;
    let live = true;
    const t = window.setTimeout(async () => {
      let data: Preview | null = null;
      try {
        const res = await axios.post<Preview>(
          `${API_BASE_URL}/inventory/products/sku-preview`,
          { name: trimmedName, categoryId: Number(categoryId) || null, brandId: Number(brandId) || null, barcodes: codes },
          { headers: authHeader() });
        data = res.data;
      } catch {
        data = null;
      }
      if (live) setPreviewFor({ key: previewKey, data });
    }, 400);
    return () => { live = false; window.clearTimeout(t); };
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- previewKey stands in for its parts */
  }, [previewKey, wantsPreview]);

  /* The latest answer is kept on screen while the next is fetched -- a SKU
     that blinks to empty on every keystroke is harder to read than one that
     updates. The spinner says it is being refreshed. */
  const preview = wantsPreview ? previewFor?.data ?? null : null;
  const previewing = wantsPreview && previewFor?.key !== previewKey;

  const duplicate = preview?.duplicate ?? null;
  const skuFromBarcode = preview?.source === "barcode" ? preview.sku : null;

  /** POST /Upload/image -> Cloudinary, then keep the secure URL on the form. */
  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await axios.post<{ url: string }>(
        `${API_BASE_URL}/Upload/image`,
        body,
        { params: { folder: "products" }, headers: authHeader() }
      );
      form.setValue("imageUrl", res.data.url, { shouldDirty: true });
      toast.success("Image uploaded");
    } catch (e) {
      toast.error("Could not upload the image", { description: apiMessage(e, "Please try again.") });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSubmit(d: FormValues) {
    const priceIssue = pricingProblem(pricing);
    setPricingError(priceIssue);
    if (priceIssue) {
      toast.error("Check the prices", { description: priceIssue });
      return;
    }
    if (duplicate) {
      form.setError("name", { message: `Already in the catalogue as ${duplicate.sku}.` });
      toast.error("This product already exists", {
        description: `"${duplicate.name}" is ${duplicate.sku}. Change the name — a colour or model — to add a new one.`,
      });
      return;
    }
    if (skuFromBarcode && preview?.barcodeSkuTaken) {
      toast.error("That SKU is already in use", {
        description: `${skuFromBarcode}, read from the barcode, belongs to another product.`,
      });
      return;
    }

    try {
      const res = await axios.post<{ id: number; sku: string; message: string }>(
        `${API_BASE_URL}/inventory/products`,
        {
          /* Only a SKU that came off a barcode is sent. Otherwise the server
             generates it, inside the same transaction as the insert, so two
             people saving at once cannot both take the same serial. */
          sku: skuFromBarcode,
          name: d.name.trim(),
          description: d.description?.trim() || null,
          categoryId: d.categoryId,
          brandId: d.brandId,
          packing: d.packing,
          minQty: d.minQty,
          maxQty: d.maxQty,
          costPrice: parseFloat(pricing.cost),
          dutyPrice: parseFloat(pricing.duty || "0") || 0,
          salePrice: parseFloat(pricing.sale),
          taxRatePercent: d.taxRatePercent,
          hideStock: d.hideStock,
          isActive: d.isActive,
          imageUrl: d.imageUrl?.trim() || null,
          barcodes: codes,
        },
        { headers: authHeader() }
      );
      toast.success(`Saved as ${res.data.sku}`, { description: res.data.message });
      router.push(`/inventory/products/${res.data.id}`);
    } catch (e) {
      const message = apiMessage(e, "Could not create the product.");
      if (/catalogue|already/i.test(message) && !/barcode|sku/i.test(message)) form.setError("name", { message });
      toast.error("Product not created", { description: message });
    }
  }

  const skuShown = preview?.sku ?? "";

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Products", href: "/inventory/products" }, { label: "New Product" }]}
        title="New Product"
        subtitle="Add a product to the VIZO catalogue. The SKU is made for you."
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/inventory/products"><ArrowLeft /> Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)}
              disabled={form.formState.isSubmitting || loading || !!duplicate}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save /> Save Product</>}
            </Button>
          </>
        }
      />

      {error && (
        <Card className="mb-6">
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
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Basic Info</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel required>Product Name</FormLabel>
                        <FormControl>
                          <Input placeholder="VIZO Titan T9 Wireless Earbuds - Black" {...field}
                            aria-invalid={duplicate ? true : undefined} />
                        </FormControl>
                        {duplicate ? (
                          <p className="text-xs font-medium text-danger">
                            Already in the catalogue as{" "}
                            <Link href={`/inventory/products/${duplicate.id}`} className="underline tabular">{duplicate.sku}</Link>.
                            {" "}Change the name — a different colour or model — to add it as a separate product.
                          </p>
                        ) : (
                          <FormDescription>
                            Put the colour after a dash — &ldquo;… Earbuds - Black&rdquo; — and it becomes part of the SKU.
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* The SKU: a preview, never typed. */}
                    <div className="sm:col-span-2">
                      <Label className="mb-1.5 flex items-center gap-2">
                        SKU <span className="text-danger">*</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-navy-700 dark:text-slate-300">
                          Auto-generated
                        </span>
                        {skuFromBarcode && (
                          <span className="inline-flex items-center gap-1 rounded bg-brand-yellow/20 px-1.5 py-0.5 text-2xs font-semibold text-navy-900 dark:text-brand-yellow">
                            <ScanLine className="size-3" /> From barcode
                          </span>
                        )}
                      </Label>
                      <div className="relative">
                        <Wand2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-yellow" />
                        <Input
                          readOnly
                          tabIndex={-1}
                          value={skuShown}
                          placeholder="Type a name and pick a category"
                          className="pl-9 pr-9 tabular font-semibold bg-slate-50 dark:bg-navy-900 cursor-default"
                          aria-label="SKU, generated automatically"
                        />
                        {previewing && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-slate-400" />}
                        {!previewing && skuShown && !duplicate && (
                          <CheckCircle2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-success" />
                        )}
                      </div>
                      <p className="mt-1 text-2xs text-slate-500 dark:text-slate-400">
                        {skuFromBarcode
                          ? preview?.barcodeSkuTaken
                            ? <span className="text-danger">This SKU, read from the barcode, already belongs to another product.</span>
                            : "Read from a scanned barcode — the box's own code wins over a generated one."
                          : preview?.sku
                            ? <>VZ · name <b>{preview.parts.word}</b>{preview.parts.model && <> · model <b>{preview.parts.model}</b></>} · category <b>{preview.parts.category}</b>{preview.parts.color && <> · colour <b>{preview.parts.color}</b></>} · serial. You don&rsquo;t need to type it; the final number is fixed on Save.</>
                            : "Made from the name, the category and the colour. You don't need to type it."}
                      </p>
                    </div>

                    <FormField control={form.control} name="categoryId" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Category</FormLabel>
                        <FormControl>
                          {loading ? <Skeleton className="h-10" /> : (
                            <SelectNative {...field}>
                              <option value="">— Select —</option>
                              {lookups.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </SelectNative>
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="brandId" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Brand</FormLabel>
                        <FormControl>
                          {loading ? <Skeleton className="h-10" /> : (
                            <SelectNative {...field}>
                              <option value="">— Select —</option>
                              {lookups.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </SelectNative>
                          )}
                        </FormControl>
                        <FormDescription>VIZO unless you change it</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="packing" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Packing</FormLabel>
                        <FormControl><Input type="number" min={1} {...field} /></FormControl>
                        <FormDescription>Pieces in one packet or carton</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="taxRatePercent" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Rate (%)</FormLabel>
                        <FormControl><Input type="number" step="0.01" min={0} max={100} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea rows={3} placeholder="Brief product description (visible on invoices)" {...field} /></FormControl>
                        <FormDescription>{(field.value?.length ?? 0)}/500 characters</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Pricing</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
                    Type the margin as an amount <em>or</em> a percentage — the other one and the sale price follow.
                  </p>
                  <PricingFields value={pricing} onChange={(p) => { setPricing(p); setPricingError(null); }} error={pricingError} />
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Barcodes</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Scan with the camera or type them. Any number of codes can point at this product.
                    </p>
                  </div>
                  <div className="max-w-md">
                    <BarcodeFields value={barcodes} onChange={setBarcodes} />
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Stock Settings</h3>
                  <div className="space-y-4">
                    <FormField control={form.control} name="minQty" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum quantity</FormLabel>
                        <FormControl><Input type="number" min={0} {...field} /></FormControl>
                        <FormDescription>Warn when stock reaches this</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="maxQty" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum quantity</FormLabel>
                        <FormControl><Input type="number" min={0} {...field} /></FormControl>
                        <FormDescription>Flag as overstocked above this. 0 = no limit</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="hideStock" render={({ field }) => (
                      <FormItem className="flex items-start gap-3">
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" /></FormControl>
                        <div>
                          <Label>Hide stock from sales reps</Label>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Reps see only &quot;available&quot; flag, not exact qty</p>
                        </div>
                      </FormItem>
                    )} />
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Product Image</h3>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadImage(f);
                    }}
                  />
                  {imageUrl ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="Product" className="w-full aspect-square object-cover rounded-lg border border-slate-200 dark:border-navy-700" />
                      <Button
                        type="button" variant="ghost" size="icon"
                        className="absolute top-2 right-2 bg-white/90 dark:bg-navy-800/90"
                        aria-label="Remove image"
                        onClick={() => form.setValue("imageUrl", "", { shouldDirty: true })}
                      >
                        <X className="size-4 text-danger" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className={cn(
                        "w-full aspect-square border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg",
                        "flex flex-col items-center justify-center text-center p-4 hover:border-brand-yellow/50 transition-colors disabled:opacity-60"
                      )}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="size-8 text-brand-yellow mb-2 animate-spin" />
                          <div className="text-sm font-medium text-navy-900 dark:text-white">Uploading…</div>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="size-8 text-slate-300 dark:text-slate-600 mb-2" />
                          <div className="text-sm font-medium text-navy-900 dark:text-white">Click to choose an image</div>
                          <div className="text-2xs text-slate-400 mt-2">PNG, JPG, WEBP or GIF up to 5MB</div>
                        </>
                      )}
                    </button>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <FormField control={form.control} name="isActive" render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <Label>Active</Label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Inactive products won&apos;t appear in order screens</p>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </CardBody>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}
