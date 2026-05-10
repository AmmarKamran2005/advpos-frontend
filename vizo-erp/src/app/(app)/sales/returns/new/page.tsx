"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { z } from "zod";
import { Save, X, Search, Trash2, ArrowLeft, Loader2, Plus, AlertCircle, Package, Trash, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Badge } from "@/components/ui/badge";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { vizoResolver } from "@/lib/zod-resolver";
import { invoices } from "@/data/sales";
import { warehouses } from "@/data/admin";
import { toast } from "@/components/ui/toaster";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const SAMPLE_INVOICE_LINES = [
  { invoiceItemId: 1, sku: "VZ-TIT-T9-BLK",  name: "VIZO Titan T9 Wireless Earbuds — Black", originalQty: 50,  unitPrice: 980 },
  { invoiceItemId: 2, sku: "VZ-VLT-65W-PD",  name: "VIZO VOLT 65W GaN Type-C Charger",       originalQty: 20,  unitPrice: 2480 },
  { invoiceItemId: 3, sku: "VZ-VR-TC-1.5M",  name: "VIZO VR Type-C Data Cable 1.5m",         originalQty: 100, unitPrice: 195 },
];

const ItemSchema = z.object({
  invoiceItemId: z.number(),
  sku: z.string(),
  name: z.string(),
  originalQty: z.number(),
  unitPrice: z.number(),
  qtyReturning: z.coerce.number().min(0).max(99999),
  condition: z.enum(["RESALABLE", "DAMAGED", "EXPIRED", "MISSING"]),
  restockWarehouseId: z.coerce.number().optional().or(z.literal("")),
}).refine((d) => d.qtyReturning <= d.originalQty, { message: "Cannot return more than original qty", path: ["qtyReturning"] });

const Schema = z.object({
  invoiceId: z.coerce.number({ message: "Pick an invoice" }).positive("Pick an invoice"),
  reason: z.string().min(5, "Please describe why this is being returned").max(500),
  refundMethod: z.enum(["CASH", "BANK", "EASYPAISA", "JAZZCASH", "CREDIT_NOTE"]),
  items: z.array(ItemSchema)
    .refine((items) => items.some((i) => i.qtyReturning > 0), { message: "Set return qty for at least one item" }),
});
type Form = z.infer<typeof Schema>;

export default function NewSalesReturnPage() {
  const router = useRouter();
  const [pickInvoice, setPickInvoice] = React.useState(false);

  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      invoiceId: 0 as unknown as number,
      reason: "",
      refundMethod: "CREDIT_NOTE",
      items: [],
    },
  });

  const { fields, replace } = useFieldArray({ control: form.control, name: "items" });
  const invoiceId = form.watch("invoiceId");
  const items = form.watch("items");
  const invoice = invoices.find((i) => i.id === invoiceId);

  const totalAmount = items.reduce((s, i) => s + i.qtyReturning * i.unitPrice, 0);
  const resalableUnits = items.reduce((s, i) => s + (i.condition === "RESALABLE" ? i.qtyReturning : 0), 0);
  const damagedUnits   = items.reduce((s, i) => s + (i.condition !== "RESALABLE" ? i.qtyReturning : 0), 0);

  function pickInv(id: number) {
    form.setValue("invoiceId", id);
    replace(SAMPLE_INVOICE_LINES.map((l) => ({ ...l, qtyReturning: 0, condition: "RESALABLE" as const, restockWarehouseId: warehouses[0]?.id ?? 0 })));
    setPickInvoice(false);
  }

  async function onSubmit(d: Form) {
    if (totalAmount === 0) {
      toast.error("Set a return quantity for at least one item");
      return;
    }
    await new Promise((r) => setTimeout(r, 700));
    toast.success("Return created", { description: `${formatMoney(totalAmount)} via ${d.refundMethod}` });
    router.push("/sales/returns");
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Returns", href: "/sales/returns" }, { label: "New Return" }]}
        title={<><RotateCcw className="size-6 inline-block mr-2 text-brand-yellow" />Sales Return</>}
        subtitle="Partial return with per-line condition tracking"
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/sales/returns"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save />Submit Return</>}
            </Button>
          </>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6" noValidate>
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Original Invoice <span className="text-danger">*</span></h3>
                {invoice ? (
                  <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                    <div>
                      <div className="tabular text-base font-bold text-navy-900 dark:text-white">{invoice.invoiceNo}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{invoice.customerName} · {formatDate(invoice.invoiceDate)} · {formatMoney(invoice.total)}</div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { form.setValue("invoiceId", 0 as unknown as number); replace([]); }}>Change</Button>
                  </div>
                ) : (
                  <Popover open={pickInvoice} onOpenChange={setPickInvoice}>
                    <PopoverTrigger asChild>
                      <button type="button" className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 text-left hover:border-brand-yellow transition-colors">
                        <Search className="size-4 inline-block mr-2" />Search invoice by number or customer…
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Type invoice number…" />
                        <CommandList>
                          <CommandEmpty>No invoice found.</CommandEmpty>
                          <CommandGroup>
                            {invoices.slice(0, 12).map((inv) => (
                              <CommandItem key={inv.id} value={`${inv.invoiceNo} ${inv.customerName}`} onSelect={() => pickInv(inv.id)}>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{inv.invoiceNo}</div>
                                  <div className="text-2xs text-slate-500 dark:text-slate-400">{inv.customerName} · {formatDate(inv.invoiceDate)}</div>
                                </div>
                                <span className="tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(inv.total)}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                <FormField control={form.control} name="invoiceId" render={() => <FormMessage />} />
              </CardBody>
            </Card>

            {fields.length > 0 && (
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Return Items</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Set the return quantity per line and the condition. RESALABLE goes back to a warehouse; DAMAGED/EXPIRED/MISSING gets written off.</p>
                  <div className="space-y-3">
                    {fields.map((f, idx) => <ReturnRow key={f.id} idx={idx} control={form.control} />)}
                  </div>
                  <FormField control={form.control} name="items" render={() => <FormMessage />} />
                </CardBody>
              </Card>
            )}

            <Card>
              <CardBody>
                <FormField control={form.control} name="reason" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Reason for return</FormLabel>
                    <FormControl><Textarea rows={3} placeholder="Customer reason / inspection notes" {...field} /></FormControl>
                    <FormDescription>This is logged and shown on the credit note</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardBody>
            </Card>
          </div>

          <div>
            <Card className="lg:sticky lg:top-20">
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Refund</h3>
                <FormField control={form.control} name="refundMethod" render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel required>Refund method</FormLabel>
                    <FormControl>
                      <SelectNative {...field}>
                        <option value="CREDIT_NOTE">Credit Note (apply to next invoice)</option>
                        <option value="CASH">Cash refund</option>
                        <option value="BANK">Bank transfer</option>
                        <option value="EASYPAISA">Easypaisa</option>
                        <option value="JAZZCASH">JazzCash</option>
                      </SelectNative>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="space-y-2 text-sm">
                  <RowKV label="Items returning" v={`${items.filter((i) => i.qtyReturning > 0).length}`} />
                  <RowKV label="Resalable units" v={`${resalableUnits}`} colorClass={resalableUnits > 0 ? "text-success" : ""} />
                  <RowKV label="Damaged/Lost units" v={`${damagedUnits}`} colorClass={damagedUnits > 0 ? "text-danger" : ""} />
                  <div className="pt-3 border-t border-slate-200 dark:border-navy-700">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy-900 dark:text-white">Refund total</span>
                      <span className="tabular text-lg font-bold text-warning">{formatMoney(totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {totalAmount === 0 && fields.length > 0 && (
              <Card className="bg-warning/5 border-warning/30 mt-4">
                <CardBody>
                  <div className="flex items-start gap-2 text-xs text-warning-dark dark:text-warning-light">
                    <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
                    <span>Set a return quantity ≥ 1 on at least one line.</span>
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

function ReturnRow({ idx, control }: { idx: number; control: Control<Form> }) {
  return (
    <FormField control={control} name={`items.${idx}.qtyReturning`} render={({ field: qtyF }) => {
      return (
        <div className="grid grid-cols-12 gap-2 items-start p-2 border border-slate-200 dark:border-navy-700 rounded-lg">
          <FormField control={control} name={`items.${idx}.name`} render={({ field }) => (
            <div className="col-span-12 sm:col-span-4">
              <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{field.value}</div>
              <FormField control={control} name={`items.${idx}.sku`} render={({ field: f }) => (
                <FormField control={control} name={`items.${idx}.originalQty`} render={({ field: og }) => (
                  <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">{f.value} · Sold {og.value}</div>
                )} />
              )} />
            </div>
          )} />
          <FormItem className="col-span-3 sm:col-span-2">
            <FormControl><Input type="number" min={0} placeholder="0" className="text-right tabular" {...qtyF} /></FormControl>
            <FormMessage />
          </FormItem>
          <FormField control={control} name={`items.${idx}.condition`} render={({ field }) => {
            const conditionVar = field.value === "RESALABLE" ? "success" : field.value === "DAMAGED" ? "danger" : field.value === "EXPIRED" ? "warning" : "muted";
            return (
              <FormItem className="col-span-5 sm:col-span-3">
                <FormControl>
                  <SelectNative {...field}>
                    <option value="RESALABLE">✓ Resalable</option>
                    <option value="DAMAGED">⚠ Damaged</option>
                    <option value="EXPIRED">⏱ Expired</option>
                    <option value="MISSING">? Missing</option>
                  </SelectNative>
                </FormControl>
                <Badge variant={conditionVar} className="mt-1">{field.value}</Badge>
              </FormItem>
            );
          }} />
          <FormField control={control} name={`items.${idx}.restockWarehouseId`} render={({ field }) => (
            <FormItem className="col-span-4 sm:col-span-3">
              <FormControl>
                <SelectNative {...field}>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
                </SelectNative>
              </FormControl>
              <div className="text-2xs text-slate-500 mt-0.5">Restock to</div>
            </FormItem>
          )} />
        </div>
      );
    }} />
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
