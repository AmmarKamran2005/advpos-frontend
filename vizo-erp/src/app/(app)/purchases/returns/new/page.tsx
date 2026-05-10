"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Save, ArrowLeft, Loader2, RotateCcw, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { vizoResolver } from "@/lib/zod-resolver";
import { purchaseInvoices } from "@/data/purchases";
import { toast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/format";

const Schema = z.object({
  invoiceId: z.coerce.number({ message: "Pick invoice" }).positive(),
  reason: z.enum(["DAMAGED", "EXPIRED", "WRONG_ITEM", "OVER_SUPPLIED", "OTHER"]),
  reasonNotes: z.string().min(5, "Describe in 5+ chars").max(500),
  totalAmount: z.coerce.number().positive(),
});
type Form = z.infer<typeof Schema>;

export default function NewPurchaseReturnPage() {
  const router = useRouter();
  const [pickInvoice, setPickInvoice] = React.useState(false);
  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      invoiceId: 0 as unknown as number,
      reason: "DAMAGED", reasonNotes: "", totalAmount: 0,
    },
  });

  const invoiceId = form.watch("invoiceId");
  const invoice = purchaseInvoices.find((i) => i.id === invoiceId);

  async function onSubmit(_d: Form) {
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Purchase return created", { description: "Debit note will be sent to supplier on approval." });
    router.push("/purchases/returns");
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Returns", href: "/purchases/returns" }, { label: "New Return" }]}
        title={<><RotateCcw className="size-6 inline-block mr-2 text-brand-yellow" />Purchase Return (Debit Note)</>}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/purchases/returns"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save />Submit Return</>}
            </Button>
          </>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl" noValidate>
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Original Purchase Invoice <span className="text-danger">*</span></h3>
              {invoice ? (
                <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                  <div>
                    <div className="tabular text-base font-bold text-navy-900 dark:text-white">{invoice.invoiceNo}</div>
                    <div className="text-xs text-slate-500">{invoice.supplierName} · {formatMoney(invoice.total)}</div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue("invoiceId", 0 as unknown as number)}>Change</Button>
                </div>
              ) : (
                <Popover open={pickInvoice} onOpenChange={setPickInvoice}>
                  <PopoverTrigger asChild>
                    <button type="button" className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm text-slate-500 text-left hover:border-brand-yellow"><Search className="size-4 inline-block mr-2" />Pick a posted purchase invoice…</button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0">
                    <Command><CommandInput placeholder="Search invoice…" /><CommandList><CommandEmpty>No invoice found.</CommandEmpty><CommandGroup>
                      {purchaseInvoices.filter((p) => p.status === "POSTED" || p.status === "PARTIAL").map((p) => (
                        <CommandItem key={p.id} value={p.invoiceNo} onSelect={() => { form.setValue("invoiceId", p.id); setPickInvoice(false); }}>
                          <span className="tabular text-sm font-medium">{p.invoiceNo}</span>
                          <span className="text-xs text-slate-500">· {p.supplierName}</span>
                          <span className="ml-auto tabular text-xs">{formatMoney(p.total)}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup></CommandList></Command>
                  </PopoverContent>
                </Popover>
              )}
              <FormField control={form.control} name="invoiceId" render={() => <FormMessage />} />
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Return Details</h3>
              <div className="space-y-4">
                <FormField control={form.control} name="reason" render={({ field }) => (
                  <FormItem><FormLabel required>Reason</FormLabel><FormControl>
                    <SelectNative {...field}>
                      <option value="DAMAGED">Damaged in transit</option>
                      <option value="EXPIRED">Expired stock</option>
                      <option value="WRONG_ITEM">Wrong item shipped</option>
                      <option value="OVER_SUPPLIED">Over-supplied</option>
                      <option value="OTHER">Other</option>
                    </SelectNative>
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="reasonNotes" render={({ field }) => (
                  <FormItem><FormLabel required>Detailed notes</FormLabel><FormControl><Textarea rows={3} placeholder="Describe what's being returned and why" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="totalAmount" render={({ field }) => (
                  <FormItem><FormLabel required>Return amount (PKR)</FormLabel><FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardBody>
          </Card>
        </form>
      </Form>
    </>
  );
}
