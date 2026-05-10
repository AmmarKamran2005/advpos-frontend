"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { z } from "zod";
import { Save, ArrowLeft, Loader2, Plus, Trash2, Search, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { vizoResolver } from "@/lib/zod-resolver";
import { products } from "@/data/products";
import { warehouses } from "@/data/admin";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const ItemSchema = z.object({
  productId: z.coerce.number().positive(),
  name: z.string(),
  sku: z.string(),
  currentQty: z.number(),
  newQty: z.coerce.number().min(0),
});

const Schema = z.object({
  warehouseId: z.coerce.number().positive(),
  date: z.string().min(1),
  reason: z.enum(["PHYSICAL_COUNT", "DAMAGED", "EXPIRED", "FOUND", "WRITE_OFF", "OTHER"]),
  reasonNotes: z.string().min(5).max(500),
  items: z.array(ItemSchema).min(1, "Add at least one item"),
});
type Form = z.infer<typeof Schema>;

export default function NewAdjustmentPage() {
  const router = useRouter();
  const [productOpen, setProductOpen] = React.useState(false);

  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      warehouseId: warehouses[0]?.id ?? 1,
      date: new Date().toISOString().slice(0, 10),
      reason: "PHYSICAL_COUNT",
      reasonNotes: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");

  function pickProduct(id: number) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    append({ productId: id, name: p.name, sku: p.sku, currentQty: p.totalStock, newQty: p.totalStock });
    setProductOpen(false);
  }

  const netDelta = items.reduce((s, i) => s + (i.newQty - i.currentQty), 0);

  async function onSubmit(_d: Form) {
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Adjustment posted", { description: `Net delta: ${netDelta > 0 ? "+" : ""}${netDelta} units` });
    router.push("/inventory/adjustments");
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Adjustments", href: "/inventory/adjustments" }, { label: "New" }]}
        title="New Stock Adjustment"
        subtitle="Manually correct stock — every adjustment posts a journal entry"
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/inventory/adjustments"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Posting…</> : <><Save />Post Adjustment</>}
            </Button>
          </>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6" noValidate>
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField control={form.control} name="warehouseId" render={({ field }) => (
                    <FormItem><FormLabel required>Warehouse</FormLabel><FormControl>
                      <SelectNative {...field}>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</SelectNative>
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><FormLabel required>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="reason" render={({ field }) => (
                    <FormItem><FormLabel required>Reason</FormLabel><FormControl>
                      <SelectNative {...field}>
                        <option value="PHYSICAL_COUNT">Physical count discrepancy</option>
                        <option value="DAMAGED">Damaged in handling</option>
                        <option value="EXPIRED">Expired write-off</option>
                        <option value="FOUND">Extra stock found</option>
                        <option value="WRITE_OFF">General write-off</option>
                        <option value="OTHER">Other</option>
                      </SelectNative>
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
                    <PopoverTrigger asChild><Button type="button" variant="accent" size="sm" className="gap-1"><Plus />Add</Button></PopoverTrigger>
                    <PopoverContent className="w-[480px] p-0">
                      <Command><CommandInput placeholder="Search product…" /><CommandList><CommandEmpty>No product found.</CommandEmpty><CommandGroup>
                        {products.slice(0, 30).map((p) => (
                          <CommandItem key={p.id} value={`${p.sku} ${p.name}`} onSelect={() => pickProduct(p.id)}>
                            <div className="flex-1"><div className="text-sm">{p.name}</div><div className="text-2xs tabular text-slate-500">{p.sku} · current {p.totalStock}</div></div>
                          </CommandItem>
                        ))}
                      </CommandGroup></CommandList></Command>
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
                  <span>Adjustments cannot be undone. A journal entry will be posted.</span>
                </div>
              </CardBody>
            </Card>
          </div>
        </form>
      </Form>
    </>
  );
}

function AdjRow({ idx, control, onRemove }: { idx: number; control: Control<Form>; onRemove: () => void }) {
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
