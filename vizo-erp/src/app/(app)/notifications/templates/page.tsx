"use client";

import { Plus, FileText, Edit3, Eye } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";

const TEMPLATES = [
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

export default function TemplatesPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "SMS / Notifications" }, { label: "Templates" }]}
        title="SMS Templates"
        subtitle="Pre-approved message templates with Handlebars variables"
        actions={
          <Button variant="accent" size="md" className="gap-1.5"><Plus /><span>New Template</span></Button>
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
                  <Button variant="ghost" size="icon-sm"><Eye /></Button>
                  <Button variant="ghost" size="icon-sm"><Edit3 /></Button>
                </div>
              </div>
              <h4 className="text-sm font-semibold text-navy-900 dark:text-white">{t.name}</h4>
              <Badge variant="muted" className="mt-1 tabular text-2xs">{t.code}</Badge>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed line-clamp-3 bg-slate-50 dark:bg-navy-700 p-2 rounded-md font-mono">{t.body}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-navy-700">
                <span className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">EN · {t.body.length}/{t.maxLength}</span>
                {t.isActive ? <StatusPill variant="success">Active</StatusPill> : <StatusPill variant="muted">Inactive</StatusPill>}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
