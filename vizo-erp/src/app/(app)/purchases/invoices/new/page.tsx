"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Save, ArrowLeft, Loader2, FileText, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Avatar } from "@/components/ui/avatar";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { vizoResolver } from "@/lib/zod-resolver";
import { parties } from "@/data/parties";
import { grns, purchaseOrders } from "@/data/purchases";
import { toast } from "@/components/ui/toaster";
import { formatMoney, formatDate } from "@/lib/format";

const Schema = z.object({
  supplierId: z.coerce.number({ message: "Pick supplier" }).positive(),
  grnId: z.coerce.number().optional().or(z.literal("")),
  poNo: z.string().optional().or(z.literal("")),
  supplierInvoiceNo: z.string().min(1, "Required"),
  invoiceDate: z.string().min(1, "Required"),
  dueDate: z.string().min(1, "Required"),
  subtotal: z.coerce.number().nonnegative(),
  taxAmount: z.coerce.number().nonnegative(),
  shippingAmount: z.coerce.number().min(0),
  whtAmount: z.coerce.number().min(0),
  paymentMethod: z.enum(["CREDIT", "CASH", "BANK", "EASYPAISA", "JAZZCASH"]),
  notes: z.string().max(500).optional(),
});
type Form = z.infer<typeof Schema>;

export default function NewPurchaseInvoicePage() {
  const router = useRouter();
  const [supplierOpen, setSupplierOpen] = React.useState(false);
  const [grnOpen, setGrnOpen] = React.useState(false);
  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      supplierId: 0 as unknown as number, grnId: "", poNo: "",
      supplierInvoiceNo: "",
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      subtotal: 0, taxAmount: 0, shippingAmount: 0, whtAmount: 0,
      paymentMethod: "CREDIT", notes: "",
    },
  });

  const supplierId = form.watch("supplierId");
  const supplier = parties.find((p) => p.id === supplierId);
  const suppliers = parties.filter((p) => p.type === "SUPPLIER" || p.type === "BOTH");
  const subtotal = Number(form.watch("subtotal")) || 0;
  const tax      = Number(form.watch("taxAmount")) || 0;
  const shipping = Number(form.watch("shippingAmount")) || 0;
  const wht      = Number(form.watch("whtAmount")) || 0;
  const total = subtotal + tax + shipping - wht;

  async function onSubmit(_d: Form) {
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Purchase invoice created", { description: `Total: ${formatMoney(total)}` });
    router.push("/purchases/invoices");
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Invoices", href: "/purchases/invoices" }, { label: "New PI" }]}
        title={<><FileText className="size-6 inline-block mr-2 text-brand-yellow" />Purchase Invoice</>}
        subtitle="Record a supplier bill"
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/purchases/invoices"><ArrowLeft />Back</Link></Button>
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
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Supplier & Reference</h3>
                <FormItem className="mb-4">
                  <FormLabel required>Supplier</FormLabel>
                  {supplier ? (
                    <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar initials={supplier.initials} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-navy-900 dark:text-white">{supplier.legalName}</div>
                          <div className="text-2xs text-slate-500">{supplier.partyCode}</div>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue("supplierId", 0 as unknown as number)}>Change</Button>
                    </div>
                  ) : (
                    <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
                      <PopoverTrigger asChild>
                        <button type="button" className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm text-slate-500 text-left hover:border-brand-yellow"><Search className="size-4 inline-block mr-2" />Search supplier…</button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[420px] p-0" align="start">
                        <Command><CommandInput placeholder="Type supplier name…" /><CommandList><CommandEmpty>No supplier found.</CommandEmpty><CommandGroup>
                          {suppliers.map((p) => (
                            <CommandItem key={p.id} value={p.legalName} onSelect={() => { form.setValue("supplierId", p.id); setSupplierOpen(false); }}>
                              <Avatar initials={p.initials} size="sm" />
                              <span className="text-sm font-medium">{p.legalName}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup></CommandList></Command>
                      </PopoverContent>
                    </Popover>
                  )}
                  <FormField control={form.control} name="supplierId" render={() => <FormMessage />} />
                </FormItem>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="supplierInvoiceNo" render={({ field }) => (
                    <FormItem><FormLabel required>Supplier Invoice #</FormLabel><FormControl><Input placeholder="The number on the paper bill" {...field} /></FormControl><FormDescription>e.g. SEH-INV-2026-1842</FormDescription><FormMessage /></FormItem>
                  )} />
                  <FormItem>
                    <FormLabel>Linked GRN</FormLabel>
                    <Popover open={grnOpen} onOpenChange={setGrnOpen}>
                      <PopoverTrigger asChild>
                        <button type="button" className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-sm text-left text-slate-500 dark:text-slate-400">
                          <Search className="size-3.5 inline-block mr-2" />
                          {form.watch("grnId") ? `GRN #${form.watch("grnId")}` : "Optional — link to GRN"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command><CommandInput placeholder="Search GRN…" /><CommandList><CommandEmpty>No GRN found.</CommandEmpty><CommandGroup>
                          {grns.map((g) => (
                            <CommandItem key={g.id} value={g.grnNo} onSelect={() => { form.setValue("grnId", g.id); form.setValue("poNo", g.poNo); setGrnOpen(false); }}>
                              <span className="tabular text-sm">{g.grnNo}</span>
                              <span className="text-xs text-slate-500">· {g.supplierName}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup></CommandList></Command>
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                  <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                    <FormItem><FormLabel required>Invoice date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem><FormLabel required>Due date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel required>Payment method</FormLabel><FormControl>
                      <SelectNative {...field}>
                        <option value="CREDIT">Credit (NET 30)</option>
                        <option value="CASH">Cash</option>
                        <option value="BANK">Bank Transfer</option>
                        <option value="EASYPAISA">Easypaisa</option>
                        <option value="JAZZCASH">JazzCash</option>
                      </SelectNative>
                    </FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Amounts</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="subtotal" render={({ field }) => (
                    <FormItem><FormLabel required>Subtotal (excl. tax)</FormLabel><FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="taxAmount" render={({ field }) => (
                    <FormItem><FormLabel>Sales tax</FormLabel><FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="shippingAmount" render={({ field }) => (
                    <FormItem><FormLabel>Shipping & other</FormLabel><FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="whtAmount" render={({ field }) => (
                    <FormItem><FormLabel>WHT (4.5%)</FormLabel><FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl><FormDescription>Withholding tax to deduct</FormDescription><FormMessage /></FormItem>
                  )} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardBody>
            </Card>
          </div>

          <div>
            <Card className="lg:sticky lg:top-20">
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Total</h3>
                <div className="space-y-2 text-sm">
                  <RowKV label="Subtotal" v={formatMoney(subtotal)} />
                  <RowKV label="Tax" v={formatMoney(tax)} />
                  <RowKV label="Shipping" v={formatMoney(shipping)} />
                  <RowKV label="WHT" v={`-${formatMoney(wht)}`} colorClass="text-warning" />
                  <div className="pt-2 border-t border-slate-200 dark:border-navy-700">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Net Payable</span>
                      <span className="tabular text-lg font-bold">{formatMoney(total)}</span>
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

function RowKV({ label, v, colorClass }: { label: string; v: string; colorClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`tabular font-medium text-navy-900 dark:text-white ${colorClass ?? ""}`}>{v}</span>
    </div>
  );
}
