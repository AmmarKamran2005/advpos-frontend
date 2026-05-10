"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { z } from "zod";
import { Save, X, Plus, Trash2, Search, Loader2, ArrowLeft, FileText } from "lucide-react";
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
import { vizoResolver } from "@/lib/zod-resolver";
import { parties } from "@/data/parties";
import { products } from "@/data/products";
import { toast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  invoiceDate: z.string().min(1, "Date required"),
  dueDate: z.string().min(1, "Due date required"),
  items: z.array(ItemSchema).min(1, "Add at least one item"),
  paymentMethod: z.enum(["CREDIT", "CASH", "BANK", "EASYPAISA", "JAZZCASH"]),
  notes: z.string().max(500).optional(),
}).refine((d) => new Date(d.dueDate) >= new Date(d.invoiceDate), { message: "Due date must be on or after invoice date", path: ["dueDate"] });

type Form = z.infer<typeof Schema>;

export default function NewInvoicePage() {
  const router = useRouter();
  const [productOpen, setProductOpen] = React.useState(false);
  const [customerOpen, setCustomerOpen] = React.useState(false);

  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      customerId: 0 as unknown as number,
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      items: [],
      paymentMethod: "CREDIT",
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");
  const customerId = form.watch("customerId");
  const customer = parties.find((p) => p.id === customerId);
  const customers = parties.filter((p) => p.type === "CUSTOMER" || p.type === "BOTH");

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty * (1 - i.discount / 100), 0);
  const tax = items.reduce((s, i) => s + (i.unitPrice * i.qty * (1 - i.discount / 100) * (i.taxPercent / 100)), 0);
  const total = subtotal + tax;

  function pickProduct(id: number) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    append({ productId: id, name: p.name, sku: p.sku, qty: 1, unitPrice: p.salePrice, discount: 0, taxPercent: p.taxRatePercent });
    setProductOpen(false);
  }

  async function onSubmit(d: Form) {
    await new Promise((r) => setTimeout(r, 700));
    toast.success("Invoice created", { description: `INV-KHI-26-0143 of ${formatMoney(total)} created.` });
    router.push("/sales/invoices");
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Invoices", href: "/sales/invoices" }, { label: "New Invoice" }]}
        title={<><FileText className="size-6 inline-block mr-2 text-brand-yellow" />Direct Invoice</>}
        subtitle="Create an invoice without an upstream order"
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/sales/invoices"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save />Create Invoice</>}
            </Button>
          </>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6" noValidate>
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Customer & Dates</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormItem className="sm:col-span-2">
                    <FormLabel required>Customer</FormLabel>
                    {customer ? (
                      <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar initials={customer.initials} size="sm" />
                          <div>
                            <div className="font-medium text-navy-900 dark:text-white">{customer.legalName}</div>
                            <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{customer.partyCode}</div>
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
                        <PopoverContent className="w-[420px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Type customer name…" />
                            <CommandList>
                              <CommandEmpty>No customer found.</CommandEmpty>
                              <CommandGroup>
                                {customers.slice(0, 12).map((p) => (
                                  <CommandItem key={p.id} value={`${p.legalName} ${p.partyCode}`} onSelect={() => { form.setValue("customerId", p.id); setCustomerOpen(false); }}>
                                    <Avatar initials={p.initials} size="sm" />
                                    <div>
                                      <div className="text-sm font-medium text-navy-900 dark:text-white">{p.legalName}</div>
                                      <div className="text-2xs text-slate-500 dark:text-slate-400">{p.partyCode}</div>
                                    </div>
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
                  <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                    <FormItem><FormLabel required>Invoice date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem><FormLabel required>Due date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel required>Payment method</FormLabel>
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
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Items <span className="text-danger">*</span> ({fields.length})</h3>
                  <Popover open={productOpen} onOpenChange={setProductOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="accent" size="sm" className="gap-1"><Plus />Add Product</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[480px] p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Search products…" />
                        <CommandList>
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup>
                            {products.slice(0, 30).map((p) => (
                              <CommandItem key={p.id} value={`${p.sku} ${p.name}`} onSelect={() => pickProduct(p.id)}>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{p.name}</div>
                                  <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{p.sku}</div>
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
                    {fields.map((f, i) => <Row key={f.id} idx={i} control={form.control} onRemove={() => remove(i)} />)}
                  </div>
                )}
                <FormField control={form.control} name="items" render={() => <FormMessage />} />
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (visible on invoice)</FormLabel>
                    <FormControl><Textarea rows={3} placeholder="Payment terms, thank-you note, etc." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardBody>
            </Card>
          </div>

          <div>
            <Card className="lg:sticky lg:top-20">
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Summary</h3>
                <div className="space-y-2 text-sm">
                  <RowKV label="Items" v={`${fields.length}`} />
                  <RowKV label="Subtotal" v={formatMoney(subtotal)} />
                  <RowKV label="Tax (18%)" v={formatMoney(tax)} />
                  <div className="pt-2 border-t border-slate-200 dark:border-navy-700">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy-900 dark:text-white">Total Due</span>
                      <span className="tabular text-lg font-bold text-navy-900 dark:text-white">{formatMoney(total)}</span>
                    </div>
                  </div>
                </div>
                <Button type="submit" variant="accent" size="md" className="w-full mt-6 gap-1.5" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" />Submitting…</> : <><Save />Create Invoice</>}
                </Button>
                <Button type="button" variant="ghost" size="md" className="w-full mt-2 gap-1.5" asChild>
                  <Link href="/sales/invoices"><X />Cancel</Link>
                </Button>
              </CardBody>
            </Card>
          </div>
        </form>
      </Form>
    </>
  );
}

function Row({ idx, control, onRemove }: { idx: number; control: Control<Form>; onRemove: () => void }) {
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
        <FormItem className="col-span-4 sm:col-span-2"><FormControl><Input type="number" step="0.01" placeholder="Price" min={0} className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.discount`} render={({ field }) => (
        <FormItem className="col-span-3 sm:col-span-1"><FormControl><Input type="number" placeholder="%" min={0} max={100} className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.taxPercent`} render={({ field }) => (
        <FormItem className="col-span-2 sm:col-span-2"><FormControl><Input type="number" placeholder="Tax%" min={0} max={100} className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
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
