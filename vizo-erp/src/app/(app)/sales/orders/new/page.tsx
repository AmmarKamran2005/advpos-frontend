"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import {
  Save, X, Plus, Trash2, Search, Check, ArrowRight, ArrowLeft,
  AlertTriangle, Loader2, ShoppingCart,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { parties } from "@/data/parties";
import { products } from "@/data/products";
import { toast } from "@/components/ui/toaster";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  items: z.array(ItemSchema).min(1, "Add at least one item"),
  globalDiscountPercent: z.coerce.number().min(0).max(100),
  paymentMethod: z.enum(["CREDIT", "CASH", "BANK", "EASYPAISA", "JAZZCASH"]),
  deliveryDate: z.string().min(1, "Delivery date required"),
  notes: z.string().max(500, "Max 500 characters").optional(),
});

type Form = z.infer<typeof Schema>;

export default function NewOrderPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [productPickerOpen, setProductPickerOpen] = React.useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = React.useState(false);

  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    mode: "onChange",
    defaultValues: {
      customerId: 0 as unknown as number,
      items: [],
      globalDiscountPercent: 0,
      paymentMethod: "CREDIT",
      deliveryDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");
  const customerId = form.watch("customerId");
  const globalDiscount = form.watch("globalDiscountPercent");

  const customer = parties.find((p) => p.id === customerId);
  const customers = parties.filter((p) => p.type === "CUSTOMER" || p.type === "BOTH");

  /* Calculations */
  const subtotalRaw = items.reduce(
    (s, i) => s + (i.unitPrice * i.qty * (1 - (i.discount || 0) / 100)),
    0
  );
  const globalDiscountAmount = subtotalRaw * (globalDiscount / 100);
  const subtotal = subtotalRaw - globalDiscountAmount;
  const tax = items.reduce(
    (s, i) => s + (i.unitPrice * i.qty * (1 - (i.discount || 0) / 100) * (1 - globalDiscount / 100) * (i.taxPercent / 100)),
    0
  );
  const total = subtotal + tax;

  /* Credit check */
  const willExceed = customer && customer.creditLimit > 0 && (customer.currentBalance + total) > customer.creditLimit;
  const willBlock = willExceed && customer!.creditHoldPolicy === "BLOCK";

  function pickProduct(productId: number) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const exists = items.findIndex((i) => i.productId === productId);
    if (exists >= 0) {
      form.setValue(`items.${exists}.qty`, items[exists].qty + 1);
    } else {
      append({
        productId, name: p.name, sku: p.sku, qty: 1,
        unitPrice: p.salePrice, discount: 0, taxPercent: p.taxRatePercent,
      });
    }
    setProductPickerOpen(false);
  }

  async function nextStep() {
    let valid = false;
    if (step === 0) valid = await form.trigger(["customerId", "items"]);
    else if (step === 1) valid = await form.trigger(["paymentMethod", "deliveryDate"]);
    if (valid) setStep((s) => s + 1);
    else toast.error("Please fix errors before continuing");
  }

  async function onSubmit(d: Form) {
    await new Promise((r) => setTimeout(r, 800));
    if (willBlock) {
      toast.warning("Order placed on credit hold", {
        description: "Customer credit limit exceeded — accountant override needed.",
      });
    } else {
      toast.success("Order submitted", { description: `Order ORD-26-0143 of ${formatMoney(total)} created.` });
    }
    router.push("/sales/orders");
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Orders", href: "/sales/orders" }, { label: "New Order" }]}
        title="New Sales Order"
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/sales/orders"><X /> Cancel</Link></Button>
            <Button variant="secondary" onClick={() => toast.info("Saved as draft")}>Save as Draft</Button>
          </>
        }
      />

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
                    {customer ? (
                      <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar initials={customer.initials} size="md" />
                          <div>
                            <div className="font-semibold text-navy-900 dark:text-white">{customer.legalName}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {customer.partyCode} · {customer.category} · {customer.city}
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
                        <PopoverContent className="w-[420px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Type customer name…" />
                            <CommandList>
                              <CommandEmpty>No customer found.</CommandEmpty>
                              <CommandGroup heading={`${customers.length} customers`}>
                                {customers.slice(0, 12).map((p) => (
                                  <CommandItem key={p.id} value={`${p.legalName} ${p.partyCode}`} onSelect={() => { form.setValue("customerId", p.id); setCustomerPickerOpen(false); }}>
                                    <Avatar initials={p.initials} size="sm" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{p.legalName}</div>
                                      <div className="text-2xs text-slate-500 dark:text-slate-400">{p.partyCode} · {p.city}</div>
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
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Items <span className="text-danger">*</span> ({fields.length})</h3>
                      <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="accent" size="sm" className="gap-1"><Plus />Add Product</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[480px] p-0" align="end">
                          <Command>
                            <CommandInput placeholder="Search products by SKU or name…" />
                            <CommandList>
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup>
                                {products.slice(0, 30).map((p) => (
                                  <CommandItem key={p.id} value={`${p.sku} ${p.name}`} onSelect={() => pickProduct(p.id)}>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{p.name}</div>
                                      <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{p.sku} · stock: {p.totalStock}</div>
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
                  <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Pricing & Tax</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="globalDiscountPercent" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overall Discount (%)</FormLabel>
                        <FormControl><Input type="number" min={0} max={100} step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Payment Method</FormLabel>
                        <FormControl>
                          <SelectNative {...field}>
                            <option value="CREDIT">Credit (NET 30)</option>
                            <option value="CASH">Cash</option>
                            <option value="BANK">Bank Transfer</option>
                            <option value="EASYPAISA">Easypaisa</option>
                            <option value="JAZZCASH">JazzCash</option>
                          </SelectNative>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="deliveryDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Delivery Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Internal Notes</FormLabel>
                        <FormControl><Textarea rows={3} placeholder="Any special instructions for the order team" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardBody>
              </Card>
            )}

            {/* STEP 3 */}
            {step === 2 && (
              <>
                {willExceed && (
                  <Card className={cn(willBlock ? "bg-danger/5 border-danger/30" : "bg-warning/5 border-warning/30")}>
                    <CardBody>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={cn("size-5 flex-shrink-0 mt-0.5", willBlock ? "text-danger" : "text-warning")} />
                        <div>
                          <h4 className={cn("text-sm font-semibold", willBlock ? "text-danger-dark dark:text-danger-light" : "text-warning-dark dark:text-warning-light")}>
                            {willBlock ? "Credit limit BLOCKED" : "Credit limit warning"}
                          </h4>
                          <p className={cn("text-sm mt-1", willBlock ? "text-danger-dark/80 dark:text-danger-light/80" : "text-warning-dark/80 dark:text-warning-light/80")}>
                            This order will push the customer over their credit limit ({formatMoney(customer!.creditLimit)}).
                            Outstanding after this order: <span className="font-bold tabular">{formatMoney(customer!.currentBalance + total)}</span>.
                            {willBlock ? " The order will go on CREDIT_HOLD and require accountant override." : " The order will be flagged but allowed."}
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
                      <Row label="Customer" value={customer?.legalName ?? "—"} />
                      <Row label="Items" value={`${items.length} products · ${items.reduce((s, i) => s + Number(i.qty), 0)} units`} />
                      <Row label="Payment Method" value={form.watch("paymentMethod")} />
                      <Row label="Delivery Date" value={form.watch("deliveryDate")} />
                      <div className="border-t border-slate-200 dark:border-navy-700 pt-2.5 mt-2.5">
                        <Row label="Subtotal" value={formatMoney(subtotal)} />
                        <Row label="Tax" value={formatMoney(tax)} />
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
                  <Row label="Tax" value={formatMoney(tax)} />
                  <div className="border-t border-slate-200 dark:border-navy-700 pt-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy-900 dark:text-white">Total</span>
                      <span className="tabular text-lg font-bold text-navy-900 dark:text-white">{formatMoney(total)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  {step < STEPS.length - 1 ? (
                    <Button type="button" variant="accent" size="md" className="w-full gap-1.5" onClick={nextStep}>
                      Next: {STEPS[step + 1]} <ArrowRight />
                    </Button>
                  ) : (
                    <Button type="submit" variant="accent" size="md" className="w-full gap-1.5" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Submitting…</> : <><Save />Submit Order</>}
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
                    <Row label="Credit Limit" value={formatMoney(customer.creditLimit)} />
                    <Row label="Outstanding" value={formatMoney(customer.currentBalance)} valueClass="text-warning" />
                    <Row label="After this order" value={formatMoney(customer.currentBalance + total)} valueClass={cn(willExceed ? "text-danger" : "text-navy-900 dark:text-white")} bold />
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
        <FormItem className="col-span-3 sm:col-span-2"><FormControl><Input type="number" placeholder="Qty" min={1} className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.unitPrice`} render={({ field }) => (
        <FormItem className="col-span-4 sm:col-span-2"><FormControl><Input type="number" step="0.01" placeholder="Price" min={0} className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.discount`} render={({ field }) => (
        <FormItem className="col-span-3 sm:col-span-1"><FormControl><Input type="number" placeholder="%" min={0} max={100} className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.taxPercent`} render={({ field }) => (
        <FormItem className="col-span-2 sm:col-span-1"><FormControl><Input type="number" placeholder="Tax" min={0} max={100} className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <Button type="button" variant="ghost" size="icon-sm" className="col-span-1 sm:col-span-1 text-danger ml-auto" onClick={onRemove} aria-label="Remove item">
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
