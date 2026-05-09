"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { Save, X, ArrowLeft, Plus, Trash2, Image as ImageIcon, Loader2, Info } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { categories, brands, units } from "@/data/products";
import { toast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const Schema = z.object({
  sku: z.string()
    .min(3, "SKU must be at least 3 characters")
    .max(50, "Max 50 characters")
    .regex(/^[A-Z0-9-]+$/, "Use only uppercase letters, numbers and hyphens"),
  name: z.string().min(2, "Name required").max(200, "Max 200 characters"),
  description: z.string().max(500, "Max 500 chars").optional().or(z.literal("")),
  categoryId: z.coerce.number({ message: "Pick a category" }).positive("Pick a category"),
  brandId:    z.coerce.number({ message: "Pick a brand" }).positive("Pick a brand"),
  uomId:      z.coerce.number().positive(),
  taxRatePercent: z.coerce.number().min(0).max(100, "Cannot exceed 100%"),

  costPrice: z.coerce.number().positive("Cost price must be positive"),
  salePrice: z.coerce.number().positive("Sale price must be positive"),

  reorderLevel: z.coerce.number().min(0, "Cannot be negative"),
  hideStock: z.boolean(),
  isActive:  z.boolean(),

  barcodes: z.array(z.object({
    code: z.string().min(8, "Min 8 digits").max(20, "Max 20"),
    type: z.enum(["EAN-13", "UPC-A", "Code-128"]),
    packQty: z.coerce.number().positive("Pack qty > 0"),
  })).optional(),
}).refine((d) => d.salePrice > d.costPrice, { message: "Sale price must be higher than cost price", path: ["salePrice"] });

type Form = z.infer<typeof Schema>;

export default function NewProductPage() {
  const router = useRouter();
  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      categoryId: 0 as unknown as number,
      brandId:    0 as unknown as number,
      uomId: 1,
      taxRatePercent: 18,
      costPrice: 0 as unknown as number,
      salePrice: 0 as unknown as number,
      reorderLevel: 0,
      hideStock: false,
      isActive: true,
      barcodes: [{ code: "", type: "EAN-13", packQty: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "barcodes" });
  const cost = form.watch("costPrice");
  const sale = form.watch("salePrice");
  const margin = sale > 0 ? ((sale - cost) / sale) * 100 : 0;

  async function onSubmit(d: Form) {
    await new Promise((r) => setTimeout(r, 800));
    toast.success("Product created", { description: `${d.name} (${d.sku}) added to catalog.` });
    router.push("/inventory/products");
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
            <Button variant="secondary" onClick={() => toast.info("Saved as draft")}>Save as Draft</Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save /> Save Product</>}
            </Button>
          </>
        }
      />

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
                          <SelectNative {...field}>
                            <option value="">— Select —</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </SelectNative>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="brandId" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Brand</FormLabel>
                        <FormControl>
                          <SelectNative {...field}>
                            <option value="">— Select —</option>
                            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </SelectNative>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="uomId" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Unit of Measure</FormLabel>
                        <FormControl>
                          <SelectNative {...field}>
                            {units.map((u) => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}
                          </SelectNative>
                        </FormControl>
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
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
                    <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Barcodes</h3>
                    <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => append({ code: "", type: "EAN-13", packQty: 1 })}>
                      <Plus className="size-3" /> Add barcode
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {fields.map((field, idx) => (
                      <div key={field.id} className="grid grid-cols-12 gap-2">
                        <FormField control={form.control} name={`barcodes.${idx}.code`} render={({ field: f }) => (
                          <FormItem className="col-span-6">
                            <FormControl><Input placeholder="EAN-13 / Code-128" {...f} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`barcodes.${idx}.type`} render={({ field: f }) => (
                          <FormItem className="col-span-3">
                            <FormControl>
                              <SelectNative {...f}>
                                <option>EAN-13</option><option>UPC-A</option><option>Code-128</option>
                              </SelectNative>
                            </FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`barcodes.${idx}.packQty`} render={({ field: f }) => (
                          <FormItem className="col-span-2">
                            <FormControl><Input type="number" min={1} placeholder="Qty" {...f} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <Button type="button" variant="ghost" size="icon" className="col-span-1 text-danger" onClick={() => remove(idx)} disabled={fields.length === 1}>
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
                    <FormField control={form.control} name="reorderLevel" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reorder Level</FormLabel>
                        <FormControl><Input type="number" min={0} {...field} /></FormControl>
                        <FormDescription>Alert when stock falls below this</FormDescription>
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
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Product Images</h3>
                  <div className="aspect-square border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg flex flex-col items-center justify-center text-center p-4 hover:border-brand-yellow/50 cursor-pointer transition-colors">
                    <ImageIcon className="size-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <div className="text-sm font-medium text-navy-900 dark:text-white">Drop images here</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">or click to browse</div>
                    <div className="text-2xs text-slate-400 mt-2">PNG, JPG up to 5MB · max 10 images</div>
                  </div>
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
