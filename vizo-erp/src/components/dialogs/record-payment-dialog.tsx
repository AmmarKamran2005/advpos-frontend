"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { Banknote, Landmark, Smartphone, Building2, X } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { formatMoney } from "@/lib/format";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = [
  { value: "CASH",      label: "Cash",         icon: Banknote },
  { value: "BANK",      label: "Bank Transfer", icon: Landmark },
  { value: "EASYPAISA", label: "Easypaisa",    icon: Smartphone },
  { value: "JAZZCASH",  label: "JazzCash",     icon: Smartphone },
  { value: "CHEQUE",    label: "Cheque",       icon: Building2 },
] as const;

const PaymentSchema = z.object({
  paymentMethod: z.enum(["CASH", "BANK", "EASYPAISA", "JAZZCASH", "CHEQUE"]),
  amount: z.coerce.number({ message: "Amount required" }).positive("Amount must be positive"),
  paymentDate: z.string().min(1, "Date required"),
  referenceNo: z.string().optional(),
  walletTxnId: z.string().optional(),
  bankAccount: z.string().optional(),
  notes: z.string().max(500, "Max 500 characters").optional(),
}).refine(
  (data) =>
    !["EASYPAISA", "JAZZCASH"].includes(data.paymentMethod) || (data.walletTxnId && data.walletTxnId.length > 0),
  { message: "Wallet transaction ID is required for mobile wallet payments", path: ["walletTxnId"] }
).refine(
  (data) => data.paymentMethod !== "CHEQUE" || (data.referenceNo && data.referenceNo.length > 0),
  { message: "Cheque number is required", path: ["referenceNo"] }
);

type PaymentForm = z.infer<typeof PaymentSchema>;

export interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNo?: string;
  customerName?: string;
  totalAmount: number;
  balanceAmount: number;
  onSubmit?: (data: PaymentForm) => void;
}

export function RecordPaymentDialog({
  open, onOpenChange, invoiceNo, customerName, totalAmount, balanceAmount, onSubmit,
}: RecordPaymentDialogProps) {
  const form = useForm<PaymentForm>({
    resolver: vizoResolver(PaymentSchema),
    defaultValues: {
      paymentMethod: "BANK",
      amount: balanceAmount,
      paymentDate: new Date().toISOString().slice(0, 10),
      referenceNo: "",
      walletTxnId: "",
      bankAccount: "",
      notes: "",
    },
  });

  const method = form.watch("paymentMethod");
  const amount = form.watch("amount");

  function handleSubmit(data: PaymentForm) {
    onSubmit?.(data);
    toast.success("Payment recorded", {
      description: `${formatMoney(data.amount)} via ${data.paymentMethod}${invoiceNo ? ` against ${invoiceNo}` : ""}`,
    });
    onOpenChange(false);
    form.reset();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="md">
        <SheetHeader>
          <SheetTitle>Record Payment</SheetTitle>
          {(invoiceNo || customerName) && (
            <SheetDescription>
              {invoiceNo && <span className="tabular font-medium text-navy-900 dark:text-white">{invoiceNo}</span>}
              {customerName && (
                <span> · {customerName}</span>
              )}
            </SheetDescription>
          )}
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="contents">
            <SheetBody>
              {/* Summary */}
              <div className="bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-lg p-4 mb-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Invoice Total</div>
                    <div className="tabular text-base font-bold text-navy-900 dark:text-white mt-1">{formatMoney(totalAmount)}</div>
                  </div>
                  <div>
                    <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Balance Due</div>
                    <div className="tabular text-base font-bold text-warning mt-1">{formatMoney(balanceAmount)}</div>
                  </div>
                </div>
                {amount > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-navy-700 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Receiving Now</div>
                      <div className="tabular text-base font-bold text-success mt-1">{formatMoney(amount)}</div>
                    </div>
                    <div>
                      <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">After Payment</div>
                      <div className={cn("tabular text-base font-bold mt-1",
                        balanceAmount - amount <= 0 ? "text-success" : "text-navy-900 dark:text-white"
                      )}>
                        {formatMoney(Math.max(0, balanceAmount - amount))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment method selector */}
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel required>Payment Method</FormLabel>
                    <div className="grid grid-cols-3 gap-2 mt-1.5">
                      {PAYMENT_METHODS.map((pm) => {
                        const Icon = pm.icon;
                        const isActive = field.value === pm.value;
                        return (
                          <button
                            key={pm.value}
                            type="button"
                            onClick={() => field.onChange(pm.value)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors",
                              isActive
                                ? "border-brand-yellow bg-brand-yellow/5 text-navy-900 dark:text-white"
                                : "border-slate-200 dark:border-navy-700 hover:border-slate-300 dark:hover:border-navy-600 text-slate-600 dark:text-slate-400"
                            )}
                          >
                            <Icon className={cn("size-4", isActive && "text-brand-yellow")} />
                            <span className="text-2xs font-medium">{pm.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel required>Amount (PKR)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button type="button" onClick={() => form.setValue("amount", balanceAmount)} className="text-2xs text-brand-yellow hover:underline font-medium">Full balance</button>
                      <span className="text-2xs text-slate-300">·</span>
                      <button type="button" onClick={() => form.setValue("amount", balanceAmount / 2)} className="text-2xs text-brand-yellow hover:underline font-medium">Half</button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel required>Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(method === "BANK" || method === "CHEQUE") && (
                <FormField
                  control={form.control}
                  name="bankAccount"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel required={method === "CHEQUE"}>Receiving Account</FormLabel>
                      <FormControl>
                        <SelectNative {...field}>
                          <option value="">— Select bank account —</option>
                          <option value="HBL">HBL Bank</option>
                          <option value="MEEZAN">Meezan Bank</option>
                          <option value="UBL">UBL</option>
                        </SelectNative>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(method === "BANK" || method === "CHEQUE") && (
                <FormField
                  control={form.control}
                  name="referenceNo"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel required={method === "CHEQUE"}>{method === "CHEQUE" ? "Cheque Number" : "Reference No."}</FormLabel>
                      <FormControl>
                        <Input placeholder={method === "CHEQUE" ? "e.g. 001245" : "e.g. TXN-77488392"} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(method === "EASYPAISA" || method === "JAZZCASH") && (
                <FormField
                  control={form.control}
                  name="walletTxnId"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel required>Transaction ID</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. EP-554433221" {...field} />
                      </FormControl>
                      <FormDescription>From the wallet provider&apos;s confirmation SMS</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Optional internal notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SheetBody>

            <SheetFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                <X /> Cancel
              </Button>
              <Button type="submit" variant="accent">
                Record Payment
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
