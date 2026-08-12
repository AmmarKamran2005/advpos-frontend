"use client";

import * as React from "react";
import { Copy, ExternalLink, X, MessageCircle } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { company } from "@/data/settings";

export type ShareLine = {
  item: string;
  qty: number;
  amount: number;
};

export interface WhatsAppShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Document number shown as the message heading, e.g. INV-26-8867. */
  docNo: string;
  docLabel?: string;
  customerName: string;
  customerPhone?: string;
  total: number;
  balance?: number;
  lines?: ShareLine[];
  /** Extra line appended before the sign-off, e.g. delivery status. */
  note?: string;
}

const money = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;

function buildMessage(p: WhatsAppShareDialogProps) {
  const parts: string[] = [];

  parts.push(`*${company.name}*`);
  parts.push("");
  parts.push(`${p.docLabel ?? "Invoice"}: *${p.docNo}*`);
  parts.push(`Customer: ${p.customerName}`);

  if (p.lines && p.lines.length > 0) {
    parts.push("");
    for (const l of p.lines) {
      parts.push(`• ${l.item} — ${l.qty} × = ${money(l.amount)}`);
    }
  }

  parts.push("");
  parts.push(`Total: *${money(p.total)}*`);
  if (p.balance !== undefined && p.balance > 0) {
    parts.push(`Balance: *${money(p.balance)}*`);
  }

  if (p.note) {
    parts.push("");
    parts.push(p.note);
  }

  parts.push("");
  parts.push(`Shukriya — ${company.phone}`);

  return parts.join("\n");
}

/**
 * The sales team already sends order and invoice details over WhatsApp. Rather
 * than fight that habit, this composes the message for them so what leaves the
 * building matches what the system holds.
 */
export function WhatsAppShareDialog(props: WhatsAppShareDialogProps) {
  const { open, onOpenChange, customerPhone, docNo } = props;

  const [phone, setPhone] = React.useState(customerPhone ?? "");
  const [message, setMessage] = React.useState(() => buildMessage(props));

  /* Recompose when a different document is opened. */
  const [composedFor, setComposedFor] = React.useState(docNo);
  if (composedFor !== docNo) {
    setComposedFor(docNo);
    setMessage(buildMessage(props));
    setPhone(customerPhone ?? "");
  }

  function handleCopy() {
    navigator.clipboard.writeText(message).then(
      () => toast.success("Message copied", { description: "Paste it into any chat." }),
      () => toast.error("Could not copy", { description: "Select the text and copy manually." })
    );
  }

  function handleOpenWhatsApp() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Number looks incomplete", {
        description: "Enter the customer's WhatsApp number first.",
      });
      return;
    }
    toast.success("Opening WhatsApp", {
      description: `${docNo} to ${phone}`,
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="size-4 text-success" />
            Share on WhatsApp
          </SheetTitle>
          <SheetDescription>
            <span className="tabular font-medium text-navy-900 dark:text-white">{docNo}</span>
            <span> · {props.customerName}</span>
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <div className="mb-4">
            <Label htmlFor="wa-phone">WhatsApp number</Label>
            <Input
              id="wa-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0300 1234567"
              className="mt-1.5 tabular"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="wa-message">Message</Label>
              <button
                type="button"
                onClick={() => setMessage(buildMessage(props))}
                className="text-2xs text-brand-yellow hover:underline font-medium"
              >
                Reset to default
              </button>
            </div>
            <Textarea
              id="wa-message"
              rows={14}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="font-mono text-xs leading-relaxed"
            />
            <p className="text-2xs text-slate-400 dark:text-slate-500 mt-1.5">
              Text wrapped in *asterisks* shows as bold in WhatsApp.
            </p>
          </div>
        </SheetBody>

        <SheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            <X /> Cancel
          </Button>
          <Button type="button" variant="secondary" onClick={handleCopy}>
            <Copy /> Copy text
          </Button>
          <Button type="button" variant="accent" onClick={handleOpenWhatsApp}>
            <ExternalLink /> Open WhatsApp
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
