"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import { Save, ArrowLeft, Loader2, Plus, Trash2, ArrowRight, AlertCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { vizoResolver } from "@/lib/zod-resolver";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /inventory/lookups. The product picker and both location dropdowns used
   to read hard-coded arrays out of src/data -- so an item or a location added
   through the app could never be transferred, because it was not in the list.
   Fetched on every mount, which is what keeps this current. */
type LookupProduct = { id: number; sku: string; name: string; packing: number; totalStock: number };
type LookupLocation = { id: number; code: string; name: string };
type Lookups = { products: LookupProduct[]; locations: LookupLocation[] };

/* GET /inventory/stock-levels?locationId= -> what is actually on the source
   shelf, so the picker can show it and the form can refuse to move more. */
type StockRow = { productId: number; qty: number };

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
});

const Schema = z.object({
  fromLocationId: z.coerce.number().positive("Pick source"),
  toLocationId:   z.coerce.number().positive("Pick destination"),
  date: z.string().min(1),
  items: z.array(ItemSchema).min(1, "Add at least one item"),
  notes: z.string().max(500).optional(),
}).refine((d) => d.fromLocationId !== d.toLocationId, { message: "Source and destination must differ", path: ["toLocationId"] });

type Form = z.infer<typeof Schema>;

export default function NewTransferPage() {
  const router = useRouter();
  const [productOpen, setProductOpen] = React.useState(false);

  const [lookups, setLookups] = React.useState<Lookups>({ products: [], locations: [] });
  const [stock, setStock] = React.useState<Map<number, number>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      fromLocationId: 0,
      toLocationId: 0,
      date: new Date().toISOString().slice(0, 10),
      items: [],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");
  const fromId = form.watch("fromLocationId");
  const toId = form.watch("toLocationId");

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/inventory/lookups`, { headers: authHeader() });
      const locs = res.data.locations ?? [];
      setLookups({ products: res.data.products ?? [], locations: locs });
      /* Default off the real rows rather than assuming ids 1 and 2 exist. */
      form.setValue("fromLocationId", locs[0]?.id ?? 0);
      form.setValue("toLocationId", locs[1]?.id ?? locs[0]?.id ?? 0);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load products and locations."));
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

  /* Stock at the SOURCE location, re-read whenever that changes. */
  const loadStock = React.useCallback(async () => {
    if (!fromId) return;
    try {
      const res = await axios.get<{ items: StockRow[] }>(`${API_BASE_URL}/inventory/stock-levels`, {
        params: { locationId: fromId },
        headers: authHeader(),
      });
      setStock(new Map(res.data.items.map((r) => [r.productId, r.qty])));
    } catch {
      setStock(new Map());
    }
  }, [fromId]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       Same reason as above: this is the requested per-page fetch pattern. */
    void loadStock();
  }, [loadStock]);

  const fromWh = lookups.locations.find((w) => w.id === fromId);
  const toWh   = lookups.locations.find((w) => w.id === toId);

  function pickProduct(id: number) {
    const p = lookups.products.find((x) => x.id === id);
    if (!p) return;
    if (form.getValues("items").some((i) => i.productId === id)) {
      toast.info("That item is already on this transfer.");
      setProductOpen(false);
      return;
    }
    append({ productId: id, name: p.name, sku: p.sku, qty: 1 });
    setProductOpen(false);
  }

  async function onSubmit(d: Form) {
    /* The server checks this too, but saying it here names the item rather
       than failing the whole transfer over one line. */
    const short = d.items.find((i) => Number(i.qty) > (stock.get(i.productId) ?? 0));
    if (short) {
      toast.error("Not enough stock to move", {
        description: `${short.name}: ${fromWh?.name ?? "source"} holds ${stock.get(short.productId) ?? 0}, you asked for ${short.qty}.`,
      });
      return;
    }
    try {
      const res = await axios.post<{ id: number; message: string }>(
        `${API_BASE_URL}/inventory/transfers`,
        {
          fromLocationId: d.fromLocationId,
          toLocationId: d.toLocationId,
          transferDate: d.date,
          notes: d.notes?.trim() || null,
          lines: d.items.map((i) => ({ productId: i.productId, qty: Number(i.qty) || 0 })),
        },
        { headers: authHeader() }
      );
      toast.success("Transfer created", { description: res.data.message });
      router.push("/inventory/transfers");
    } catch (e) {
      toast.error("Transfer not created", { description: apiMessage(e, "Please try again.") });
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Transfers", href: "/inventory/transfers" }, { label: "New" }]}
        title="New Stock Transfer"
        subtitle="Move inventory between locations"
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/inventory/transfers"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting || loading}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Submitting…</> : <><Save />Submit for Approval</>}
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl" noValidate>
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Route</h3>
                <div className="grid grid-cols-12 gap-3 items-end">
                  <FormField control={form.control} name="fromLocationId" render={({ field }) => (
                    <FormItem className="col-span-12 sm:col-span-5"><FormLabel required>From</FormLabel><FormControl>
                      {loading ? <Skeleton className="h-10" /> : (
                        <SelectNative {...field}>{lookups.locations.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</SelectNative>
                      )}
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="col-span-12 sm:col-span-2 flex items-center justify-center pb-2">
                    <ArrowRight className="size-5 text-brand-yellow" />
                  </div>
                  <FormField control={form.control} name="toLocationId" render={({ field }) => (
                    <FormItem className="col-span-12 sm:col-span-5"><FormLabel required>To</FormLabel><FormControl>
                      {loading ? <Skeleton className="h-10" /> : (
                        <SelectNative {...field}>{lookups.locations.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</SelectNative>
                      )}
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem className="col-span-12"><FormLabel required>Transfer date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Items <span className="text-danger">*</span> ({fields.length})</h3>
                  <Popover open={productOpen} onOpenChange={setProductOpen}>
                    <PopoverTrigger asChild><Button type="button" variant="accent" size="sm" className="gap-1" disabled={loading}><Plus />Add</Button></PopoverTrigger>
                    <PopoverContent className="w-[480px] p-0">
                      <Command><CommandInput placeholder="Search product…" /><CommandList><CommandEmpty>No product found.</CommandEmpty><CommandGroup>
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
                      </CommandGroup></CommandList></Command>
                    </PopoverContent>
                  </Popover>
                </div>
                {fields.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm">Add items to transfer</div>
                ) : (
                  <div className="space-y-2">{fields.map((f, i) => <TransferRow key={f.id} idx={i} control={form.control} onRemove={() => remove(i)} />)}</div>
                )}
                <FormField control={form.control} name="items" render={() => <FormMessage />} />
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} placeholder="Reason for transfer, special handling, etc." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardBody>
            </Card>
          </div>

          <div>
            <Card className="lg:sticky lg:top-20">
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Summary</h3>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-slate-500">Items</span><span className="tabular font-medium">{fields.length}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Total units</span><span className="tabular font-bold">{items.reduce((s, i) => s + (Number(i.qty) || 0), 0)}</span></div>
                  <div className="pt-3 border-t border-slate-200 dark:border-navy-700">
                    <div className="text-2xs uppercase font-semibold text-slate-500">Route</div>
                    <div className="mt-1 text-xs text-navy-900 dark:text-white">
                      <div className="font-semibold">{fromWh?.name}</div>
                      <ArrowRight className="size-3 my-1 text-brand-yellow" />
                      <div className="font-semibold">{toWh?.name}</div>
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

function TransferRow({ idx, control, onRemove }: { idx: number; control: Control<Form>; onRemove: () => void }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center p-2 border border-slate-200 dark:border-navy-700 rounded-lg">
      <FormField control={control} name={`items.${idx}.name`} render={({ field }) => (
        <div className="col-span-12 sm:col-span-7">
          <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{field.value}</div>
          <FormField control={control} name={`items.${idx}.sku`} render={({ field: f }) => <div className="text-2xs tabular text-slate-500">{f.value}</div>} />
        </div>
      )} />
      <FormField control={control} name={`items.${idx}.qty`} render={({ field }) => (
        <FormItem className="col-span-10 sm:col-span-4"><FormControl><Input type="number" min={1} placeholder="Qty" className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <Button type="button" variant="ghost" size="icon-sm" className="col-span-2 sm:col-span-1 text-danger ml-auto" onClick={onRemove}><Trash2 /></Button>
    </div>
  );
}
