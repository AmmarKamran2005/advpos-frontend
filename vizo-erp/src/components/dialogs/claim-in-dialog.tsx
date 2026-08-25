"use client";

import * as React from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { X, Info, PackageX, Loader2, AlertCircle } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
} from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /claims/lookups — customers, products, reasons, outcomes and the claim
   policy, all off the database. Reason and outcome are sent as ids because
   "Claim" stores ReasonId / OutcomeId, not keys. */
type Lookups = {
  reasons: { id: number; key: string; name: string; usuallyAccepted: boolean }[];
  outcomes: { id: number; key: string; name: string }[];
  customers: { id: number; code: string; name: string }[];
  products: { id: number; sku: string; name: string; costPrice: number }[];
  policy: { remindUnsentAfterDays: number; replaceUpfront: boolean };
};

const Schema = z.object({
  customerId: z.coerce.number().positive("Pick the customer"),
  productId: z.coerce.number().positive("Pick the item"),
  qty: z.coerce.number().positive("How many pieces?"),
  reasonId: z.coerce.number().positive("What is wrong with it?"),
  outcomeId: z.coerce.number().positive("What did the customer get?"),
  originalOrderNo: z.string().optional(),
  note: z.string().max(300, "Max 300 characters").optional(),
});

type ClaimForm = z.infer<typeof Schema>;

/** Sub-labels for the three outcome buttons; the names come from the database. */
const OUTCOME_HINT: Record<string, string> = {
  REPLACED_NOW: "New piece handed over now",
  CREDIT_NOTE: "Adjusted against their balance",
  WAITING: "Nothing given yet",
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/**
 * A shopkeeper walks in with a dead piece. He does not know which invoice it
 * came on and will not be asked — the claim is recorded against the item.
 */
export function ClaimInDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lets the list behind the sheet re-read without a manual refresh. */
  onCreated?: () => void;
}) {
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<ClaimForm>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      customerId: 0,
      productId: 0,
      qty: 1,
      reasonId: 0,
      outcomeId: 0,
      originalOrderNo: "",
      note: "",
    },
  });

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/claims/lookups`, { headers: authHeader() });
      setLookups(res.data);

      /* Default the reason and the outcome from the data rather than from a
         hard-coded key: "dead" and REPLACED_NOW are rows, not constants. */
      const firstReason = res.data.reasons[0];
      const preferred = res.data.policy.replaceUpfront ? "REPLACED_NOW" : "WAITING";
      const outcome = res.data.outcomes.find((o) => o.key === preferred) ?? res.data.outcomes[0];
      form.reset({
        customerId: 0, productId: 0, qty: 1,
        reasonId: firstReason?.id ?? 0,
        outcomeId: outcome?.id ?? 0,
        originalOrderNo: "", note: "",
      });
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the claim form."));
    } finally {
      setLoading(false);
    }
  }, [form]);

  /* Load when the sheet opens, so the product and customer lists are current
     each time rather than fixed at first mount. */
  React.useEffect(() => {
    if (!open) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [open, load]);

  const productId = form.watch("productId");
  const qty = form.watch("qty");
  const reasonId = form.watch("reasonId");
  const outcomeId = form.watch("outcomeId");

  const product = lookups?.products.find((p) => p.id === Number(productId));
  const value = product ? product.costPrice * (Number(qty) || 0) : 0;
  const reasonDef = lookups?.reasons.find((r) => r.id === Number(reasonId));

  async function handleSubmit(data: ClaimForm) {
    try {
      const res = await axios.post<{ id: number; claimNo: string; message: string }>(
        `${API_BASE_URL}/claims`,
        {
          customerUserId: data.customerId,
          productId: data.productId,
          quantity: data.qty,
          reasonId: data.reasonId,
          outcomeId: data.outcomeId,
          originalOrderNo: data.originalOrderNo?.trim() || null,
          note: data.note?.trim() || null,
        },
        { headers: authHeader() }
      );
      toast.success("Claim received", { description: res.data.message });
      onOpenChange(false);
      form.reset();
      onCreated?.();
    } catch (e) {
      toast.error("Claim not received", { description: apiMessage(e, "Please try again.") });
    }
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
              {error ? (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-danger/5 border border-danger/25">
                  <AlertCircle className="size-4 text-danger flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-700 dark:text-slate-200">{error}</p>
                    <Button type="button" variant="ghost" size="sm" className="mt-2"
                      onClick={() => { setLoading(true); void load(); }}>
                      Try again
                    </Button>
                  </div>
                </div>
              ) : loading || !lookups ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : (
                <>
                  <FormField control={form.control} name="customerId" render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel required>Who brought it back?</FormLabel>
                      <FormControl>
                        <SelectNative {...field}>
                          <option value={0}>— Pick a customer —</option>
                          {lookups.customers.map((c) => (
                            <option key={c.id} value={c.id}>{c.name} · {c.code}</option>
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
                          {lookups.products.map((p) => (
                            <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>
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

                  <FormField control={form.control} name="reasonId" render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel required>What is wrong with it?</FormLabel>
                      <FormControl>
                        <SelectNative {...field}>
                          {lookups.reasons.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
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

                  <FormField control={form.control} name="outcomeId" render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel required>What did the customer get?</FormLabel>
                      <div className="space-y-1.5 mt-1.5">
                        {lookups.outcomes.map((o) => {
                          const active = Number(outcomeId) === o.id;
                          return (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => field.onChange(o.id)}
                              className={cn(
                                "w-full text-left p-2.5 rounded-lg border-2 transition-colors",
                                active
                                  ? "border-brand-yellow bg-brand-yellow/5"
                                  : "border-slate-200 dark:border-navy-700 hover:border-slate-300"
                              )}
                            >
                              <div className="text-sm font-medium text-navy-900 dark:text-white">{o.name}</div>
                              {OUTCOME_HINT[o.key] && (
                                <div className="text-2xs text-slate-500 dark:text-slate-400">{OUTCOME_HINT[o.key]}</div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
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
                      The pieces go onto the claim shelf, which is not counted as sellable stock.
                      You will be reminded to send them to the supplier after{" "}
                      {lookups.policy.remindUnsentAfterDays} days.
                    </p>
                  </div>
                </>
              )}
            </SheetBody>

            <SheetFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                <X /> Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={form.formState.isSubmitting || loading || !lookups}>
                {form.formState.isSubmitting
                  ? <><Loader2 className="size-4 animate-spin" /> Receiving…</>
                  : "Receive into claim stock"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
