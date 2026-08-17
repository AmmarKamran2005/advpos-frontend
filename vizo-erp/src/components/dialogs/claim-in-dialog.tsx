"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { X, Info, PackageX } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
} from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { parties } from "@/data/parties";
import { products } from "@/data/products";
import { claimReasons, claimPolicy, getLocationByCode } from "@/data/settings";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const Schema = z.object({
  customerId: z.coerce.number().positive("Pick the customer"),
  productId: z.coerce.number().positive("Pick the item"),
  qty: z.coerce.number().positive("How many pieces?"),
  reason: z.string().min(1, "What is wrong with it?"),
  outcome: z.enum(["REPLACED_NOW", "CREDIT_NOTE", "WAITING"]),
  originalOrderNo: z.string().optional(),
  note: z.string().max(300, "Max 300 characters").optional(),
});

type ClaimForm = z.infer<typeof Schema>;

const OUTCOMES = [
  { value: "REPLACED_NOW", label: "Gave a replacement", hint: "New piece handed over now" },
  { value: "CREDIT_NOTE", label: "Gave credit", hint: "Adjusted against their balance" },
  { value: "WAITING", label: "Customer is waiting", hint: "Nothing given yet" },
] as const;

/**
 * A shopkeeper walks in with a dead piece. He does not know which invoice it
 * came on and will not be asked — the claim is recorded against the item.
 */
export function ClaimInDialog({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const customers = parties.filter((p) => p.type !== "SUPPLIER");
  const claimLocation = getLocationByCode("LOC-04");

  const form = useForm<ClaimForm>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      customerId: 0,
      productId: 0,
      qty: 1,
      reason: "dead",
      outcome: claimPolicy.replaceUpfront ? "REPLACED_NOW" : "WAITING",
      originalOrderNo: "",
      note: "",
    },
  });

  const productId = form.watch("productId");
  const qty = form.watch("qty");
  const reason = form.watch("reason");

  const product = products.find((p) => p.id === Number(productId));
  const value = product ? product.costPrice * (Number(qty) || 0) : 0;
  const reasonDef = claimReasons.find((r) => r.key === reason);

  function handleSubmit(data: ClaimForm) {
    const customer = customers.find((c) => c.id === Number(data.customerId));
    toast.success("Claim received", {
      description: `${data.qty} × ${product?.name ?? "item"} from ${customer?.displayName ?? "customer"} moved to ${claimLocation?.name}.`,
    });
    onOpenChange(false);
    form.reset();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <PackageX className="size-4 text-warning" />
            Receive a Claim
          </SheetTitle>
          <SheetDescription>
            Faulty pieces back from a shop. Recorded against the item, not an order.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="contents">
            <SheetBody>
              <FormField control={form.control} name="customerId" render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel required>Who brought it back?</FormLabel>
                  <FormControl>
                    <SelectNative {...field}>
                      <option value={0}>— Pick a customer —</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.displayName} · {c.partyCode}
                        </option>
                      ))}
                    </SelectNative>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="productId" render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel required>Which item?</FormLabel>
                  <FormControl>
                    <SelectNative {...field}>
                      <option value={0}>— Pick an item —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} · {p.name}
                        </option>
                      ))}
                    </SelectNative>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3 mb-4">
                <FormField control={form.control} name="qty" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>How many pieces?</FormLabel>
                    <FormControl><Input type="number" min={1} className="tabular" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div>
                  <FormLabel>Value</FormLabel>
                  <div className="mt-1.5 px-3 py-2 rounded-md bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 tabular text-sm font-semibold text-navy-900 dark:text-white">
                    {formatMoney(value)}
                  </div>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1">at cost</p>
                </div>
              </div>

              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel required>What is wrong with it?</FormLabel>
                  <FormControl>
                    <SelectNative {...field}>
                      {claimReasons.map((r) => (
                        <option key={r.key} value={r.key}>{r.label}</option>
                      ))}
                    </SelectNative>
                  </FormControl>
                  {reasonDef && !reasonDef.usuallyAccepted && (
                    <FormDescription className="text-warning">
                      Suppliers usually refuse this one. Take a photo before sending.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="outcome" render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel required>What did the customer get?</FormLabel>
                  <div className="space-y-1.5 mt-1.5">
                    {OUTCOMES.map((o) => {
                      const active = field.value === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => field.onChange(o.value)}
                          className={cn(
                            "w-full text-left p-2.5 rounded-lg border-2 transition-colors",
                            active
                              ? "border-brand-yellow bg-brand-yellow/5"
                              : "border-slate-200 dark:border-navy-700 hover:border-slate-300"
                          )}
                        >
                          <div className="text-sm font-medium text-navy-900 dark:text-white">
                            {o.label}
                          </div>
                          <div className="text-2xs text-slate-500 dark:text-slate-400">{o.hint}</div>
                        </button>
                      );
                    })}
                  </div>
                </FormItem>
              )} />

              <FormField control={form.control} name="originalOrderNo" render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Original order number</FormLabel>
                  <FormControl><Input placeholder="ORD-26-0142" className="tabular" {...field} /></FormControl>
                  <FormDescription>Only if the shop happens to remember. Not needed.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="note" render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="What the shopkeeper said" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-info/5 border border-info/25">
                <Info className="size-4 text-info flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  The pieces move into <span className="font-semibold">{claimLocation?.name}</span>,
                  which is not counted as sellable stock. You will be reminded to send them to the
                  supplier after {claimPolicy.remindUnsentAfterDays} days.
                </p>
              </div>
            </SheetBody>

            <SheetFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                <X /> Cancel
              </Button>
              <Button type="submit" variant="accent">Receive into claim stock</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
