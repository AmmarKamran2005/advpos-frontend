"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, type Control } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import axios from "axios";
import {
  Save, X, Plus, Trash2, Search, Check, ArrowRight, ArrowLeft,
  AlertTriangle, Loader2, ShoppingCart, AlertCircle, RefreshCw, FileText,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /sales/lookups. Customers, locations, payment methods, sales people and
   the whole live product catalogue. This screen used to import hard-coded
   arrays out of @/data, which is why an item or a shop created minutes earlier
   could not be put on an order at all -- it simply was not in the picker. */
type LookupCustomer = {
  id: number; code: string; name: string; displayName: string | null;
  city: string; phone: string | null;
  creditLimit: number; creditDays: number; holdPolicy: string; outstanding: number;
};
type LookupProduct = {
  id: number; sku: string; name: string; packing: number;
  salePrice: number; costPrice: number; taxRatePercent: number; totalStock: number;
};
type Lookups = {
  locations: { id: number; code: string; name: string; kind: string; isSellable: boolean }[];
  paymentMethods: { id: number; key: string; name: string; kind: string }[];
  salesPeople: { id: number; name: string }[];
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

const STEPS = ["Customer & Items", "Pricing & Tax", "Review & Submit"] as const;

const ItemSchema = z.object({
  productId: z.coerce.number().positive("Pick a product"),
  name: z.string(),
  sku: z.string(),
  qty: z.coerce.number().positive("Qty > 0").max(99999, "Too large"),
  unitPrice: z.coerce.number().nonnegative("Cannot be negative"),
  discount: z.coerce.number().min(0).max(100, "Max 100%"),
  taxPercent: z.coerce.number().min(0).max(100),
});

const Schema = z.object({
  customerId: z.coerce.number({ message: "Pick a customer" }).positive("Pick a customer"),
  locationId: z.coerce.number().positive("Pick a location"),
  salesPersonUserId: z.coerce.number().min(0),
  items: z.array(ItemSchema).min(1, "Add at least one item"),
  methodId: z.coerce.number().positive("Pick a payment method"),
  orderDate: z.string().min(1, "Order date required"),
  deliveryDate: z.string().min(1, "Delivery date required"),
  raiseInvoice: z.boolean(),
  notes: z.string().max(500, "Max 500 characters").optional(),
});

type Form = z.infer<typeof Schema>;

const today = () => new Date().toISOString().slice(0, 10);

export default function NewOrderPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [productPickerOpen, setProductPickerOpen] = React.useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = React.useState(false);

  const [lookups, setLookups] = React.useState<Lookups>({
    locations: [], paymentMethods: [], salesPeople: [], customers: [], products: [],
    defaultTaxPercent: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [savingDraft, setSavingDraft] = React.useState(false);

  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    mode: "onChange",
    defaultValues: {
      customerId: 0 as unknown as number,
      locationId: 0,
      salesPersonUserId: 0,
      items: [],
      methodId: 0,
      orderDate: today(),
      deliveryDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      raiseInvoice: true,
      notes: "",
    },
  });

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/sales/lookups`, { headers: authHeader() });
      setLookups({
        locations: res.data.locations ?? [],
        paymentMethods: res.data.paymentMethods ?? [],
        salesPeople: res.data.salesPeople ?? [],
        customers: res.data.customers ?? [],
        products: res.data.products ?? [],
        defaultTaxPercent: res.data.defaultTaxPercent ?? 0,
      });
      /* First SELLABLE location, not just the first one -- claim and
         in-transit stock is held, never sold from. */
      const sellable = (res.data.locations ?? []).filter((l) => l.isSellable);
      form.setValue("locationId", sellable[0]?.id ?? res.data.locations?.[0]?.id ?? 0);
      /* Default to Credit: an order taken by a rep is on the shop's account
         unless somebody says otherwise. Cash orders go through Counter Sale. */
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
  const methodId = form.watch("methodId");
  const raiseInvoice = form.watch("raiseInvoice");
  const locationId = form.watch("locationId");
  const deliveryDate = form.watch("deliveryDate");

  const customer = lookups.customers.find((p) => p.id === customerId);
  const method = lookups.paymentMethods.find((m) => m.id === methodId);

  /* The same arithmetic the API runs on the way in: discount per line, then
     tax on what is left. Anything else and the review screen would promise a
     total the invoice does not honour. */
  const subtotal = items.reduce((s, i) => s + (Number(i.unitPrice) || 0) * (Number(i.qty) || 0), 0);
  const discountAmount = items.reduce(
    (s, i) => s + (Number(i.unitPrice) || 0) * (Number(i.qty) || 0) * ((Number(i.discount) || 0) / 100), 0);
  const tax = items.reduce((s, i) => {
    const net = (Number(i.unitPrice) || 0) * (Number(i.qty) || 0) * (1 - (Number(i.discount) || 0) / 100);
    return s + net * ((Number(i.taxPercent) || 0) / 100);
  }, 0);
  const total = subtotal - discountAmount + tax;

  /* Credit check, against the customer's real posted ledger balance. */
  const willExceed = !!customer && customer.creditLimit > 0 && customer.outstanding + total > customer.creditLimit;

  function pickProduct(productId: number) {
    const p = lookups.products.find((x) => x.id === productId);
    if (!p) return;
    const exists = items.findIndex((i) => i.productId === productId);
    if (exists >= 0) {
      form.setValue(`items.${exists}.qty`, Number(items[exists].qty) + 1);
    } else {
      append({
        productId, name: p.name, sku: p.sku, qty: 1,
        unitPrice: p.salePrice, discount: 0,
        taxPercent: p.taxRatePercent ?? lookups.defaultTaxPercent,
      });
    }
    setProductPickerOpen(false);
  }


  async function nextStep() {
    let valid = false;
    if (step === 0) valid = await form.trigger(["customerId", "locationId", "items"]);
    else if (step === 1) valid = await form.trigger(["methodId", "orderDate", "deliveryDate"]);
    if (valid) setStep((s) => s + 1);
    else toast.error("Please fix the errors before continuing");
  }

  function payload(d: Form, saveAsDraft: boolean) {
    return {
      customerId: d.customerId,
      locationId: d.locationId,
      salesPersonUserId: Number(d.salesPersonUserId) > 0 ? Number(d.salesPersonUserId) : null,
      orderDate: d.orderDate,
      deliveryDate: d.deliveryDate,
      methodId: d.methodId,
      notes: d.notes?.trim() || null,
      saveAsDraft,
      raiseInvoice: saveAsDraft ? false : d.raiseInvoice,
      lines: d.items.map((i) => ({
        productId: i.productId,
        qty: Number(i.qty) || 0,
        rate: Number(i.unitPrice) || 0,
        discountPercent: Number(i.discount) || 0,
        taxPercent: Number(i.taxPercent) || 0,
      })),
    };
  }

  type CreateResponse = {
    id: number; orderNo: string; status: string; onCreditHold: boolean;
    invoiceId: number | null; invoiceNo: string | null;
    invoicePdfUrl: string | null; invoiceShareUrl: string | null;
    message: string;
  };

  async function onSubmit(d: Form) {
    try {
      const res = await axios.post<CreateResponse>(
        `${API_BASE_URL}/sales/orders`, payload(d, false), { headers: authHeader() });

      if (res.data.onCreditHold) {
        toast.warning("Order placed on credit hold", { description: res.data.message });
      } else if (res.data.invoiceNo) {
        toast.success(`Order ${res.data.orderNo} submitted`, {
          description: `Invoice ${res.data.invoiceNo} generated for ${formatMoney(total)}.`,
        });
      } else {
        toast.success(`Order ${res.data.orderNo} submitted`, { description: res.data.message });
      }
      router.push(`/sales/orders/${res.data.id}`);
    } catch (e) {
      toast.error("Order not created", { description: apiMessage(e, "Please try again.") });
    }
  }

  /* Save as draft skips validation of the later steps -- a draft is a scratch
     pad, and demanding a delivery date before somebody can park a half-typed
     order is how drafts stop being used. */
  async function saveDraft() {
    const d = form.getValues();
    if (!d.customerId) { toast.error("Pick a customer first"); return; }
    if (!d.items.length) { toast.error("Add at least one item first"); return; }

    setSavingDraft(true);
    try {
      const res = await axios.post<CreateResponse>(
        `${API_BASE_URL}/sales/orders`,
        payload({ ...d, deliveryDate: d.deliveryDate || today(), orderDate: d.orderDate || today() }, true),
        { headers: authHeader() });
      toast.success("Saved as draft", { description: res.data.message });
      router.push(`/sales/orders/${res.data.id}`);
    } catch (e) {
      toast.error("Draft not saved", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSavingDraft(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Orders", href: "/sales/orders" }, { label: "New Order" }]}
        title="New Sales Order"
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/sales/orders"><X /> Cancel</Link></Button>
            <Button variant="secondary" onClick={saveDraft} disabled={savingDraft || loading}>
              {savingDraft ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : "Save as Draft"}
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
              <RefreshCw className="size-4" /> Try again
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Step indicator */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className={cn("flex items-center gap-2.5 group flex-shrink-0 outline-none", i <= step && "cursor-pointer")}
                >
                  <div className={cn(
                    "size-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                    i < step
                      ? "bg-success text-white"
                      : i === step
                      ? "bg-brand-yellow text-navy-900 ring-4 ring-brand-yellow/20"
                      : "bg-slate-100 dark:bg-navy-700 text-slate-400"
                  )}>
                    {i < step ? <Check className="size-4" /> : i + 1}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className={cn("text-2xs uppercase tracking-wider font-semibold",
                      i <= step ? "text-navy-900 dark:text-white" : "text-slate-400"
                    )}>Step {i + 1}</div>
                    <div className={cn("text-sm font-medium",
                      i <= step ? "text-navy-900 dark:text-white" : "text-slate-400"
                    )}>{s}</div>
                  </div>
                </button>
                {i < STEPS.length - 1 && <div className={cn("flex-1 h-0.5", i < step ? "bg-success" : "bg-slate-200 dark:bg-navy-700")} />}
              </React.Fragment>
            ))}
          </div>
        </CardBody>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6" noValidate>
          <div className="lg:col-span-2 space-y-6">
            {/* STEP 1 */}
            {step === 0 && (
              <>
                <Card>
                  <CardBody>
                    <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Customer <span className="text-danger">*</span></h3>
                    {loading ? (
                      <Skeleton className="h-16" />
                    ) : customer ? (
                      <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar initials={customer.name.slice(0, 2).toUpperCase()} size="md" />
                          <div>
                            <div className="font-semibold text-navy-900 dark:text-white">{customer.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {customer.code} · {customer.city}
                              {customer.creditDays > 0 && ` · NET ${customer.creditDays}`}
                            </div>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue("customerId", 0 as unknown as number)}>Change</Button>
                      </div>
                    ) : (
                      <Popover open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
                        <PopoverTrigger asChild>
                          <button type="button" className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 text-left hover:border-brand-yellow transition-colors">
                            <Search className="size-4 inline-block mr-2" />
                            Search customer by name or code…
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[440px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Type customer name…" />
                            <CommandList>
                              <CommandEmpty>No customer found.</CommandEmpty>
                              <CommandGroup heading={`${lookups.customers.length} customers`}>
                                {lookups.customers.map((p) => (
                                  <CommandItem key={p.id} value={`${p.name} ${p.code}`} onSelect={() => { form.setValue("customerId", p.id); setCustomerPickerOpen(false); }}>
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
                    <FormField control={form.control} name="customerId" render={() => <FormItem><FormMessage /></FormItem>} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <FormField control={form.control} name="locationId" render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Selling from</FormLabel>
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
                      <FormField control={form.control} name="salesPersonUserId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sales rep</FormLabel>
                          <FormControl>
                            {loading ? <Skeleton className="h-10" /> : (
                              <SelectNative {...field}>
                                <option value={0}>Me (whoever is signed in)</option>
                                {lookups.salesPeople.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </SelectNative>
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Items <span className="text-danger">*</span> ({fields.length})</h3>
                      <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="accent" size="sm" className="gap-1" disabled={loading}><Plus />Add Product</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[480px] p-0" align="end">
                          <Command>
                            <CommandInput placeholder="Search products by code or name…" />
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
                      <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg">
                        <ShoppingCart className="size-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No items added yet. Click <span className="font-semibold">&quot;Add Product&quot;</span> to start.</p>
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
                        {fields.map((field, idx) => <ItemRow key={field.id} idx={idx} control={form.control} onRemove={() => remove(idx)} />)}
                      </div>
                    )}
                    <FormField control={form.control} name="items" render={() => <FormItem><FormMessage /></FormItem>} />
                  </CardBody>
                </Card>
              </>
            )}

            {/* STEP 2 */}
            {step === 1 && (
              <Card>
                <CardBody>
                  <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Pricing, Payment & Dates</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <FormField control={form.control} name="orderDate" render={({ field }) => (
                      <FormItem><FormLabel required>Order date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="deliveryDate" render={({ field }) => (
                      <FormItem><FormLabel required>Delivery date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Notes (visible to the order team)</FormLabel>
                        <FormControl><Textarea rows={3} placeholder="Any special instructions" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-200 dark:border-navy-700 flex items-start justify-between gap-4">
                    <div>
                      <Label htmlFor="raise-invoice" className="!mb-0">Raise the invoice with this order</Label>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                        On by default. The invoice number is issued straight away and the bill is
                        generated and saved, so it can be printed or sent the moment the order is in.
                        Turn it off to invoice later from the order screen. An order that lands on
                        credit hold is never invoiced.
                      </p>
                    </div>
                    <FormField control={form.control} name="raiseInvoice" render={({ field }) => (
                      <Switch id="raise-invoice" checked={field.value} onCheckedChange={field.onChange} />
                    )} />
                  </div>
                </CardBody>
              </Card>
            )}

            {/* STEP 3 */}
            {step === 2 && (
              <>
                {willExceed && (
                  <Card className="bg-warning/5 border-warning/30">
                    <CardBody>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="size-5 flex-shrink-0 mt-0.5 text-warning" />
                        <div>
                          <h4 className="text-sm font-semibold text-warning-dark dark:text-warning-light">
                            This will go on credit hold
                          </h4>
                          <p className="text-sm mt-1 text-warning-dark/80 dark:text-warning-light/80">
                            {customer!.name} owes <span className="font-bold tabular">{formatMoney(customer!.outstanding)}</span> against
                            a limit of <span className="font-bold tabular">{formatMoney(customer!.creditLimit)}</span>.
                            This order takes them to <span className="font-bold tabular">{formatMoney(customer!.outstanding + total)}</span>,
                            so it will be saved on hold and land on the Limit Alerts queue for the owner to release.
                            No invoice is raised until it is.
                          </p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )}

                <Card>
                  <CardBody>
                    <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Review Order</h3>
                    <div className="space-y-2.5 text-sm">
                      <Row label="Customer" value={customer?.name ?? "—"} />
                      <Row label="Selling from" value={lookups.locations.find((l) => l.id === Number(locationId))?.name ?? "—"} />
                      <Row label="Items" value={`${items.length} products · ${items.reduce((s, i) => s + Number(i.qty), 0)} units`} />
                      <Row label="Payment method" value={method?.name ?? "—"} />
                      <Row label="Delivery date" value={deliveryDate} />
                      <Row label="Invoice" value={raiseInvoice ? "Raised with the order" : "Later, from the order screen"} />
                      <div className="border-t border-slate-200 dark:border-navy-700 pt-2.5 mt-2.5">
                        <Row label="Subtotal" value={formatMoney(subtotal)} />
                        {discountAmount > 0 && <Row label="Discount" value={`- ${formatMoney(discountAmount)}`} />}
                        <Row label="Sales tax" value={formatMoney(tax)} />
                        <div className="text-base font-bold mt-2">
                          <Row label="Total" value={formatMoney(total)} bold />
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="lg:sticky lg:top-20">
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Summary</h3>
                <div className="space-y-2 text-sm">
                  <Row label="Items" value={`${items.length}`} />
                  <Row label="Subtotal" value={formatMoney(subtotal)} />
                  {discountAmount > 0 && <Row label="Discount" value={`- ${formatMoney(discountAmount)}`} />}
                  <Row label="Sales tax" value={formatMoney(tax)} />
                  <div className="border-t border-slate-200 dark:border-navy-700 pt-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy-900 dark:text-white">Total</span>
                      <span className="tabular text-lg font-bold text-navy-900 dark:text-white">{formatMoney(total)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  {step < STEPS.length - 1 ? (
                    <Button type="button" variant="accent" size="md" className="w-full gap-1.5" onClick={nextStep} disabled={loading}>
                      Next: {STEPS[step + 1]} <ArrowRight />
                    </Button>
                  ) : (
                    <Button type="submit" variant="accent" size="md" className="w-full gap-1.5" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting
                        ? <><Loader2 className="size-4 animate-spin" /> Submitting…</>
                        : raiseInvoice ? <><FileText />Submit &amp; Invoice</> : <><Save />Submit Order</>}
                    </Button>
                  )}
                  {step > 0 && (
                    <Button type="button" variant="ghost" size="md" className="w-full gap-1.5" onClick={() => setStep(step - 1)}>
                      <ArrowLeft />Back
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>

            {customer && (
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Customer Status</h3>
                  <div className="space-y-2.5 text-sm">
                    <Row label="Credit limit" value={customer.creditLimit > 0 ? formatMoney(customer.creditLimit) : "No limit"} />
                    <Row label="Outstanding" value={formatMoney(customer.outstanding)} valueClass={customer.outstanding > 0 ? "text-warning" : undefined} />
                    <Row label="After this order" value={formatMoney(customer.outstanding + total)} valueClass={willExceed ? "text-danger" : "text-navy-900 dark:text-white"} bold />
                    <Row label="Hold policy" value={customer.holdPolicy} />
                  </div>
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
          <FormField control={control} name={`items.${idx}.sku`} render={({ field: f }) => (
            <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{f.value}</div>
          )} />
        </div>
      )} />
      <FormField control={control} name={`items.${idx}.qty`} render={({ field }) => (
        <FormItem className="col-span-3 sm:col-span-2">
          <FormLabel className="sm:hidden text-2xs">Qty</FormLabel>
          <FormControl><Input type="number" min={1} className="text-right tabular" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.unitPrice`} render={({ field }) => (
        <FormItem className="col-span-3 sm:col-span-2">
          <FormLabel className="sm:hidden text-2xs">Rate</FormLabel>
          <FormControl><Input type="number" step="0.01" min={0} className="text-right tabular" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.discount`} render={({ field }) => (
        <FormItem className="col-span-2 sm:col-span-1">
          <FormLabel className="sm:hidden text-2xs">Disc %</FormLabel>
          <FormControl><Input type="number" min={0} max={100} className="text-right tabular" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.taxPercent`} render={({ field }) => (
        <FormItem className="col-span-2 sm:col-span-1">
          <FormLabel className="sm:hidden text-2xs">Tax %</FormLabel>
          <FormControl><Input type="number" min={0} max={100} step="0.01" className="text-right tabular" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="col-span-1 sm:col-span-1 text-right tabular text-sm font-semibold text-navy-900 dark:text-white pt-2">
        {Math.round(amount).toLocaleString("en-PK")}
      </div>
      <Button type="button" variant="ghost" size="icon-sm" className="col-span-1 text-danger ml-auto mt-1" onClick={onRemove} aria-label="Remove item">
        <Trash2 />
      </Button>
    </div>
  );
}

function Row({ label, value, bold, valueClass }: { label: string; value: React.ReactNode; bold?: boolean; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-slate-500 dark:text-slate-400 text-sm", bold && "font-bold text-navy-900 dark:text-white")}>{label}</span>
      <span className={cn("tabular text-sm font-semibold text-navy-900 dark:text-white", valueClass)}>{value}</span>
    </div>
  );
}
