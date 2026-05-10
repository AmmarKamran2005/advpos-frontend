"use client";

import * as React from "react";
import { z } from "zod";
import { Plus, FileText, Edit3, Eye, Send, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EntityFormDialog, ConfirmDialog, SendSmsDialog } from "@/components/dialogs";
import { toast } from "@/components/ui/toaster";

type Template = { code: string; name: string; body: string; language: string; maxLength: number; isActive: boolean };

const TEMPLATES: Template[] = [
  { code: "ORDER_CONFIRMED",      name: "Order Confirmation",     body: "Dear {{name}}, your order {{orderNo}} of PKR {{amount}} has been confirmed. Thank you!", language: "en", maxLength: 160, isActive: true },
  { code: "ORDER_DISPATCHED",     name: "Order Dispatched",       body: "Dear {{name}}, your order {{orderNo}} has been dispatched. Invoice: {{invoiceNo}}",     language: "en", maxLength: 160, isActive: true },
  { code: "ORDER_DELIVERED",      name: "Order Delivered",        body: "Your order {{orderNo}} has been delivered. Thank you for your business!",                language: "en", maxLength: 160, isActive: true },
  { code: "INVOICE_ISSUED",       name: "Invoice Issued",         body: "Dear customer, invoice {{invoiceNo}} of PKR {{amount}} issued. Due: {{dueDate}}",       language: "en", maxLength: 160, isActive: true },
  { code: "PAYMENT_DUE_TOMORROW", name: "Payment Due Tomorrow",   body: "Reminder: Invoice {{invoiceNo}} of PKR {{amount}} is due tomorrow.",                    language: "en", maxLength: 160, isActive: true },
  { code: "PAYMENT_OVERDUE",      name: "Payment Overdue",        body: "Reminder: Invoice {{invoiceNo}} of PKR {{amount}} is overdue by {{days}} days.",        language: "en", maxLength: 160, isActive: true },
  { code: "PAYMENT_RECEIVED",     name: "Payment Received",       body: "Thank you! Payment of PKR {{amount}} received against {{invoiceNo}}.",                  language: "en", maxLength: 160, isActive: true },
  { code: "LOW_STOCK",            name: "Low Stock Alert",        body: "Alert: {{productName}} stock is below reorder level. Current: {{qty}}",                 language: "en", maxLength: 160, isActive: true },
  { code: "PO_APPROVED",          name: "PO Approved (Supplier)", body: "Your PO {{poNo}} of PKR {{amount}} has been approved. Please proceed with delivery.",   language: "en", maxLength: 160, isActive: true },
];

const Schema = z.object({
  code: z.string().min(3, "Min 3 chars").max(50).regex(/^[A-Z_]+$/, "Uppercase letters and underscores only"),
  name: z.string().min(2).max(100),
  body: z.string().min(10, "Body too short").max(459, "Max 459 chars (3 SMS)"),
  language: z.enum(["en", "ur", "roman-ur"]),
  isActive: z.boolean(),
});
type Form = z.infer<typeof Schema>;

export default function TemplatesPage() {
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; t?: Template } | null>(null);
  const [del, setDel] = React.useState<Template | null>(null);
  const [test, setTest] = React.useState<Template | null>(null);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "SMS / Notifications" }, { label: "Templates" }]}
        title="SMS Templates"
        subtitle="Pre-approved message templates with Handlebars variables"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => setDialog({ mode: "create" })}>
            <Plus /><span>New Template</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map((t) => (
          <Card key={t.code} className="cursor-pointer hover:border-brand-yellow/40 transition-colors group">
            <CardBody>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="size-10 rounded-lg bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
                  <FileText className="size-4" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <Button variant="ghost" size="icon-sm" onClick={() => setTest(t)} aria-label="Test send"><Eye /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDialog({ mode: "edit", t })} aria-label="Edit"><Edit3 /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDel(t)} className="text-danger" aria-label="Delete"><Trash2 /></Button>
                </div>
              </div>
              <h4 className="text-sm font-semibold text-navy-900 dark:text-white">{t.name}</h4>
              <Badge variant="muted" className="mt-1 tabular text-2xs">{t.code}</Badge>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed line-clamp-3 bg-slate-50 dark:bg-navy-700 p-2 rounded-md font-mono">{t.body}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-navy-700">
                <span className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">EN · {t.body.length}/{t.maxLength}</span>
                {t.isActive ? <StatusPill variant="success">Active</StatusPill> : <StatusPill variant="muted">Inactive</StatusPill>}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-3 gap-1" onClick={() => setTest(t)}>
                <Send className="size-3" /> Test send
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>

      <EntityFormDialog<Form>
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        mode={dialog?.mode ?? "create"}
        title="SMS Template"
        schema={Schema}
        fields={[
          { name: "code", label: "Code", type: "text", placeholder: "ORDER_CONFIRMED", required: true, disabledOnEdit: true, hint: "Uppercase + underscores only" },
          { name: "name", label: "Display name", type: "text", placeholder: "Order Confirmation", required: true },
          { name: "body", label: "Message body", type: "textarea", required: true, rows: 4, placeholder: "Dear {{name}}, …", hint: "Use {{variable}} for dynamic values. 153 chars = 1 SMS." },
          { name: "language", label: "Language", type: "select", required: true, options: [
            { value: "en", label: "English" },
            { value: "ur", label: "Urdu" },
            { value: "roman-ur", label: "Roman Urdu" },
          ] },
          { name: "isActive", label: "Active", type: "switch", hint: "Inactive templates won't be triggered by events", fullWidth: true },
        ]}
        defaultValues={{
          code: dialog?.t?.code ?? "",
          name: dialog?.t?.name ?? "",
          body: dialog?.t?.body ?? "",
          language: (dialog?.t?.language ?? "en") as "en" | "ur" | "roman-ur",
          isActive: dialog?.t?.isActive ?? true,
        }}
      />

      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Delete template "${del?.name}"?`}
        description="This template will no longer be triggered by events. Existing queued messages are unaffected."
        variant="danger"
        confirmLabel="Delete template"
        onConfirm={() => { toast.success("Template deleted"); setDel(null); }}
      />

      <SendSmsDialog
        open={test !== null}
        onOpenChange={(o) => !o && setTest(null)}
        defaultPhone="03007287607"
      />
    </>
  );
}
