"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray, useWatch, type Control } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import {
  Save, Search, ArrowLeft, Loader2, AlertCircle, RotateCcw, RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { vizoResolver } from "@/lib/zod-resolver";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* Three live sources, none of them mock:
     GET /sales/invoices          the invoice picker
     GET /sales/invoices/{id}     the real lines of the invoice being returned,
                                  including how many of each have ALREADY come
                                  back, so nothing can be returned twice
     GET /sales/lookups           conditions, locations, refund methods

   This screen used to build its lines from a three-item array called
   SAMPLE_INVOICE_LINES -- whatever invoice you picked, you were offered the
   same three products, and submitting saved nothing. */
type InvoiceRow = {
  id: number; invoiceNo: string; customerName: string; customerInitials: string;
  invoiceDate: string; total: number; status: string;
};

type InvoiceLine = {
  id: number; productId: number; name: string; sku: string;
  qty: number; rate: number; returnedQty: number;
};

type InvoiceDetail = {
  id: number; invoiceNo: string; customerId: number; customerName: string;
  invoiceDate: string; total: number; locationId: number; location: string;
  lines: InvoiceLine[];
};

type Lookups = {
  locations: { id: number; code: string; name: string; kind: string; isSellable: boolean }[];
  paymentMethods: { id: number; key: string; name: string; kind: string }[];
  conditions: { id: number; key: string; name: string; isResalable: boolean }[];
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const ItemSchema = z.object({
  productId: z.coerce.number(),
  sku: z.string(),
  name: z.string(),
  soldQty: z.coerce.number(),
  alreadyReturned: z.coerce.number(),
  unitPrice: z.coerce.number(),
  qtyReturning: z.coerce.number().min(0).max(99999),
  conditionId: z.coerce.number(),
  restockLocationId: z.coerce.number(),
}).refine((d) => d.qtyReturning <= d.soldQty - d.alreadyReturned, {
  message: "More than is left to return",
  path: ["qtyReturning"],
});

const Schema = z.object({
  invoiceId: z.coerce.number({ message: "Pick an invoice" }).positive("Pick an invoice"),
  locationId: z.coerce.number().positive("Pick a location"),
  returnDate: z.string().min(1, "Date required"),
  reason: z.string().min(5, "Please describe why this is being returned").max(300),
  refundMethodId: z.coerce.number().positive("Pick a refund method"),
  items: z.array(ItemSchema)
    .refine((items) => items.some((i) => i.qtyReturning > 0), { message: "Set a return qty on at least one line" }),
});
type Form = z.infer<typeof Schema>;

export default function NewSalesReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselect = Number(searchParams.get("invoiceId") ?? 0);

  const [pickInvoice, setPickInvoice] = React.useState(false);
  const [invoices, setInvoices] = React.useState<InvoiceRow[]>([]);
  const [lookups, setLookups] = React.useState<Lookups>({ locations: [], paymentMethods: [], conditions: [] });
  const [invoice, setInvoice] = React.useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingLines, setLoadingLines] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      invoiceId: 0 as unknown as number,
      locationId: 0,
      returnDate: new Date().toISOString().slice(0, 10),
      reason: "",
      refundMethodId: 0,
      items: [],
    },
  });

  const { fields, replace } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");

  const load = React.useCallback(async () => {
    try {
      const [inv, look] = await Promise.all([
        axios.get<{ items: InvoiceRow[] }>(`${API_BASE_URL}/sales/invoices`,
          { params: { pageSize: 200, walkIn: "all" }, headers: authHeader() }),
        axios.get<Lookups>(`${API_BASE_URL}/sales/lookups`, { headers: authHeader() }),
      ]);
      setInvoices(inv.data.items ?? []);
      setLookups({
        locations: look.data.locations ?? [],
        paymentMethods: look.data.paymentMethods ?? [],
        conditions: look.data.conditions ?? [],
      });
      form.setValue("locationId", look.data.locations?.[0]?.id ?? 0);
      const creditNote = look.data.paymentMethods?.find((m) => m.key === "CREDIT_NOTE");
      form.setValue("refundMethodId", creditNote?.id ?? look.data.paymentMethods?.[0]?.id ?? 0);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load invoices and refund methods."));
    } finally {
      setLoading(false);
    }
  }, [form]);

  React.useEffect(() => {
    void load();
  }, [load]);

  /* The lines come from the invoice being returned, not from a fixed list.
     `returnedQty` is what has already come back on an earlier return -- the
     API enforces the same ceiling, this is so the operator sees it first. */
  const pickInv = React.useCallback(async (id: number) => {
    setPickInvoice(false);
    setLoadingLines(true);
    try {
      const res = await axios.get<InvoiceDetail>(`${API_BASE_URL}/sales/invoices/${id}`, { headers: authHeader() });
      setInvoice(res.data);
      form.setValue("invoiceId", id);
      if (res.data.locationId) form.setValue("locationId", res.data.locationId);

      const resalable = lookups.conditions.find((c) => c.isResalable) ?? lookups.conditions[0];
      const defaultLocation = res.data.locationId || lookups.locations[0]?.id || 0;

      replace(res.data.lines.map((l) => ({
        productId: l.productId,
        sku: l.sku,
        name: l.name,
        soldQty: l.qty,
        alreadyReturned: l.returnedQty,
        unitPrice: l.rate,
        qtyReturning: 0,
        conditionId: resalable?.id ?? 0,
        restockLocationId: defaultLocation,
      })));
    } catch (e) {
      toast.error("Could not open that invoice", { description: apiMessage(e, "Please try again.") });
    } finally {
      setLoadingLines(false);
    }
  }, [form, replace, lookups]);

  /* Deep-linked from the invoice screen: /sales/returns/new?invoiceId=14 */
  const [prefilled, setPrefilled] = React.useState(false);
  if (preselect > 0 && !prefilled && !loading && lookups.conditions.length > 0) {
    setPrefilled(true);
    void pickInv(preselect);
  }

  const totalAmount = items.reduce((s, i) => s + (Number(i.qtyReturning) || 0) * i.unitPrice, 0);
  const resalableIds = new Set(lookups.conditions.filter((c) => c.isResalable).map((c) => c.id));
  const resalableUnits = items.reduce((s, i) => s + (resalableIds.has(Number(i.conditionId)) ? Number(i.qtyReturning) || 0 : 0), 0);
  const damagedUnits = items.reduce((s, i) => s + (!resalableIds.has(Number(i.conditionId)) ? Number(i.qtyReturning) || 0 : 0), 0);

  async function onSubmit(d: Form) {
    const lines = d.items
      .filter((i) => Number(i.qtyReturning) > 0)
      .map((i) => ({
        productId: i.productId,
        qty: Number(i.qtyReturning),
        rate: Number(i.unitPrice),
        conditionId: Number(i.conditionId),
        restockLocationId: Number(i.restockLocationId) || null,
      }));

    if (lines.length === 0) {
      toast.error("Set a return quantity on at least one line");
      return;
    }

    try {
      const res = await axios.post<{ id: number; returnNo: string; totalAmount: number; message: string }>(
        `${API_BASE_URL}/sales/returns`,
        {
          invoiceId: d.invoiceId,
          locationId: d.locationId,
          returnDate: d.returnDate,
          reason: d.reason.trim(),
          refundMethodId: d.refundMethodId,
          lines,
        },
        { headers: authHeader() });

      toast.success(`Return ${res.data.returnNo} created`, { description: res.data.message });
      router.push(`/sales/returns/${res.data.id}`);
    } catch (e) {
      toast.error("Return not created", { description: apiMessage(e, "Please try again.") });
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Returns", href: "/sales/returns" }, { label: "New Return" }]}
        title={<><RotateCcw className="size-6 inline-block mr-2 text-brand-yellow" />Sales Return</>}
        subtitle="Partial return with per-line condition tracking. Resalable units go back on the shelf; the rest are written off."
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/sales/returns"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting || loading}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save />Submit Return</>}
            </Button>
          </>
        }
      />

      {error && (
        <Card className="mb-6 border-danger/40">
          <CardBody className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
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
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Original Invoice <span className="text-danger">*</span></h3>
                {loading ? (
                  <Skeleton className="h-16" />
                ) : invoice ? (
                  <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                    <div>
                      <div className="tabular text-base font-bold text-navy-900 dark:text-white">{invoice.invoiceNo}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {invoice.customerName} · {formatDate(invoice.invoiceDate)} · {formatMoney(invoice.total)}
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm"
                      onClick={() => { form.setValue("invoiceId", 0 as unknown as number); setInvoice(null); replace([]); }}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <Popover open={pickInvoice} onOpenChange={setPickInvoice}>
                    <PopoverTrigger asChild>
                      <button type="button" className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 text-left hover:border-brand-yellow transition-colors">
                        <Search className="size-4 inline-block mr-2" />Search invoice by number or customer…
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[520px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Type an invoice number…" />
                        <CommandList>
                          <CommandEmpty>No invoice found.</CommandEmpty>
                          <CommandGroup heading={`${invoices.length} invoices`}>
                            {invoices.map((inv) => (
                              <CommandItem key={inv.id} value={`${inv.invoiceNo} ${inv.customerName}`} onSelect={() => void pickInv(inv.id)}>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <FormField control={form.control} name="locationId" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Taking goods back into</FormLabel>
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
                  <FormField control={form.control} name="returnDate" render={({ field }) => (
                    <FormItem><FormLabel required>Return date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </CardBody>
            </Card>

            {loadingLines ? (
              <Card><CardBody className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
              </CardBody></Card>
            ) : fields.length > 0 ? (
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Return Items</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Set the return quantity per line and the condition. Resalable goes back to a
                    location; damaged, expired and missing are written off so the loss stays visible.
                  </p>
                  <div className="space-y-3">
                    {fields.map((f, idx) => (
                      <ReturnRow key={f.id} idx={idx} control={form.control}
                        conditions={lookups.conditions} locations={lookups.locations} />
                    ))}
                  </div>
                  <FormField control={form.control} name="items" render={() => <FormMessage />} />
                </CardBody>
              </Card>
            ) : invoice ? (
              <Card><CardBody>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
                  That invoice has no lines to return.
                </p>
              </CardBody></Card>
            ) : null}

            <Card>
              <CardBody>
                <FormField control={form.control} name="reason" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Reason for return</FormLabel>
                    <FormControl><Textarea rows={3} placeholder="Customer reason / inspection notes" {...field} /></FormControl>
                    <FormDescription>Logged against the return and shown on the credit note</FormDescription>
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
                <FormField control={form.control} name="refundMethodId" render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel required>Refund method</FormLabel>
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

                <div className="space-y-2 text-sm">
                  <RowKV label="Lines returning" v={`${items.filter((i) => Number(i.qtyReturning) > 0).length}`} />
                  <RowKV label="Resalable units" v={`${resalableUnits}`} colorClass={resalableUnits > 0 ? "text-success" : ""} />
                  <RowKV label="Damaged / lost units" v={`${damagedUnits}`} colorClass={damagedUnits > 0 ? "text-danger" : ""} />
                  <div className="pt-3 border-t border-slate-200 dark:border-navy-700">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy-900 dark:text-white">Refund total</span>
                      <span className="tabular text-lg font-bold text-warning">{formatMoney(totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-4">
                  A new return is saved as a draft. It has to be approved before the refund goes out,
                  and rejecting one takes any restocked units back off the shelf.
                </p>
              </CardBody>
            </Card>

            {totalAmount === 0 && fields.length > 0 && (
              <Card className="bg-warning/5 border-warning/30 mt-4">
                <CardBody>
                  <div className="flex items-start gap-2 text-xs text-warning-dark dark:text-warning-light">
                    <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
                    <span>Set a return quantity of at least 1 on one of the lines.</span>
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

function ReturnRow({
  idx, control, conditions, locations,
}: {
  idx: number;
  control: Control<Form>;
  conditions: { id: number; key: string; name: string; isResalable: boolean }[];
  locations: { id: number; code: string; name: string; kind: string; isSellable: boolean }[];
}) {
  const sold = useWatch({ control, name: `items.${idx}.soldQty` });
  const already = useWatch({ control, name: `items.${idx}.alreadyReturned` });
  const conditionId = useWatch({ control, name: `items.${idx}.conditionId` });
  const qty = useWatch({ control, name: `items.${idx}.qtyReturning` });

  const remaining = Number(sold) - Number(already);
  const condition = conditions.find((c) => c.id === Number(conditionId));
  const resalable = condition?.isResalable ?? false;

  const badgeVariant = !condition ? "muted"
    : condition.isResalable ? "success"
    : condition.key === "DAMAGED" ? "danger"
    : condition.key === "EXPIRED" ? "warning"
    : "muted";

  return (
    <div className={cn(
      "grid grid-cols-12 gap-2 items-start p-2 border rounded-lg",
      remaining <= 0 ? "border-slate-200 dark:border-navy-700 opacity-60" : "border-slate-200 dark:border-navy-700"
    )}>
      <FormField control={control} name={`items.${idx}.name`} render={({ field }) => (
        <div className="col-span-12 sm:col-span-4">
          <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{field.value}</div>
          <FormField control={control} name={`items.${idx}.sku`} render={({ field: f }) => (
            <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">
              {f.value} · sold {sold}
              {Number(already) > 0 && <span className="text-warning"> · {already} already back</span>}
              {remaining <= 0 && <span className="text-danger"> · nothing left to return</span>}
            </div>
          )} />
        </div>
      )} />

      <FormField control={control} name={`items.${idx}.qtyReturning`} render={({ field }) => (
        <FormItem className="col-span-3 sm:col-span-2">
          <FormControl>
            <Input type="number" min={0} max={remaining} placeholder="0"
              className="text-right tabular" disabled={remaining <= 0} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={control} name={`items.${idx}.conditionId`} render={({ field }) => (
        <FormItem className="col-span-5 sm:col-span-3">
          <FormControl>
            <SelectNative {...field} disabled={remaining <= 0}>
              {conditions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectNative>
          </FormControl>
          <Badge variant={badgeVariant} className="mt-1">
            {resalable ? "Back on the shelf" : "Written off"}
          </Badge>
        </FormItem>
      )} />

      <FormField control={control} name={`items.${idx}.restockLocationId`} render={({ field }) => (
        <FormItem className="col-span-4 sm:col-span-2">
          <FormControl>
            <SelectNative {...field} disabled={!resalable || remaining <= 0}>
              {locations.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
            </SelectNative>
          </FormControl>
          <div className="text-2xs text-slate-500 mt-0.5">{resalable ? "Restock to" : "—"}</div>
        </FormItem>
      )} />

      <FormField control={control} name={`items.${idx}.unitPrice`} render={({ field }) => (
        <div className="col-span-4 sm:col-span-1 text-right tabular text-sm font-semibold text-navy-900 dark:text-white pt-2">
          {Math.round((Number(field.value) || 0) * (Number(qty) || 0)).toLocaleString("en-PK")}
        </div>
      )} />
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
