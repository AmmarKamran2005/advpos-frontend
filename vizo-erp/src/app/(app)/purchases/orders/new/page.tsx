"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { z } from "zod";
import { Save, Plus, Trash2, Search, Loader2, ArrowLeft, Truck, AlertCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Avatar } from "@/components/ui/avatar";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { vizoResolver } from "@/lib/zod-resolver";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /purchases/lookups. Suppliers, receiving locations and the product
   catalogue all used to be hard-coded arrays out of src/data, which is why a
   supplier or item created through the app could never be put on a purchase
   order. Fetched on every mount so the pickers cannot fall behind. */
type LookupSupplier = { id: number; code: string; name: string };
type LookupLocation = { id: number; code: string; name: string };
type LookupProduct = {
  id: number; sku: string; name: string;
  costPrice: number; packing: number; taxRatePercent?: number;
};
type Lookups = { suppliers: LookupSupplier[]; locations: LookupLocation[]; products: LookupProduct[] };

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const ItemSchema = z.object({
  productId: z.coerce.number().positive(),
  name: z.string(),
  sku: z.string(),
  qty: z.coerce.number().positive("Qty > 0"),
  unitCost: z.coerce.number().nonnegative(),
  taxPercent: z.coerce.number().min(0).max(100),
});

const Schema = z.object({
  supplierId: z.coerce.number({ message: "Pick a supplier" }).positive("Pick a supplier"),
  locationId: z.coerce.number().positive("Pick a location"),
  poDate: z.string().min(1),
  expectedDate: z.string().min(1, "Expected date required"),
  items: z.array(ItemSchema).min(1, "Add at least one item"),
  discount: z.coerce.number().min(0),
  notes: z.string().max(500).optional(),
}).refine((d) => new Date(d.expectedDate) >= new Date(d.poDate), { message: "Expected date must be on or after PO date", path: ["expectedDate"] });

type Form = z.infer<typeof Schema>;

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [supplierOpen, setSupplierOpen] = React.useState(false);
  const [productOpen, setProductOpen] = React.useState(false);

  const [lookups, setLookups] = React.useState<Lookups>({ suppliers: [], locations: [], products: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      supplierId: 0 as unknown as number,
      locationId: 0,
      poDate: new Date().toISOString().slice(0, 10),
      expectedDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      items: [],
      discount: 0,
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");
  const supplierId = form.watch("supplierId");
  const discount = form.watch("discount") || 0;

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/purchases/lookups`, { headers: authHeader() });
      setLookups({
        suppliers: res.data.suppliers ?? [],
        locations: res.data.locations ?? [],
        products: res.data.products ?? [],
      });
      form.setValue("locationId", res.data.locations?.[0]?.id ?? 0);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load suppliers, locations and products."));
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

  const supplier = lookups.suppliers.find((p) => p.id === supplierId);
  const suppliers = lookups.suppliers;

  const subtotal = items.reduce((s, i) => s + i.unitCost * i.qty, 0);
  const tax = items.reduce((s, i) => s + (i.unitCost * i.qty * (i.taxPercent / 100)), 0);
  const total = subtotal + tax - Number(discount);

  function pickProduct(id: number) {
    const p = lookups.products.find((x) => x.id === id);
    if (!p) return;
    if (form.getValues("items").some((i) => i.productId === id)) {
      toast.info("That item is already on this order.");
      setProductOpen(false);
      return;
    }
    append({
      productId: id, name: p.name, sku: p.sku, qty: 1,
      unitCost: p.costPrice,
      taxPercent: p.taxRatePercent ?? 18,
    });
    setProductOpen(false);
  }

  async function onSubmit(d: Form) {
    try {
      const res = await axios.post<{ id: number; message: string }>(
        `${API_BASE_URL}/purchases/orders`,
        {
          supplierId: d.supplierId,
          locationId: d.locationId,
          poDate: d.poDate,
          expectedDate: d.expectedDate,
          discount: Number(d.discount) || 0,
          notes: d.notes?.trim() || null,
          submitForApproval: true,
          lines: d.items.map((i) => ({
            productId: i.productId,
            qty: Number(i.qty) || 0,
            unitCost: Number(i.unitCost) || 0,
            taxPercent: Number(i.taxPercent) || 0,
          })),
        },
        { headers: authHeader() }
      );
      toast.success("Purchase order created", { description: res.data.message });
      router.push(`/purchases/orders/${res.data.id}`);
    } catch (e) {
      toast.error("Purchase order not created", { description: apiMessage(e, "Please try again.") });
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "POs", href: "/purchases/orders" }, { label: "New PO" }]}
        title={<><Truck className="size-6 inline-block mr-2 text-brand-yellow" />Purchase Order</>}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/purchases/orders"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting || loading}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save />Submit for Approval</>}
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
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">The API must be running on {API_BASE_URL}.</div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" /> Try again
            </Button>
          </CardBody>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6" noValidate>
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Supplier & Delivery</h3>
                <FormItem className="mb-4">
                  <FormLabel required>Supplier</FormLabel>
                  {supplier ? (
                    <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar initials={supplier.name.slice(0, 2).toUpperCase()} size="sm" />
                        <div>
                          <div className="font-medium text-navy-900 dark:text-white">{supplier.name}</div>
                          <div className="text-2xs text-slate-500 dark:text-slate-400">{supplier.code}</div>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue("supplierId", 0 as unknown as number)}>Change</Button>
                    </div>
                  ) : (
                    <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
                      <PopoverTrigger asChild>
                        <button type="button" className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 text-left hover:border-brand-yellow transition-colors">
                          <Search className="size-4 inline-block mr-2" />Search supplier…
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[420px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Type supplier name…" />
                          <CommandList>
                            <CommandEmpty>No supplier found.</CommandEmpty>
                            <CommandGroup>
                              {suppliers.map((p) => (
                                <CommandItem key={p.id} value={`${p.name} ${p.code}`} onSelect={() => { form.setValue("supplierId", p.id); setSupplierOpen(false); }}>
                                  <Avatar initials={p.name.slice(0, 2).toUpperCase()} size="sm" />
                                  <div>
                                    <div className="text-sm font-medium text-navy-900 dark:text-white">{p.name}</div>
                                    <div className="text-2xs text-slate-500 dark:text-slate-400">{p.code}</div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                  <FormField control={form.control} name="supplierId" render={() => <FormMessage />} />
                </FormItem>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField control={form.control} name="locationId" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Receiving Location</FormLabel>
                      <FormControl>
                        {loading ? <Skeleton className="h-10" /> : (
                          <SelectNative {...field}>
                            {lookups.locations.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </SelectNative>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="poDate" render={({ field }) => (
                    <FormItem><FormLabel required>PO date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="expectedDate" render={({ field }) => (
                    <FormItem><FormLabel required>Expected delivery</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Items <span className="text-danger">*</span> ({fields.length})</h3>
                  <Popover open={productOpen} onOpenChange={setProductOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="accent" size="sm" className="gap-1"><Plus />Add Item</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[480px] p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Search products…" />
                        <CommandList>
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup>
                            {lookups.products.map((p) => (
                          <CommandItem key={p.id} value={`${p.sku} ${p.name}`} onSelect={() => pickProduct(p.id)}>
                            <div className="flex-1">
                              <div className="text-sm">{p.name}</div>
                              <div className="text-2xs tabular text-slate-500">{p.sku} · cost {formatMoney(p.costPrice)}</div>
                            </div>
                          </CommandItem>
                        ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                {fields.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm">
                    Add items to your PO
                  </div>
                ) : (
                  <div className="space-y-2">
                    {fields.map((f, i) => <PORow key={f.id} idx={i} control={form.control} onRemove={() => remove(i)} />)}
                  </div>
                )}
                <FormField control={form.control} name="items" render={() => <FormMessage />} />
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (visible on PO)</FormLabel>
                    <FormControl><Textarea rows={3} placeholder="Special instructions, payment terms, etc." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardBody>
            </Card>
          </div>

          <div>
            <Card className="lg:sticky lg:top-20">
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Totals</h3>
                <div className="space-y-2 text-sm">
                  <RowKV label="Items" v={`${fields.length}`} />
                  <RowKV label="Subtotal" v={formatMoney(subtotal)} />
                  <RowKV label="Tax" v={formatMoney(tax)} />
                  <FormField control={form.control} name="discount" render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormLabel className="text-slate-500 dark:text-slate-400 font-normal !mb-0 flex-1">Discount</FormLabel>
                      <FormControl><Input type="number" min={0} step="0.01" className="w-24 text-right tabular" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <div className="pt-2 border-t border-slate-200 dark:border-navy-700">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy-900 dark:text-white">Total</span>
                      <span className="tabular text-lg font-bold text-navy-900 dark:text-white">{formatMoney(total)}</span>
                    </div>
                  </div>
                </div>
                <Button type="submit" variant="accent" size="md" className="w-full mt-6 gap-1.5" disabled={form.formState.isSubmitting || loading}>
                  {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" />Submitting…</> : <><Save />Submit PO</>}
                </Button>
              </CardBody>
            </Card>
          </div>
        </form>
      </Form>
    </>
  );
}

function PORow({ idx, control, onRemove }: { idx: number; control: Control<Form>; onRemove: () => void }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-start p-2 border border-slate-200 dark:border-navy-700 rounded-lg">
      <FormField control={control} name={`items.${idx}.name`} render={({ field }) => (
        <div className="col-span-12 sm:col-span-5">
          <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{field.value}</div>
          <FormField control={control} name={`items.${idx}.sku`} render={({ field: f }) => (<div className="text-2xs tabular text-slate-500">{f.value}</div>)} />
        </div>
      )} />
      <FormField control={control} name={`items.${idx}.qty`} render={({ field }) => (
        <FormItem className="col-span-3 sm:col-span-2"><FormControl><Input type="number" placeholder="Qty" min={1} className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.unitCost`} render={({ field }) => (
        <FormItem className="col-span-4 sm:col-span-2"><FormControl><Input type="number" step="0.01" placeholder="Cost" min={0} className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.taxPercent`} render={({ field }) => (
        <FormItem className="col-span-4 sm:col-span-2"><FormControl><Input type="number" placeholder="Tax%" min={0} max={100} className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <Button type="button" variant="ghost" size="icon-sm" className={cn("col-span-1 ml-auto text-danger")} onClick={onRemove} aria-label="Remove">
        <Trash2 />
      </Button>
    </div>
  );
}

function RowKV({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="tabular font-medium text-navy-900 dark:text-white">{v}</span>
    </div>
  );
}
