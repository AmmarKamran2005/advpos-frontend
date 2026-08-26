"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { z } from "zod";
import {
  Save, Trash2, Search, Loader2, ArrowLeft, Undo2, AlertCircle, RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { vizoResolver } from "@/lib/zod-resolver";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate } from "@/lib/format";

/* Goods going back to a supplier, always against an invoice they already sent.
   The old form read a frozen array of invoices and asked for one "total
   amount" typed by hand; the API stores LINES and computes the credit itself,
   so nothing typed here reached the database. */
type OpenInvoice = {
  id: number; invoiceNo: string; supplierInvoiceNo: string | null;
  supplierId: number; supplierName: string; status: string; total: number; invoiceDate: string;
};
type InvoiceLine = { id: number; productId: number; sku: string; name: string; qty: number; unitCost: number };
type InvoiceDetail = { id: number; invoiceNo: string; supplierId: number; supplierName: string; lines: InvoiceLine[] };
type LookupLocation = { id: number; code: string; name: string };

const ItemSchema = z.object({
  productId: z.coerce.number().positive(),
  sku: z.string(),
  name: z.string(),
  billed: z.coerce.number().nonnegative(),
  qty: z.coerce.number().min(0),
  unitCost: z.coerce.number().nonnegative(),
}).refine((d) => d.qty <= d.billed, { message: "More than was billed", path: ["qty"] });

const Schema = z.object({
  piId: z.coerce.number({ message: "Pick an invoice" }).positive("Pick an invoice"),
  locationId: z.coerce.number().positive("Pick a location"),
  returnDate: z.string().min(1),
  reason: z.string().min(5, "Say why it is going back").max(500),
  items: z.array(ItemSchema).refine((i) => i.some((x) => x.qty > 0), { message: "Return at least one item" }),
});
type FormValues = z.infer<typeof Schema>;

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function NewPurchaseReturnPage() {
  const router = useRouter();
  const [pickInvoice, setPickInvoice] = React.useState(false);

  const [invoices, setInvoices] = React.useState<OpenInvoice[]>([]);
  const [locations, setLocations] = React.useState<LookupLocation[]>([]);
  const [invoice, setInvoice] = React.useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      piId: 0 as unknown as number,
      locationId: 0,
      returnDate: new Date().toISOString().slice(0, 10),
      reason: "",
      items: [],
    },
  });

  const { fields, replace } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");

  const load = React.useCallback(async () => {
    try {
      const [inv, lk] = await Promise.all([
        axios.get<OpenInvoice[] | { items: OpenInvoice[] }>(`${API_BASE_URL}/purchases/invoices`, { headers: authHeader() }),
        axios.get<{ locations: LookupLocation[] }>(`${API_BASE_URL}/purchases/lookups`, { headers: authHeader() }),
      ]);
      const rows = Array.isArray(inv.data) ? inv.data : inv.data.items;
      /* Only invoices that have actually been posted -- you cannot return goods
         against something still being drafted. */
      setInvoices(rows.filter((i) => i.status !== "DRAFT" && i.status !== "CANCELLED"));
      setLocations(lk.data.locations ?? []);
      form.setValue("locationId", lk.data.locations?.[0]?.id ?? 0);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load supplier invoices."));
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

  const creditTotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitCost) || 0), 0);

  async function choose(id: number) {
    setPickInvoice(false);
    try {
      const res = await axios.get<InvoiceDetail>(`${API_BASE_URL}/purchases/invoices/${id}`, { headers: authHeader() });
      setInvoice(res.data);
      form.setValue("piId", id);
      /* One row per billed line, starting at zero — you return some of an
         invoice far more often than all of it. */
      replace(res.data.lines.map((l) => ({
        productId: l.productId, sku: l.sku, name: l.name,
        billed: l.qty, qty: 0, unitCost: l.unitCost,
      })));
    } catch (e) {
      toast.error("Could not open that invoice", { description: apiMessage(e, "Please try again.") });
    }
  }

  async function onSubmit(d: FormValues) {
    const lines = d.items.filter((i) => (Number(i.qty) || 0) > 0);
    if (lines.length === 0) {
      toast.error("Nothing to return", { description: "Enter a quantity on at least one line." });
      return;
    }
    try {
      const res = await axios.post<{ id: number; message: string }>(
        `${API_BASE_URL}/purchases/returns`,
        {
          piId: d.piId,
          locationId: d.locationId,
          returnDate: d.returnDate,
          reason: d.reason.trim(),
          lines: lines.map((i) => ({
            productId: i.productId,
            qty: Number(i.qty) || 0,
            unitCost: Number(i.unitCost) || 0,
            taxPercent: 0,
          })),
        },
        { headers: authHeader() }
      );
      toast.success("Purchase return created", { description: res.data.message });
      router.push(`/purchases/returns/${res.data.id}`);
    } catch (e) {
      toast.error("Return not created", { description: apiMessage(e, "Please try again.") });
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Returns", href: "/purchases/returns" }, { label: "New Return" }]}
        title={<><Undo2 className="size-6 inline-block mr-2 text-brand-yellow" />Purchase Return</>}
        subtitle="Send goods back to a supplier and claim the credit"
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/purchases/returns"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting || loading}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save />Create Return</>}
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
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Which invoice?</h3>
                {invoice ? (
                  <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                    <div>
                      <div className="tabular text-base font-bold text-navy-900 dark:text-white">{invoice.invoiceNo}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{invoice.supplierName}</div>
                    </div>
                    <Button type="button" variant="ghost" size="sm"
                      onClick={() => { setInvoice(null); form.setValue("piId", 0 as unknown as number); replace([]); }}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <Popover open={pickInvoice} onOpenChange={setPickInvoice}>
                    <PopoverTrigger asChild>
                      <button type="button" disabled={loading}
                        className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 text-left hover:border-brand-yellow transition-colors disabled:opacity-60">
                        <Search className="size-4 inline-block mr-2" />Search a posted supplier invoice…
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[520px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Type invoice number…" />
                        <CommandList>
                          <CommandEmpty>No invoice found.</CommandEmpty>
                          <CommandGroup>
                            {invoices.map((i) => (
                              <CommandItem key={i.id} value={`${i.invoiceNo} ${i.supplierInvoiceNo ?? ""} ${i.supplierName}`}
                                onSelect={() => void choose(i.id)}>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-navy-900 dark:text-white">{i.invoiceNo}</div>
                                  <div className="text-2xs text-slate-500 dark:text-slate-400">
                                    {i.supplierName} · {formatDate(i.invoiceDate)}
                                  </div>
                                </div>
                                <span className="tabular text-2xs text-slate-500 dark:text-slate-400">{formatMoney(i.total)}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                <FormField control={form.control} name="piId" render={() => <FormMessage />} />
              </CardBody>
            </Card>

            {fields.length > 0 && (
              <>
                <Card>
                  <CardBody>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="returnDate" render={({ field }) => (
                        <FormItem><FormLabel required>Return date</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="locationId" render={({ field }) => (
                        <FormItem><FormLabel required>Going out of</FormLabel><FormControl>
                          {loading ? <Skeleton className="h-10" /> : (
                            <SelectNative {...field}>
                              {locations.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </SelectNative>
                          )}
                        </FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="reason" render={({ field }) => (
                        <FormItem className="sm:col-span-2"><FormLabel required>Why is it going back?</FormLabel>
                          <FormControl><Textarea rows={2} placeholder="e.g. Short in packing, wrong model sent, damaged in transit" {...field} /></FormControl>
                          <FormDescription>The supplier will be quoting this back at you, so be specific.</FormDescription>
                          <FormMessage /></FormItem>
                      )} />
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-1">What is going back</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                      Enter a quantity against the lines you are returning. Leave the rest at zero.
                    </p>
                    <div className="space-y-2">
                      {fields.map((f, i) => <ReturnRow key={f.id} idx={i} control={form.control} />)}
                    </div>
                    <FormField control={form.control} name="items" render={() => <FormMessage />} />
                  </CardBody>
                </Card>
              </>
            )}
          </div>

          <div>
            <Card className="lg:sticky lg:top-20">
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Credit claimed</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lines returning</span>
                    <span className="tabular font-medium">{items.filter((i) => (Number(i.qty) || 0) > 0).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Units</span>
                    <span className="tabular font-medium">{items.reduce((s, i) => s + (Number(i.qty) || 0), 0)}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-navy-700 pt-2 mt-2 flex justify-between">
                    <span className="font-bold text-navy-900 dark:text-white">Credit due</span>
                    <span className="tabular text-lg font-bold text-navy-900 dark:text-white">{formatMoney(creditTotal)}</span>
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

function ReturnRow({ idx, control }: { idx: number; control: Control<FormValues> }) {
  return (
    <FormField control={control} name={`items.${idx}.billed`} render={({ field: billedF }) => (
      <div className="grid grid-cols-12 gap-2 items-start p-2 border border-slate-200 dark:border-navy-700 rounded-lg">
        <FormField control={control} name={`items.${idx}.name`} render={({ field }) => (
          <div className="col-span-12 sm:col-span-6">
            <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{field.value}</div>
            <FormField control={control} name={`items.${idx}.sku`} render={({ field: f }) => (
              <div className="text-2xs tabular text-slate-500">{f.value}</div>
            )} />
          </div>
        )} />
        <div className="col-span-4 sm:col-span-2">
          <FormLabel className="text-2xs text-slate-500">Billed</FormLabel>
          <div className="tabular text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1">{billedF.value}</div>
        </div>
        <FormField control={control} name={`items.${idx}.qty`} render={({ field }) => (
          <FormItem className="col-span-4 sm:col-span-2">
            <FormLabel className="text-2xs">Returning</FormLabel>
            <FormControl><Input type="number" min={0} max={billedF.value} className="text-right tabular" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name={`items.${idx}.unitCost`} render={({ field }) => (
          <div className="col-span-4 sm:col-span-2">
            <FormLabel className="text-2xs text-slate-500">Unit cost</FormLabel>
            <div className="tabular text-sm text-slate-700 dark:text-slate-200 mt-1">{formatMoney(Number(field.value) || 0)}</div>
          </div>
        )} />
      </div>
    )} />
  );
}
