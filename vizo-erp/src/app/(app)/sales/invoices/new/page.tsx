"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, type Control } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import {
  Save, X, Plus, Trash2, Search, Loader2, ArrowLeft, FileText,
  AlertCircle, RefreshCw, AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { vizoResolver } from "@/lib/zod-resolver";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /sales/lookups. A direct invoice is raised without an upstream order, so
   this screen needs the same live customers, locations, payment methods and
   product catalogue the order form does. It used to read frozen arrays out of
   @/data and its submit button only produced a toast — nothing was ever saved. */
type LookupCustomer = {
  id: number; code: string; name: string; displayName: string | null;
  city: string; phone: string | null;
  creditLimit: number; creditDays: number; holdPolicy: string; outstanding: number;
};
type LookupProduct = {
  id: number; sku: string; name: string; packing: number;
  salePrice: number; taxRatePercent: number; totalStock: number;
};
type Lookups = {
  locations: { id: number; code: string; name: string; kind: string; isSellable: boolean }[];
  paymentMethods: { id: number; key: string; name: string; kind: string }[];
  customers: LookupCustomer[];
  products: LookupProduct[];
  defaultTaxPercent: number;
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const ItemSchema = z.object({
  productId: z.coerce.number().positive(),
  name: z.string(),
  sku: z.string(),
  qty: z.coerce.number().positive("Qty > 0"),
  unitPrice: z.coerce.number().nonnegative(),
  discount: z.coerce.number().min(0).max(100),
  taxPercent: z.coerce.number().min(0).max(100),
});

const Schema = z.object({
  customerId: z.coerce.number({ message: "Pick a customer" }).positive("Pick a customer"),
  locationId: z.coerce.number().positive("Pick a location"),
  invoiceDate: z.string().min(1, "Date required"),
  dueDate: z.string().min(1, "Due date required"),
  items: z.array(ItemSchema).min(1, "Add at least one item"),
  methodId: z.coerce.number().positive("Pick a payment method"),
}).refine((d) => new Date(d.dueDate) >= new Date(d.invoiceDate), {
  message: "Due date must be on or after the invoice date", path: ["dueDate"],
});

type Form = z.infer<typeof Schema>;

export default function NewInvoicePage() {
  const router = useRouter();
  const [productOpen, setProductOpen] = React.useState(false);
  const [customerOpen, setCustomerOpen] = React.useState(false);

  const [lookups, setLookups] = React.useState<Lookups>({
    locations: [], paymentMethods: [], customers: [], products: [], defaultTaxPercent: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      customerId: 0 as unknown as number,
      locationId: 0,
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      items: [],
      methodId: 0,
    },
  });

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/sales/lookups`, { headers: authHeader() });
      setLookups({
        locations: res.data.locations ?? [],
        paymentMethods: res.data.paymentMethods ?? [],
        customers: res.data.customers ?? [],
        products: res.data.products ?? [],
        defaultTaxPercent: res.data.defaultTaxPercent ?? 0,
      });
      /* First SELLABLE location, not just the first one -- claim and
         in-transit stock is held, never sold from. */
      const sellable = (res.data.locations ?? []).filter((l) => l.isSellable);
      form.setValue("locationId", sellable[0]?.id ?? res.data.locations?.[0]?.id ?? 0);
      const credit = res.data.paymentMethods?.find((m) => m.key === "CREDIT");
      form.setValue("methodId", credit?.id ?? res.data.paymentMethods?.[0]?.id ?? 0);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load customers, items and payment methods."));
    } finally {
      setLoading(false);
    }
  }, [form]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");
  const customerId = form.watch("customerId");
  const customer = lookups.customers.find((p) => p.id === customerId);

  /* The same arithmetic the API runs: discount per line, tax on what is left. */
  const subtotal = items.reduce((s, i) => s + (Number(i.unitPrice) || 0) * (Number(i.qty) || 0), 0);
  const discountAmount = items.reduce(
    (s, i) => s + (Number(i.unitPrice) || 0) * (Number(i.qty) || 0) * ((Number(i.discount) || 0) / 100), 0);
  const tax = items.reduce((s, i) => {
    const net = (Number(i.unitPrice) || 0) * (Number(i.qty) || 0) * (1 - (Number(i.discount) || 0) / 100);
    return s + net * ((Number(i.taxPercent) || 0) / 100);
  }, 0);
  const total = subtotal - discountAmount + tax;

  const willExceed = !!customer && customer.creditLimit > 0 && customer.outstanding + total > customer.creditLimit;

  function pickProduct(id: number) {
    const p = lookups.products.find((x) => x.id === id);
    if (!p) return;
    const exists = items.findIndex((i) => i.productId === id);
    if (exists >= 0) {
      form.setValue(`items.${exists}.qty`, Number(items[exists].qty) + 1);
    } else {
      append({
        productId: id, name: p.name, sku: p.sku, qty: 1,
        unitPrice: p.salePrice, discount: 0,
        taxPercent: p.taxRatePercent ?? lookups.defaultTaxPercent,
      });
    }
    setProductOpen(false);
  }

  async function onSubmit(d: Form) {
    try {
      const res = await axios.post<{ id: number; invoiceNo: string; pdfUrl: string | null; message: string }>(
        `${API_BASE_URL}/sales/invoices`,
        {
          orderId: null,
          customerId: d.customerId,
          locationId: d.locationId,
          invoiceDate: d.invoiceDate,
          dueDate: d.dueDate,
          methodId: d.methodId,
          lines: d.items.map((i) => ({
            productId: i.productId,
            qty: Number(i.qty) || 0,
            rate: Number(i.unitPrice) || 0,
            discountPercent: Number(i.discount) || 0,
            taxPercent: Number(i.taxPercent) || 0,
          })),
        },
        { headers: authHeader() });

      toast.success(`Invoice ${res.data.invoiceNo} created`, {
        description: `${formatMoney(total)}${res.data.pdfUrl ? " · bill saved to the document store." : "."}`,
      });
      router.push(`/sales/invoices/${res.data.id}`);
    } catch (e) {
      toast.error("Invoice not created", { description: apiMessage(e, "Please try again.") });
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Invoices", href: "/sales/invoices" }, { label: "New Invoice" }]}
        title={<><FileText className="size-6 inline-block mr-2 text-brand-yellow" />Direct Invoice</>}
        subtitle="Bill a customer without an upstream order. The bill is generated and saved as soon as it is raised."
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/sales/invoices"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting || loading}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save />Create Invoice</>}
            </Button>
          </>
        }
      />

      {error && (
        <Card className="mb-6 border-danger/40">
          <CardBody className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy-900 dark:text-white">{error}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">The API must be running on {API_BASE_URL}.</div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" />Try again
            </Button>
          </CardBody>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6" noValidate>
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Customer &amp; Dates</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormItem className="sm:col-span-2">
                    <FormLabel required>Customer</FormLabel>
                    {loading ? (
                      <Skeleton className="h-16" />
                    ) : customer ? (
                      <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar initials={customer.name.slice(0, 2).toUpperCase()} size="sm" />
                          <div>
                            <div className="font-medium text-navy-900 dark:text-white">{customer.name}</div>
                            <div className="text-2xs tabular text-slate-500 dark:text-slate-400">
                              {customer.code} · {customer.city}
                              {customer.creditDays > 0 && ` · NET ${customer.creditDays}`}
                            </div>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue("customerId", 0 as unknown as number)}>Change</Button>
                      </div>
                    ) : (
                      <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                        <PopoverTrigger asChild>
                          <button type="button" className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 text-left hover:border-brand-yellow transition-colors">
                            <Search className="size-4 inline-block mr-2" />Search customer…
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[440px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Type customer name…" />
                            <CommandList>
                              <CommandEmpty>No customer found.</CommandEmpty>
                              <CommandGroup heading={`${lookups.customers.length} customers`}>
                                {lookups.customers.map((p) => (
                                  <CommandItem key={p.id} value={`${p.name} ${p.code}`} onSelect={() => { form.setValue("customerId", p.id); setCustomerOpen(false); }}>
                                    <Avatar initials={p.name.slice(0, 2).toUpperCase()} size="sm" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{p.name}</div>
                                      <div className="text-2xs text-slate-500 dark:text-slate-400">{p.code} · {p.city}</div>
                                    </div>
                                    {p.creditLimit > 0 && <Badge variant="muted" className="text-2xs tabular ml-auto">Limit {formatCompact(p.creditLimit, false)}</Badge>}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                    <FormField control={form.control} name="customerId" render={() => <FormMessage />} />
                  </FormItem>

                  <FormField control={form.control} name="locationId" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Issued from</FormLabel>
                      <FormControl>
                        {loading ? <Skeleton className="h-10" /> : (
                          <SelectNative {...field}>
                            {lookups.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </SelectNative>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="methodId" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Payment method</FormLabel>
                      <FormControl>
                        {loading ? <Skeleton className="h-10" /> : (
                          <SelectNative {...field}>
                            {lookups.paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </SelectNative>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
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
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Items <span className="text-danger">*</span> ({fields.length})</h3>
                  <Popover open={productOpen} onOpenChange={setProductOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="accent" size="sm" className="gap-1" disabled={loading}><Plus />Add Product</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[480px] p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Search products…" />
                        <CommandList>
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup heading={`${lookups.products.length} items`}>
                            {lookups.products.map((p) => (
                              <CommandItem key={p.id} value={`${p.sku} ${p.name}`} onSelect={() => pickProduct(p.id)}>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{p.name}</div>
                                  <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{p.sku} · stock {p.totalStock}</div>
                                </div>
                                <span className="tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(p.salePrice)}</span>
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
                    No items added yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="hidden sm:grid grid-cols-12 gap-2 px-2 pb-1">
                      <div className="col-span-4 text-2xs font-semibold uppercase tracking-wider text-slate-400">Item</div>
                      <div className="col-span-2 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Qty</div>
                      <div className="col-span-2 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Rate</div>
                      <div className="col-span-1 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Disc %</div>
                      <div className="col-span-1 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Tax %</div>
                      <div className="col-span-1 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Amount</div>
                      <div className="col-span-1" />
                    </div>
                    {fields.map((f, i) => <ItemRow key={f.id} idx={i} control={form.control} onRemove={() => remove(i)} />)}
                  </div>
                )}
                <FormField control={form.control} name="items" render={() => <FormMessage />} />
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="lg:sticky lg:top-20">
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Summary</h3>
                <div className="space-y-2 text-sm">
                  <RowKV label="Items" v={`${fields.length}`} />
                  <RowKV label="Subtotal" v={formatMoney(subtotal)} />
                  {discountAmount > 0 && <RowKV label="Discount" v={`- ${formatMoney(discountAmount)}`} />}
                  <RowKV label="Sales tax" v={formatMoney(tax)} />
                  <div className="pt-2 border-t border-slate-200 dark:border-navy-700">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy-900 dark:text-white">Total due</span>
                      <span className="tabular text-lg font-bold text-navy-900 dark:text-white">{formatMoney(total)}</span>
                    </div>
                  </div>
                </div>
                <Button type="submit" variant="accent" size="md" className="w-full mt-6 gap-1.5" disabled={form.formState.isSubmitting || loading}>
                  {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" />Creating…</> : <><Save />Create Invoice</>}
                </Button>
                <Button type="button" variant="ghost" size="md" className="w-full mt-2 gap-1.5" asChild>
                  <Link href="/sales/invoices"><X />Cancel</Link>
                </Button>
              </CardBody>
            </Card>

            {customer && (
              <Card className={cn(willExceed && "bg-warning/5 border-warning/30")}>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Customer Status</h3>
                  <div className="space-y-2.5 text-sm">
                    <RowKV label="Credit limit" v={customer.creditLimit > 0 ? formatMoney(customer.creditLimit) : "No limit"} />
                    <RowKV label="Outstanding" v={formatMoney(customer.outstanding)} />
                    <RowKV label="After this invoice" v={formatMoney(customer.outstanding + total)}
                      colorClass={willExceed ? "text-danger" : undefined} />
                  </div>
                  {willExceed && (
                    <p className="text-xs text-warning-dark dark:text-warning-light mt-3 inline-flex items-start gap-1.5">
                      <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                      This invoice takes them past their limit. A direct invoice is not stopped by
                      the credit check — only orders are — so raise it knowing that.
                    </p>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        </form>
      </Form>
    </>
  );
}

function ItemRow({ idx, control, onRemove }: { idx: number; control: Control<Form>; onRemove: () => void }) {
  const qty = useWatch({ control, name: `items.${idx}.qty` });
  const rate = useWatch({ control, name: `items.${idx}.unitPrice` });
  const disc = useWatch({ control, name: `items.${idx}.discount` });
  const amount = (Number(rate) || 0) * (Number(qty) || 0) * (1 - (Number(disc) || 0) / 100);

  return (
    <div className="grid grid-cols-12 gap-2 items-start p-2 border border-slate-200 dark:border-navy-700 rounded-lg">
      <FormField control={control} name={`items.${idx}.name`} render={({ field }) => (
        <div className="col-span-12 sm:col-span-4">
          <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{field.value}</div>
          <FormField control={control} name={`items.${idx}.sku`} render={({ field: f }) => (<div className="text-2xs tabular text-slate-500">{f.value}</div>)} />
        </div>
      )} />
      <FormField control={control} name={`items.${idx}.qty`} render={({ field }) => (
        <FormItem className="col-span-3 sm:col-span-2"><FormControl><Input type="number" placeholder="Qty" min={1} className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.unitPrice`} render={({ field }) => (
        <FormItem className="col-span-3 sm:col-span-2"><FormControl><Input type="number" step="0.01" placeholder="Price" min={0} className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.discount`} render={({ field }) => (
        <FormItem className="col-span-2 sm:col-span-1"><FormControl><Input type="number" placeholder="%" min={0} max={100} className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.taxPercent`} render={({ field }) => (
        <FormItem className="col-span-2 sm:col-span-1"><FormControl><Input type="number" placeholder="Tax%" min={0} max={100} step="0.01" className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <div className="col-span-1 sm:col-span-1 text-right tabular text-sm font-semibold text-navy-900 dark:text-white pt-2">
        {Math.round(amount).toLocaleString("en-PK")}
      </div>
      <Button type="button" variant="ghost" size="icon-sm" className="col-span-1 ml-auto text-danger" onClick={onRemove} aria-label="Remove">
        <Trash2 />
      </Button>
    </div>
  );
}

function RowKV({ label, v, colorClass }: { label: string; v: string; colorClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn("tabular font-medium text-navy-900 dark:text-white", colorClass)}>{v}</span>
    </div>
  );
}
