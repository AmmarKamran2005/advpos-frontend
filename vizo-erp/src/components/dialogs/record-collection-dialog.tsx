"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { Banknote, FileText, Landmark, Smartphone, X, Info } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
} from "@/components/ui/form";
import { formatMoney } from "@/lib/format";
import { toast } from "@/components/ui/toaster";
import type { CollectionMethod } from "@/data/collections";
import { cn } from "@/lib/utils";

const METHODS: { value: CollectionMethod; label: string; icon: typeof Banknote }[] = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "CHEQUE", label: "Cheque", icon: FileText },
  { value: "BANK", label: "Bank", icon: Landmark },
  { value: "JAZZCASH", label: "JazzCash", icon: Smartphone },
  { value: "EASYPAISA", label: "Easypaisa", icon: Smartphone },
];

const Schema = z.object({
  amount: z.coerce.number({ message: "Amount required" }).positive("Must be more than zero"),
  method: z.enum(["CASH", "CHEQUE", "BANK", "JAZZCASH", "EASYPAISA"]),
  collectedOn: z.string().min(1, "Date required"),
  reference: z.string().optional(),
  bank: z.string().optional(),
  chequeDate: z.string().optional(),
  note: z.string().max(300, "Max 300 characters").optional(),
}).refine(
  (d) => d.method !== "CHEQUE" || (d.reference && d.reference.length > 0),
  { message: "Cheque number is required", path: ["reference"] }
).refine(
  (d) => !["BANK", "JAZZCASH", "EASYPAISA"].includes(d.method) || (d.reference && d.reference.length > 0),
  { message: "Transaction number is required", path: ["reference"] }
);

type CollectionForm = z.infer<typeof Schema>;

export type OpenOrder = {
  orderNo: string;
  balance: number;
};

export interface RecordCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  customerCode?: string;
  /** What the customer owes in total. */
  outstanding: number;
  /** Unpaid orders, oldest first — the rep ticks what the money is against. */
  openOrders?: OpenOrder[];
  /** Pre-tick this order (opened from an order screen). */
  defaultOrderNo?: string;
  onSubmit?: (data: CollectionForm & { against: string[] }) => void;
}

export function RecordCollectionDialog({
  open, onOpenChange, customerName, customerCode, outstanding,
  openOrders = [], defaultOrderNo, onSubmit,
}: RecordCollectionDialogProps) {
  const [against, setAgainst] = React.useState<string[]>(
    defaultOrderNo ? [defaultOrderNo] : []
  );

  const form = useForm<CollectionForm>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      amount: 0,
      method: "CASH",
      collectedOn: "2026-08-15",
      reference: "",
      bank: "",
      chequeDate: "",
      note: "",
    },
  });

  const method = form.watch("method");
  const amount = form.watch("amount");

  function toggleOrder(orderNo: string) {
    setAgainst((prev) =>
      prev.includes(orderNo) ? prev.filter((x) => x !== orderNo) : [...prev, orderNo]
    );
  }

  function handleSubmit(data: CollectionForm) {
    onSubmit?.({ ...data, against });
    toast.success("Collection recorded", {
      description: `${formatMoney(data.amount)} sent to Accounts for confirmation.`,
    });
    onOpenChange(false);
    form.reset();
    setAgainst(defaultOrderNo ? [defaultOrderNo] : []);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="md">
        <SheetHeader>
          <SheetTitle>Record Collection</SheetTitle>
          <SheetDescription>
            {customerName}
            {customerCode && <span className="tabular"> · {customerCode}</span>}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="contents">
            <SheetBody>
              {/* What they owe */}
              <div className="bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-lg p-4 mb-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                      Outstanding
                    </div>
                    <div className="tabular text-base font-bold text-navy-900 dark:text-white mt-1">
                      {formatMoney(outstanding)}
                    </div>
                  </div>
                  {amount > 0 && (
                    <div>
                      <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                        After this
                      </div>
                      <div
                        className={cn(
                          "tabular text-base font-bold mt-1",
                          outstanding - amount <= 0 ? "text-success" : "text-navy-900 dark:text-white"
                        )}
                      >
                        {formatMoney(Math.max(0, outstanding - amount))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel required>How much did you collect? (PKR)</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" className="tabular text-lg" {...field} />
                  </FormControl>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button type="button" className="text-2xs text-brand-yellow hover:underline font-medium"
                      onClick={() => form.setValue("amount", outstanding)}>
                      Full amount
                    </button>
                    <span className="text-2xs text-slate-300">·</span>
                    <button type="button" className="text-2xs text-brand-yellow hover:underline font-medium"
                      onClick={() => form.setValue("amount", Math.round(outstanding / 2))}>
                      Half
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="method" render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel required>How</FormLabel>
                  <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                    {METHODS.map((m) => {
                      const Icon = m.icon;
                      const active = field.value === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => field.onChange(m.value)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors",
                            active
                              ? "border-brand-yellow bg-brand-yellow/5 text-navy-900 dark:text-white"
                              : "border-slate-200 dark:border-navy-700 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                          )}
                        >
                          <Icon className={cn("size-4", active && "text-brand-yellow")} />
                          <span className="text-2xs font-medium leading-none">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </FormItem>
              )} />

              {method === "CHEQUE" && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <FormField control={form.control} name="reference" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Cheque number</FormLabel>
                      <FormControl><Input placeholder="0012457" className="tabular" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="bank" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank</FormLabel>
                      <FormControl><Input placeholder="Meezan Bank" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="chequeDate" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Cheque date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormDescription>Leave the future date if it is post-dated</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {(method === "BANK" || method === "JAZZCASH" || method === "EASYPAISA") && (
                <FormField control={form.control} name="reference" render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel required>Transaction number</FormLabel>
                    <FormControl><Input placeholder="TXN-77483921" className="tabular" {...field} /></FormControl>
                    <FormDescription>From the confirmation message</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="collectedOn" render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel required>Collected on</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {openOrders.length > 0 && (
                <div className="mb-4">
                  <Label>Against which orders?</Label>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 mb-2">
                    Leave all unticked to put it on account.
                  </p>
                  <div className="space-y-1 border border-slate-200 dark:border-navy-700 rounded-lg p-2 max-h-44 overflow-y-auto">
                    {openOrders.map((o) => (
                      <label
                        key={o.orderNo}
                        className="flex items-center gap-2.5 p-2 rounded-md hover:bg-slate-50 dark:hover:bg-navy-800 cursor-pointer"
                      >
                        <Checkbox
                          checked={against.includes(o.orderNo)}
                          onCheckedChange={() => toggleOrder(o.orderNo)}
                        />
                        <span className="tabular text-sm text-navy-900 dark:text-white flex-1">
                          {o.orderNo}
                        </span>
                        <span className="tabular text-sm text-slate-600 dark:text-slate-300">
                          {formatMoney(o.balance)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <FormField control={form.control} name="note" render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Anything Accounts should know" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-info/5 border border-info/25">
                <Info className="size-4 text-info flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  This goes to Accounts as <span className="font-semibold">awaiting confirmation</span>.
                  The customer&rsquo;s balance changes once they have the money in hand.
                </p>
              </div>
            </SheetBody>

            <SheetFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                <X /> Cancel
              </Button>
              <Button type="submit" variant="accent">Send to Accounts</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
