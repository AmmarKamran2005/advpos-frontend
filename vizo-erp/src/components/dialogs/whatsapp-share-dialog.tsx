"use client";

import * as React from "react";
import { Copy, ExternalLink, X, MessageCircle, Link2, AlertCircle } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { normalisePhone, prettyPhone, openWhatsApp } from "@/lib/whatsapp";

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
  /**
   * The bill itself. Whatever the API said to share — the Cloudinary copy when
   * that account will serve a PDF, otherwise the link the API serves. It is put
   * on its own line so WhatsApp turns it into a tap target.
   */
  billLink?: string | null;
  /** Trading name for the sign-off. Falls back to VIZO. */
  companyName?: string;
  /** Overrides the composed message entirely — used by the reminder flow. */
  message?: string;
  /** Heading and sub-heading, when this is not a bill. */
  title?: string;
  /** Called once the chat has actually been opened. */
  onSent?: () => void;
}

const money = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;

function buildMessage(p: WhatsAppShareDialogProps) {
  if (p.message) return p.message;

  const parts: string[] = [];
  const company = p.companyName ?? "VIZO";

  parts.push(`Hi ${p.customerName}, your ${(p.docLabel ?? "invoice").toLowerCase()} is ready.`);
  parts.push("");
  parts.push(`${p.docLabel ?? "Invoice"}: *${p.docNo}*`);
  parts.push(`Total: *${money(p.total)}*`);

  if (p.balance !== undefined && p.balance > 0) {
    parts.push(`Balance due: *${money(p.balance)}*`);
  }

  if (p.lines && p.lines.length > 0) {
    parts.push("");
    for (const l of p.lines) {
      parts.push(`- ${l.item} x ${l.qty} = ${money(l.amount)}`);
    }
  }

  if (p.billLink) {
    parts.push("");
    parts.push(p.billLink);
  }

  if (p.note) {
    parts.push("");
    parts.push(p.note);
  }

  parts.push("");
  parts.push(`Shukriya — ${company}`);

  return parts.join("\n");
}

/**
 * The sales team already sends order and invoice details over WhatsApp. Rather
 * than fight that habit, this composes the message for them so what leaves the
 * building matches what the system holds.
 *
 * "Open WhatsApp" hands the chat to WhatsApp with the text already in it. It
 * does NOT send: the operator taps Send. Anything that goes to a customer under
 * the shop's name gets a person's eyes on it first.
 */
export function WhatsAppShareDialog(props: WhatsAppShareDialogProps) {
  const { open, onOpenChange, customerPhone, docNo, billLink } = props;

  const [phone, setPhone] = React.useState(customerPhone ?? "");
  const [message, setMessage] = React.useState(() => buildMessage(props));

  /* Recompose when a different document is opened, or when the bill link
     arrives after the sheet was first rendered — the PDF is built server-side
     and can land a moment after the sale does. */
  const [composedFor, setComposedFor] = React.useState(`${docNo}|${billLink ?? ""}`);
  const key = `${docNo}|${billLink ?? ""}`;
  if (composedFor !== key) {
    setComposedFor(key);
    setMessage(buildMessage(props));
    setPhone(customerPhone ?? "");
  }

  const dialable = normalisePhone(phone);

  function handleCopy() {
    navigator.clipboard.writeText(message).then(
      () => toast.success("Message copied", { description: "Paste it into any chat." }),
      () => toast.error("Could not copy", { description: "Select the text and copy manually." })
    );
  }

  function handleCopyLink() {
    if (!billLink) return;
    navigator.clipboard.writeText(billLink).then(
      () => toast.success("Bill link copied"),
      () => toast.error("Could not copy the link")
    );
  }

  function handleOpenWhatsApp() {
    if (!openWhatsApp(phone, message)) {
      toast.error("That number cannot be dialled", {
        description: "A WhatsApp number needs the full mobile, e.g. 0300 1234567.",
      });
      return;
    }
    toast.success("WhatsApp opened", {
      description: `${docNo} to ${prettyPhone(phone)} — press Send in WhatsApp to deliver it.`,
    });
    props.onSent?.();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="size-4 text-success" />
            {props.title ?? "Share on WhatsApp"}
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
            <p className="text-2xs mt-1.5">
              {dialable ? (
                <span className="text-success">Will open the chat for {prettyPhone(phone)}</span>
              ) : (
                <span className="text-warning inline-flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  Enter the full mobile number, with or without the leading zero.
                </span>
              )}
            </p>
          </div>

          {billLink && (
            <div className="mb-4 flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700">
              <Link2 className="size-3.5 text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-2xs font-semibold text-navy-900 dark:text-white">Bill link included</div>
                <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">{billLink}</div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleCopyLink}>Copy</Button>
            </div>
          )}

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
              Text wrapped in *asterisks* shows as bold in WhatsApp. Nothing is sent until you
              press Send inside WhatsApp.
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
          <Button type="button" variant="accent" onClick={handleOpenWhatsApp} disabled={!dialable}>
            <ExternalLink /> Open WhatsApp
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
