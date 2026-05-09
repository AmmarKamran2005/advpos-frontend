"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { MessageSquare, X, Send } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";

const TEMPLATES: Record<string, string> = {
  ORDER_DISPATCHED:    "Dear {{name}}, your order {{orderNo}} has been dispatched. Invoice: {{invoiceNo}}. Thank you for your business!",
  PAYMENT_REMINDER:    "Dear {{name}}, this is a friendly reminder that invoice {{invoiceNo}} of PKR {{amount}} is due. Please arrange payment.",
  PAYMENT_OVERDUE:     "Reminder: Invoice {{invoiceNo}} of PKR {{amount}} is overdue. Please pay urgently to avoid service disruption.",
  PAYMENT_RECEIVED:    "Thank you! Payment of PKR {{amount}} received against {{invoiceNo}}. Current balance: {{balance}}.",
  CUSTOM:              "",
};

const Schema = z.object({
  toNumber: z.string()
    .min(11, "Pakistani phone number must be 11 digits (e.g. 03XXXXXXXXX)")
    .regex(/^(03\d{9}|\+923\d{9})$/, "Invalid Pakistan mobile format"),
  templateCode: z.string().min(1, "Template required"),
  body: z.string().min(1, "Message required").max(459, "Message too long (max 3 SMS = 459 chars)"),
});

type Form = z.infer<typeof Schema>;

export interface SendSmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPhone?: string;
  defaultTemplate?: keyof typeof TEMPLATES;
  contextVars?: Record<string, string>;
}

export function SendSmsDialog({
  open, onOpenChange, defaultPhone = "", defaultTemplate = "ORDER_DISPATCHED", contextVars = {},
}: SendSmsDialogProps) {
  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: { toNumber: defaultPhone, templateCode: defaultTemplate, body: TEMPLATES[defaultTemplate] },
  });

  // Update body when template changes
  const tplCode = form.watch("templateCode") as keyof typeof TEMPLATES;
  React.useEffect(() => {
    let body = TEMPLATES[tplCode] ?? "";
    Object.entries(contextVars).forEach(([k, v]) => { body = body.replaceAll(`{{${k}}}`, v); });
    form.setValue("body", body);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tplCode]);

  const body = form.watch("body");
  const charCount = body.length;
  const segmentCount = Math.ceil(charCount / 153);
  const cost = (segmentCount * 1.20).toFixed(2);

  function onSubmit(data: Form) {
    toast.success("SMS queued for delivery", {
      description: `Will be sent to ${data.toNumber} via Jazz BizSMS · Cost: PKR ${cost}`,
    });
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-lg bg-brand-yellow/10 text-brand-yellow flex items-center justify-center">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <DialogTitle>Send SMS</DialogTitle>
              <DialogDescription>Pick a template and send via PTA-approved gateway</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
            <DialogBody>
              <div className="space-y-4">
                <FormField control={form.control} name="toNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Phone Number</FormLabel>
                    <FormControl><Input placeholder="03XXXXXXXXX" {...field} /></FormControl>
                    <FormDescription>Pakistani mobile format only</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="templateCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Template</FormLabel>
                    <FormControl>
                      <SelectNative {...field}>
                        <option value="ORDER_DISPATCHED">Order Dispatched</option>
                        <option value="PAYMENT_REMINDER">Payment Reminder</option>
                        <option value="PAYMENT_OVERDUE">Payment Overdue</option>
                        <option value="PAYMENT_RECEIVED">Payment Received</option>
                        <option value="CUSTOM">Custom Message</option>
                      </SelectNative>
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="body" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Message</FormLabel>
                    <FormControl><Textarea rows={4} {...field} /></FormControl>
                    <div className="flex items-center justify-between text-xs">
                      <FormMessage />
                      <span className="text-slate-500 dark:text-slate-400 tabular ml-auto">
                        {charCount} chars · {segmentCount} SMS · PKR {cost}
                      </span>
                    </div>
                  </FormItem>
                )} />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}><X /> Cancel</Button>
              <Button type="submit" variant="accent"><Send /> Send SMS</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
