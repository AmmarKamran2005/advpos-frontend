"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useForm, useFieldArray } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { Save, ArrowLeft, Plus, Trash2, Image as ImageIcon, Loader2, AlertCircle, RefreshCw, X } from "lucide-react";
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
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /inventory/lookups -> the only two lists this form needs. */
type Lookups = {
  categories: { id: number; name: string; parentId: number | null }[];
  brands: { id: number; code: string; name: string }[];
};

/* A barcode row in the database is (ProductId, Barcode) and nothing else. The
   old form also collected a symbology and a pack quantity; neither has a
   column, so both were discarded on save. Only the code is asked for now. */
const Schema = z.object({
  sku: z.string()
    .min(3, "SKU must be at least 3 characters")
    .max(50, "Max 50 characters")
    .regex(/^[A-Z0-9-]+$/, "Use only uppercase letters, numbers and hyphens"),
  name: z.string().min(2, "Name required").max(200, "Max 200 characters"),
  description: z.string().max(500, "Max 500 chars").optional().or(z.literal("")),
  categoryId: z.coerce.number({ message: "Pick a category" }).positive("Pick a category"),
  brandId:    z.coerce.number({ message: "Pick a brand" }).positive("Pick a brand"),
  packing:    z.coerce.number().min(1, "At least 1 piece per packet"),
  taxRatePercent: z.coerce.number().min(0).max(100, "Cannot exceed 100%"),

  openingCost: z.coerce.number().min(0, "Cannot be negative"),
  costPrice: z.coerce.number().positive("Cost price must be positive"),
  salePrice: z.coerce.number().positive("Sale price must be positive"),

  minQty: z.coerce.number().min(0, "Cannot be negative"),
  maxQty: z.coerce.number().min(0, "Cannot be negative"),
  hideStock: z.boolean(),
  isActive:  z.boolean(),
  imageUrl:  z.string().optional().or(z.literal("")),

  barcodes: z.array(z.object({
    code: z.string().min(8, "Min 8 digits").max(20, "Max 20"),
  })).optional(),
}).refine((d) => d.salePrice > d.costPrice, { message: "Sale price must be higher than cost price", path: ["salePrice"] });

type FormValues = z.infer<typeof Schema>;

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function NewProductPage() {
  const router = useRouter();

  const [lookups, setLookups] = React.useState<Lookups>({ categories: [], brands: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      sku: "", name: "", description: "",
      categoryId: 0 as unknown as number,
      brandId: 0 as unknown as number,
      packing: 1,
      taxRatePercent: 18,
      openingCost: 0,
      costPrice: 0 as unknown as number,
      salePrice: 0 as unknown as number,
      minQty: 0, maxQty: 0,
      hideStock: false, isActive: true,
      imageUrl: "",
      barcodes: [{ code: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "barcodes" });
  const cost = form.watch("costPrice");
  const sale = form.watch("salePrice");
  const imageUrl = form.watch("imageUrl");
  const margin = sale > 0 ? ((sale - cost) / sale) * 100 : 0;

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/inventory/lookups`, { headers: authHeader() });
      setLookups({ categories: res.data.categories, brands: res.data.brands });
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load categories and brands."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

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
    try {
      const res = await axios.post<{ id: number; message: string }>(
        `${API_BASE_URL}/inventory/products`,
        {
          sku: d.sku.trim(),
          name: d.name.trim(),
          description: d.description?.trim() || null,
          categoryId: d.categoryId,
          brandId: d.brandId,
          packing: d.packing,
          minQty: d.minQty,
          maxQty: d.maxQty,
          openingCost: d.openingCost,
          costPrice: d.costPrice,
          salePrice: d.salePrice,
          taxRatePercent: d.taxRatePercent,
          hideStock: d.hideStock,
          isActive: d.isActive,
          imageUrl: d.imageUrl?.trim() || null,
          barcodes: (d.barcodes ?? []).map((b) => b.code.trim()).filter(Boolean),
        },
        { headers: authHeader() }
      );
      toast.success("Product created", { description: res.data.message });
      /* Straight to the new record rather than the list, so the person who
         just typed it can see what was actually stored. */
      router.push(`/inventory/products/${res.data.id}`);
    } catch (e) {
      const message = apiMessage(e, "Could not create the product.");
      /* A duplicate SKU is the common failure and the server names it. */
      if (/sku/i.test(message)) form.setError("sku", { message });
      toast.error("Product not created", { description: message });
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Products", href: "/inventory/products" }, { label: "New Product" }]}
        title="New Product"
        subtitle="Add a new SKU to the VIZO catalog"
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/inventory/products"><ArrowLeft /> Back</Link></Button>
            {/* "Save as Draft" removed: Product has no draft state in the
                database, so the button could only ever toast and discard. */}
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting || loading}>
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
                    <FormField control={form.control} name="sku" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>SKU</FormLabel>
                        <FormControl><Input placeholder="VZ-TIT-T9-BLK" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                        <FormDescription>Uppercase, letters/numbers/hyphens only</FormDescription>
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
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel required>Product Name</FormLabel>
                        <FormControl><Input placeholder="VIZO Titan T9 Wireless Earbuds — Black" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
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
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Pricing</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-start">
                    <FormField control={form.control} name="openingCost" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opening Cost (PKR)</FormLabel>
                        <FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl>
                        <FormDescription>Cost of stock on hand at go-live</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="costPrice" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Cost Price (PKR)</FormLabel>
                        <FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="salePrice" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Sale Price (PKR)</FormLabel>
                        <FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-lg p-3">
                      <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Margin</div>
                      <div className={cn("text-xl tabular font-bold mt-1",
                        margin <= 0 ? "text-danger" : margin < 15 ? "text-warning" : "text-success"
                      )}>
                        {margin > 0 ? margin.toFixed(1) : "0"}%
                      </div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 tabular">
                        Profit: {formatMoney(Math.max(0, sale - cost))}/unit
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Barcodes</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Any number of codes can point at this SKU.</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => append({ code: "" })}>
                      <Plus className="size-3" /> Add barcode
                    </Button>
                  </div>
                  <div className="space-y-2 max-w-md">
                    {fields.map((field, idx) => (
                      <div key={field.id} className="flex items-start gap-2">
                        <FormField control={form.control} name={`barcodes.${idx}.code`} render={({ field: f }) => (
                          <FormItem className="flex-1">
                            <FormControl><Input placeholder="600000000001" {...f} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <Button type="button" variant="ghost" size="icon" className="text-danger" onClick={() => remove(idx)} disabled={fields.length === 1}>
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
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
                  {/* Real upload: POST /Upload/image returns a Cloudinary URL,
                      which is what Product.ImageUrl stores. The old drop zone
                      was decoration and accepted nothing. */}
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
                      className="w-full aspect-square border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg flex flex-col items-center justify-center text-center p-4 hover:border-brand-yellow/50 transition-colors disabled:opacity-60"
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
