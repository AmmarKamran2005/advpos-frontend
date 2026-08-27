"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { z } from "zod";
import { Save, ArrowLeft, Loader2, Plus, Trash2, AlertTriangle, AlertCircle, RefreshCw } from "lucide-react";
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
import { cn } from "@/lib/utils";

/* GET /inventory/lookups.
   `products` used to be a hard-coded array imported from src/data/products, so
   an item added on the New Product screen could not be adjusted at all -- it
   was simply missing from this picker. Same for locations and the reason list,
   which was six <option> tags written into the page while the database carries
   the AdjustmentReason rows that the API actually validates against. */
type LookupProduct = { id: number; sku: string; name: string; packing: number; costPrice: number; totalStock: number };
type LookupLocation = { id: number; code: string; name: string };
type LookupReason = { id: number; key: string; name: string };

type Lookups = {
  products: LookupProduct[];
  locations: LookupLocation[];
  adjustmentReasons: LookupReason[];
};

/* GET /inventory/stock-levels?locationId= -> what is on the shelf AT THAT
   LOCATION. The old form showed the product's total across every location as
   "current", which is not the number anybody counting one shelf would see. */
type StockRow = { productId: number; qty: number };

const ItemSchema = z.object({
  productId: z.coerce.number().positive(),
  name: z.string(),
  sku: z.string(),
  currentQty: z.number(),
  newQty: z.coerce.number().min(0),
});

const Schema = z.object({
  locationId: z.coerce.number().positive("Pick a location"),
  date: z.string().min(1),
  reasonId: z.coerce.number().positive("Pick a reason"),
  reasonNotes: z.string().min(5, "Say what happened — this is the audit trail").max(500),
  items: z.array(ItemSchema).min(1, "Add at least one item"),
});
type FormValues = z.infer<typeof Schema>;

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function NewAdjustmentPage() {
  const router = useRouter();
  const [productOpen, setProductOpen] = React.useState(false);

  const [lookups, setLookups] = React.useState<Lookups>({ products: [], locations: [], adjustmentReasons: [] });
  const [stock, setStock] = React.useState<Map<number, number>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      locationId: 0,
      date: new Date().toISOString().slice(0, 10),
      reasonId: 0,
      reasonNotes: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");
  const locationId = form.watch("locationId");

  /* ── lookups: every mount, so a product added a minute ago is here ── */
  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/inventory/lookups`, { headers: authHeader() });
      setLookups({
        products: res.data.products ?? [],
        locations: res.data.locations ?? [],
        adjustmentReasons: res.data.adjustmentReasons ?? [],
      });
      /* Default to the first real location and reason rather than guessing an
         id that may not exist in this database. */
      form.setValue("locationId", res.data.locations?.[0]?.id ?? 0);
      form.setValue("reasonId", res.data.adjustmentReasons?.[0]?.id ?? 0);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load products, locations and reasons."));
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

  /* ── per-location stock, re-read whenever the location changes ── */
  const loadStock = React.useCallback(async () => {
    if (!locationId) return;
    try {
      const res = await axios.get<{ items: StockRow[] }>(`${API_BASE_URL}/inventory/stock-levels`, {
        params: { locationId },
        headers: authHeader(),
      });
      setStock(new Map(res.data.items.map((r) => [r.productId, r.qty])));
    } catch {
      /* Not fatal: the server re-reads the true quantity when it posts, so a
         missing figure here costs a hint, not correctness. */
      setStock(new Map());
    }
  }, [locationId]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       Same reason as above: this is the requested per-page fetch pattern. */
    void loadStock();
  }, [loadStock]);

  /* Lines already added keep showing the count for the location they were
     added under, so re-point them when the location changes. */
  React.useEffect(() => {
    const current = form.getValues("items");
    if (current.length === 0) return;
    current.forEach((it, i) => {
      /* eslint-disable-next-line react-hooks/set-state-in-effect --
         Same requested pattern; this keeps the "current" column honest. */
      form.setValue(`items.${i}.currentQty`, stock.get(it.productId) ?? 0);
    });
  }, [stock, form]);

  function pickProduct(id: number) {
    const p = lookups.products.find((x) => x.id === id);
    if (!p) return;
    if (form.getValues("items").some((i) => i.productId === id)) {
      toast.info("That item is already on this adjustment.");
      setProductOpen(false);
      return;
    }
    const current = stock.get(id) ?? 0;
    append({ productId: id, name: p.name, sku: p.sku, currentQty: current, newQty: current });
    setProductOpen(false);
  }

  const netDelta = items.reduce((s, i) => s + ((Number(i.newQty) || 0) - i.currentQty), 0);

  async function onSubmit(d: FormValues) {
    try {
      const res = await axios.post<{ id: number; message: string }>(
        `${API_BASE_URL}/inventory/adjustments`,
        {
          locationId: d.locationId,
          adjustmentDate: d.date,
          reasonId: d.reasonId,
          reasonNotes: d.reasonNotes.trim(),
          lines: d.items.map((i) => ({ productId: i.productId, newQty: Number(i.newQty) || 0 })),
        },
        { headers: authHeader() }
      );
      toast.success("Adjustment posted", { description: res.data.message });
      router.push("/inventory/adjustments");
    } catch (e) {
      toast.error("Adjustment not posted", { description: apiMessage(e, "Please try again.") });
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Adjustments", href: "/inventory/adjustments" }, { label: "New" }]}
        title="New Stock Adjustment"
        subtitle="Manually correct stock — every adjustment posts a stock movement"
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/inventory/adjustments"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting || loading}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Posting…</> : <><Save />Post Adjustment</>}
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField control={form.control} name="locationId" render={({ field }) => (
                    <FormItem><FormLabel required>Location</FormLabel><FormControl>
                      {loading ? <Skeleton className="h-10" /> : (
                        <SelectNative {...field}>
                          {lookups.locations.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </SelectNative>
                      )}
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><FormLabel required>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="reasonId" render={({ field }) => (
                    <FormItem><FormLabel required>Reason</FormLabel><FormControl>
                      {loading ? <Skeleton className="h-10" /> : (
                        <SelectNative {...field}>
                          {lookups.adjustmentReasons.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </SelectNative>
                      )}
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="reasonNotes" render={({ field }) => (
                    <FormItem className="sm:col-span-3"><FormLabel required>Detailed notes</FormLabel><FormControl><Textarea rows={2} placeholder="Be specific — this is logged in the audit trail" {...field} /></FormControl><FormMessage /></FormItem>
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
                      <Button type="button" variant="accent" size="sm" className="gap-1" disabled={loading}><Plus />Add</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[480px] p-0">
                      <Command>
                        <CommandInput placeholder="Search product…" />
                        <CommandList>
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup>
                            {/* Whole active catalogue, straight off the API. */}
                            {lookups.products.map((p) => (
                              <CommandItem key={p.id} value={`${p.sku} ${p.name}`} onSelect={() => pickProduct(p.id)}>
                                <div className="flex-1">
                                  <div className="text-sm">{p.name}</div>
                                  <div className="text-2xs tabular text-slate-500">
                                    {p.sku} · here {stock.get(p.id) ?? 0} · all locations {p.totalStock}
                                  </div>
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
                  <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm">Add items to adjust</div>
                ) : (
                  <div className="space-y-2">{fields.map((f, i) => <AdjRow key={f.id} idx={i} control={form.control} onRemove={() => remove(i)} />)}</div>
                )}
                <FormField control={form.control} name="items" render={() => <FormMessage />} />
              </CardBody>
            </Card>
          </div>

          <div>
            <Card className="lg:sticky lg:top-20">
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Items</span><span className="tabular font-medium">{fields.length}</span></div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Net delta</span>
                    <span className={cn("tabular font-bold text-base", netDelta > 0 ? "text-success" : netDelta < 0 ? "text-danger" : "text-slate-600")}>
                      {netDelta > 0 ? "+" : ""}{netDelta} units
                    </span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-warning/5 border border-warning/30 rounded-lg flex items-start gap-2 text-xs text-warning-dark dark:text-warning-light">
                  <AlertTriangle className="size-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    Adjustments cannot be undone. The server re-reads what is actually on the shelf as it
                    posts, so if somebody sells the same item while this form is open, their sale is not
                    silently overwritten.
                  </span>
                </div>
              </CardBody>
            </Card>
          </div>
        </form>
      </Form>
    </>
  );
}

function AdjRow({ idx, control, onRemove }: { idx: number; control: Control<FormValues>; onRemove: () => void }) {
  return (
    <FormField control={control} name={`items.${idx}.newQty`} render={({ field: newQtyF }) => (
      <FormField control={control} name={`items.${idx}.currentQty`} render={({ field: curF }) => {
        const delta = (Number(newQtyF.value) || 0) - curF.value;
        return (
          <div className="grid grid-cols-12 gap-2 items-center p-2 border border-slate-200 dark:border-navy-700 rounded-lg">
            <FormField control={control} name={`items.${idx}.name`} render={({ field }) => (
              <div className="col-span-12 sm:col-span-5">
                <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{field.value}</div>
                <FormField control={control} name={`items.${idx}.sku`} render={({ field: f }) => <div className="text-2xs tabular text-slate-500">{f.value}</div>} />
              </div>
            )} />
            <div className="col-span-3 sm:col-span-2">
              <FormLabel className="text-2xs text-slate-500">Current</FormLabel>
              <div className="tabular text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1">{curF.value}</div>
            </div>
            <FormItem className="col-span-3 sm:col-span-2">
              <FormLabel className="text-2xs">New qty</FormLabel>
              <FormControl><Input type="number" min={0} className="text-right tabular" {...newQtyF} /></FormControl>
              <FormMessage />
            </FormItem>
            <div className="col-span-5 sm:col-span-2">
              <FormLabel className="text-2xs text-slate-500">Δ Delta</FormLabel>
              <FormDescription>
                <span className={cn("tabular text-sm font-bold", delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-slate-500")}>
                  {delta > 0 ? "+" : ""}{delta}
                </span>
              </FormDescription>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" className="col-span-1 ml-auto text-danger" onClick={onRemove}><Trash2 /></Button>
          </div>
        );
      }} />
    )} />
  );
}
