"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { z } from "zod";
import {
  Save, Plus, Trash2, Search, Loader2, ArrowLeft, FileText,
  AlertCircle, RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { vizoResolver } from "@/lib/zod-resolver";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /purchases/lookups. Suppliers, payment methods and the product catalogue
   all came from hard-coded arrays before, so a supplier or item added through
   the app could never be invoiced. */
type LookupSupplier = { id: number; code: string; name: string };
type LookupProduct = { id: number; sku: string; name: string; costPrice: number; taxRatePercent?: number };
type LookupMethod = { id: number; key: string; name: string };
type Lookups = { suppliers: LookupSupplier[]; products: LookupProduct[]; paymentMethods: LookupMethod[] };

/* An invoice can be raised against a purchase order, which seeds the lines.
   The old form asked for a subtotal and a tax figure typed by hand and posted
   neither -- the API stores LINES and works the totals out itself. */
type OpenPo = { id: number; poNo: string; supplierId: number; supplierName: string; status: string; total: number };
type PoDetailLine = { id: number; productId: number; sku: string; name: string; qty: number; unitCost: number; taxPercent: number };
type PoDetail = { id: number; poNo: string; supplierId: number; lines: PoDetailLine[] };

const ItemSchema = z.object({
  productId: z.coerce.number().positive(),
  sku: z.string(),
  name: z.string(),
  qty: z.coerce.number().positive("Qty > 0"),
  unitCost: z.coerce.number().nonnegative(),
  taxPercent: z.coerce.number().min(0).max(100),
});

const Schema = z.object({
  supplierId: z.coerce.number({ message: "Pick a supplier" }).positive("Pick a supplier"),
  poId: z.coerce.number().optional(),
  supplierInvoiceNo: z.string().min(1, "Their invoice number is required").max(60),
  invoiceDate: z.string().min(1, "Required"),
  dueDate: z.string().min(1, "Required"),
  discount: z.coerce.number().min(0),
  whtAmount: z.coerce.number().min(0),
  methodId: z.coerce.number().positive("Pick a payment method"),
  items: z.array(ItemSchema).min(1, "Add at least one item"),
}).refine((d) => new Date(d.dueDate) >= new Date(d.invoiceDate), {
  message: "Due date must be on or after the invoice date", path: ["dueDate"],
});

type FormValues = z.infer<typeof Schema>;

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function NewPurchaseInvoicePage() {
  const router = useRouter();
  const [supplierOpen, setSupplierOpen] = React.useState(false);
  const [productOpen, setProductOpen] = React.useState(false);
  const [poOpen, setPoOpen] = React.useState(false);

  const [lookups, setLookups] = React.useState<Lookups>({ suppliers: [], products: [], paymentMethods: [] });
  const [openPos, setOpenPos] = React.useState<OpenPo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      supplierId: 0 as unknown as number,
      poId: undefined,
      supplierInvoiceNo: "",
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      discount: 0,
      whtAmount: 0,
      methodId: 0,
      items: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");
  const supplierId = form.watch("supplierId");
  const poId = form.watch("poId");
  const discount = Number(form.watch("discount")) || 0;
  const wht = Number(form.watch("whtAmount")) || 0;

  const load = React.useCallback(async () => {
    try {
      const [lk, orders] = await Promise.all([
        axios.get<Lookups>(`${API_BASE_URL}/purchases/lookups`, { headers: authHeader() }),
        axios.get<OpenPo[] | { items: OpenPo[] }>(`${API_BASE_URL}/purchases/orders`, { headers: authHeader() }),
      ]);
      setLookups({
        suppliers: lk.data.suppliers ?? [],
        products: lk.data.products ?? [],
        paymentMethods: lk.data.paymentMethods ?? [],
      });
      form.setValue("methodId", lk.data.paymentMethods?.[0]?.id ?? 0);
      const rows = Array.isArray(orders.data) ? orders.data : orders.data.items;
      setOpenPos(rows);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load suppliers, products and payment methods."));
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
  const po = openPos.find((p) => p.id === poId);
  /* Only that supplier's orders once one is chosen — invoicing an order from
     a different supplier is always a mistake. */
  const selectablePos = supplierId ? openPos.filter((p) => p.supplierId === supplierId) : openPos;

  const subtotal = items.reduce((s, i) => s + (Number(i.unitCost) || 0) * (Number(i.qty) || 0), 0);
  const tax = items.reduce((s, i) => s + (Number(i.unitCost) || 0) * (Number(i.qty) || 0) * ((Number(i.taxPercent) || 0) / 100), 0);
  const total = subtotal + tax - discount - wht;

  async function pickPo(id: number) {
    setPoOpen(false);
    try {
      const res = await axios.get<PoDetail>(`${API_BASE_URL}/purchases/orders/${id}`, { headers: authHeader() });
      form.setValue("poId", id);
      form.setValue("supplierId", res.data.supplierId);
      replace(res.data.lines.map((l) => ({
        productId: l.productId, sku: l.sku, name: l.name,
        qty: l.qty, unitCost: l.unitCost, taxPercent: l.taxPercent,
      })));
      toast.success(`Lines copied from ${res.data.poNo}`, { description: "Adjust anything the supplier billed differently." });
    } catch (e) {
      toast.error("Could not open that purchase order", { description: apiMessage(e, "Please try again.") });
    }
  }

  function pickProduct(id: number) {
    const p = lookups.products.find((x) => x.id === id);
    if (!p) return;
    if (form.getValues("items").some((i) => i.productId === id)) {
      toast.info("That item is already on this invoice.");
      setProductOpen(false);
      return;
    }
    append({ productId: id, sku: p.sku, name: p.name, qty: 1, unitCost: p.costPrice, taxPercent: p.taxRatePercent ?? 18 });
    setProductOpen(false);
  }

  async function onSubmit(d: FormValues) {
    try {
      const res = await axios.post<{ id: number; message: string }>(
        `${API_BASE_URL}/purchases/invoices`,
        {
          supplierId: d.supplierId,
          poId: d.poId ?? null,
          supplierInvoiceNo: d.supplierInvoiceNo.trim(),
          invoiceDate: d.invoiceDate,
          dueDate: d.dueDate,
          discount: Number(d.discount) || 0,
          whtAmount: Number(d.whtAmount) || 0,
          methodId: d.methodId,
          lines: d.items.map((i) => ({
            productId: i.productId,
            qty: Number(i.qty) || 0,
            unitCost: Number(i.unitCost) || 0,
            taxPercent: Number(i.taxPercent) || 0,
          })),
        },
        { headers: authHeader() }
      );
      toast.success("Supplier invoice created", { description: res.data.message });
      router.push(`/purchases/invoices/${res.data.id}`);
    } catch (e) {
      toast.error("Invoice not created", { description: apiMessage(e, "Please try again.") });
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Invoices", href: "/purchases/invoices" }, { label: "New Invoice" }]}
        title={<><FileText className="size-6 inline-block mr-2 text-brand-yellow" />Supplier Invoice</>}
        subtitle="What the supplier is billing you for"
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/purchases/invoices"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting || loading}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save />Save Invoice</>}
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
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Supplier &amp; Reference</h3>

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
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => form.setValue("supplierId", 0 as unknown as number)}>Change</Button>
                    </div>
                  ) : (
                    <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
                      <PopoverTrigger asChild>
                        <button type="button" disabled={loading}
                          className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 text-left hover:border-brand-yellow transition-colors disabled:opacity-60">
                          <Search className="size-4 inline-block mr-2" />Search supplier…
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[420px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Type supplier name…" />
                          <CommandList>
                            <CommandEmpty>No supplier found.</CommandEmpty>
                            <CommandGroup>
                              {lookups.suppliers.map((p) => (
                                <CommandItem key={p.id} value={`${p.name} ${p.code}`}
                                  onSelect={() => { form.setValue("supplierId", p.id); setSupplierOpen(false); }}>
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

                <FormItem className="mb-4">
                  <FormLabel>Against a purchase order</FormLabel>
                  {po ? (
                    <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                      <div>
                        <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">{po.poNo}</div>
                        <div className="text-2xs text-slate-500 dark:text-slate-400">{po.supplierName} · {formatMoney(po.total)}</div>
                      </div>
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => { form.setValue("poId", undefined); replace([]); }}>Clear</Button>
                    </div>
                  ) : (
                    <Popover open={poOpen} onOpenChange={setPoOpen}>
                      <PopoverTrigger asChild>
                        <button type="button" disabled={loading}
                          className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 text-left hover:border-brand-yellow transition-colors disabled:opacity-60">
                          <Search className="size-4 inline-block mr-2" />Pick a PO to copy its lines (optional)
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[500px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Type PO number…" />
                          <CommandList>
                            <CommandEmpty>No purchase order found.</CommandEmpty>
                            <CommandGroup>
                              {selectablePos.map((p) => (
                                <CommandItem key={p.id} value={`${p.poNo} ${p.supplierName}`} onSelect={() => void pickPo(p.id)}>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-navy-900 dark:text-white">{p.poNo}</div>
                                    <div className="text-2xs text-slate-500 dark:text-slate-400">{p.supplierName}</div>
                                  </div>
                                  <span className="tabular text-2xs text-slate-500 dark:text-slate-400">{formatMoney(p.total)}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                  <FormDescription>Copies the order lines so you only correct what the supplier billed differently.</FormDescription>
                </FormItem>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="supplierInvoiceNo" render={({ field }) => (
                    <FormItem><FormLabel required>Their invoice #</FormLabel>
                      <FormControl><Input placeholder="e.g. SEH-INV-2026-2241" className="tabular" {...field} /></FormControl>
                      <FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="methodId" render={({ field }) => (
                    <FormItem><FormLabel required>Payment method</FormLabel><FormControl>
                      {loading ? <Skeleton className="h-10" /> : (
                        <SelectNative {...field}>
                          {lookups.paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </SelectNative>
                      )}
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                    <FormItem><FormLabel required>Invoice date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem><FormLabel required>Due date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white">
                    Items <span className="text-danger">*</span> ({fields.length})
                  </h3>
                  <Popover open={productOpen} onOpenChange={setProductOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="accent" size="sm" className="gap-1" disabled={loading}><Plus />Add</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[480px] p-0">
                      <Command>
                        <CommandInput placeholder="Search product…" />
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
                    Pick a purchase order above, or add items one at a time
                  </div>
                ) : (
                  <div className="space-y-2">
                    {fields.map((f, i) => <InvoiceRow key={f.id} idx={i} control={form.control} onRemove={() => remove(i)} />)}
                  </div>
                )}
                <FormField control={form.control} name="items" render={() => <FormMessage />} />
              </CardBody>
            </Card>
          </div>

          <div>
            <Card className="lg:sticky lg:top-20">
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Totals</h3>
                <div className="space-y-2 text-sm">
                  <Line label="Subtotal" value={formatMoney(subtotal)} />
                  <Line label="Sales tax" value={formatMoney(tax)} />
                  <FormField control={form.control} name="discount" render={({ field }) => (
                    <FormItem><FormLabel>Discount</FormLabel>
                      <FormControl><Input type="number" min={0} step="0.01" className="text-right tabular" {...field} /></FormControl>
                      <FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="whtAmount" render={({ field }) => (
                    <FormItem><FormLabel>Withholding tax</FormLabel>
                      <FormControl><Input type="number" min={0} step="0.01" className="text-right tabular" {...field} /></FormControl>
                      <FormDescription>Deducted at source and paid to the FBR on the supplier&apos;s behalf.</FormDescription>
                      <FormMessage /></FormItem>
                  )} />
                  <div className="border-t border-slate-200 dark:border-navy-700 pt-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy-900 dark:text-white">Payable</span>
                      <span className={cn("tabular text-lg font-bold", total < 0 ? "text-danger" : "text-navy-900 dark:text-white")}>
                        {formatMoney(total)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </form>
      </Form>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="tabular font-medium text-navy-900 dark:text-white">{value}</span>
    </div>
  );
}

function InvoiceRow({ idx, control, onRemove }: { idx: number; control: Control<FormValues>; onRemove: () => void }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-start p-2 border border-slate-200 dark:border-navy-700 rounded-lg">
      <FormField control={control} name={`items.${idx}.name`} render={({ field }) => (
        <div className="col-span-12 sm:col-span-5">
          <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{field.value}</div>
          <FormField control={control} name={`items.${idx}.sku`} render={({ field: f }) => (
            <div className="text-2xs tabular text-slate-500">{f.value}</div>
          )} />
        </div>
      )} />
      <FormField control={control} name={`items.${idx}.qty`} render={({ field }) => (
        <FormItem className="col-span-4 sm:col-span-2">
          <FormLabel className="text-2xs">Qty</FormLabel>
          <FormControl><Input type="number" min={1} className="text-right tabular" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.unitCost`} render={({ field }) => (
        <FormItem className="col-span-4 sm:col-span-2">
          <FormLabel className="text-2xs">Unit cost</FormLabel>
          <FormControl><Input type="number" min={0} step="0.01" className="text-right tabular" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.taxPercent`} render={({ field }) => (
        <FormItem className="col-span-3 sm:col-span-2">
          <FormLabel className="text-2xs">Tax %</FormLabel>
          <FormControl><Input type="number" min={0} max={100} step="0.01" className="text-right tabular" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <Button type="button" variant="ghost" size="icon-sm" className="col-span-1 mt-5 ml-auto text-danger" onClick={onRemove}>
        <Trash2 />
      </Button>
    </div>
  );
}
