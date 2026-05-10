"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, AlertCircle, MessageSquare, Phone, Calendar, CheckCircle2, XCircle, RotateCcw, Send, Wifi } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/format";

const SMS_DATA = [
  { id: 1, templateCode: "ORDER_DISPATCHED",     to: "0300 4567890", toName: "Hafeez Center #28", body: "Dear Hafeez Center #28, your order ORD-KHI-26-0142 has been dispatched. Invoice: INV-KHI-26-0142", status: "DELIVERED", gateway: "Jazz BizSMS",  cost: 1.2,  sentAt: "2026-04-30 11:42 AM", deliveredAt: "2026-04-30 11:42 AM", attempts: 1, providerMsgId: "JAZZ-998877665544" },
  { id: 2, templateCode: "INVOICE_ISSUED",       to: "0345 6789012", toName: "Margalla Distrib.",  body: "Dear customer, invoice INV-ISB-26-0034 of PKR 218,000 issued. Due: 30-May",                  status: "DELIVERED", gateway: "Jazz BizSMS",  cost: 1.2,  sentAt: "2026-04-30 11:35 AM", deliveredAt: "2026-04-30 11:36 AM", attempts: 1, providerMsgId: "JAZZ-998877665545" },
  { id: 3, templateCode: "PAYMENT_RECEIVED",     to: "0300 4567890", toName: "Hafeez Center #28", body: "Thank you! Payment of PKR 100,000 received against INV-128.",                                  status: "DELIVERED", gateway: "Jazz BizSMS",  cost: 1.2,  sentAt: "2026-04-29 02:14 PM", deliveredAt: "2026-04-29 02:14 PM", attempts: 1, providerMsgId: "JAZZ-998877665546" },
  { id: 4, templateCode: "PAYMENT_OVERDUE",      to: "0321 1234567", toName: "Mobile Zone Lahore", body: "Reminder: Invoice INV-LHR-26-0072 of PKR 38,500 is overdue by 30 days. Please pay urgently.", status: "DELIVERED", gateway: "Telenor Tameer", cost: 1.5,  sentAt: "2026-04-28 09:00 AM", deliveredAt: "2026-04-28 09:00 AM", attempts: 1, providerMsgId: "TLNR-1122334455" },
  { id: 5, templateCode: "ORDER_CONFIRMED",      to: "0322 9988776", toName: "Tech Bazaar",        body: "Order confirmed. Will be dispatched in 24 hours.",                                            status: "SENT",      gateway: "Jazz BizSMS",  cost: 1.2,  sentAt: "2026-04-30 12:15 PM", deliveredAt: null,             attempts: 1, providerMsgId: "JAZZ-998877665547" },
  { id: 6, templateCode: "PAYMENT_DUE_TOMORROW", to: "0334 6677889", toName: "Mobile Mart Multan", body: "Reminder: Invoice INV-MM-024 of PKR 64,500 is due tomorrow.",                                 status: "FAILED",    gateway: "Jazz BizSMS",  cost: 0,    sentAt: "2026-04-30 09:00 AM", deliveredAt: null,             attempts: 3, providerMsgId: null, failureReason: "Recipient number invalid (PTA blocked)" },
  { id: 7, templateCode: "ORDER_DELIVERED",      to: "0322 3344556", toName: "Faisal Mobile Mart", body: "Your order ORD-LHR-26-0088 has been delivered. Thank you for your business!",                 status: "DELIVERED", gateway: "Telenor Tameer", cost: 1.5,  sentAt: "2026-04-29 04:30 PM", deliveredAt: "2026-04-29 04:30 PM", attempts: 1, providerMsgId: "TLNR-1122334456" },
];

const STATUS_VARIANT = { QUEUED: "warning", SENT: "info", DELIVERED: "success", FAILED: "danger" } as const;

export default function SMSDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const sms = SMS_DATA.find((s) => s.id === id);
  const [retryConfirm, setRetryConfirm] = React.useState(false);

  if (!sms) return <EmptyState icon={AlertCircle} title="SMS not found" action={<Button asChild><Link href="/notifications/sms">Back</Link></Button>} />;

  const segments = Math.ceil(sms.body.length / 153);
  const totalCost = sms.cost * sms.attempts;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Notifications" }, { label: "SMS History", href: "/notifications/sms" }, { label: `#${sms.id}` }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <MessageSquare className="size-6 text-brand-yellow" />
            <span className="text-base">SMS to {sms.toName}</span>
            <StatusPill variant={STATUS_VARIANT[sms.status as keyof typeof STATUS_VARIANT]}>{sms.status}</StatusPill>
          </div>
        }
        subtitle={`${sms.gateway} · Sent ${sms.sentAt}`}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/notifications/sms"><ArrowLeft />Back</Link></Button>
            {sms.status === "FAILED" && (
              <Button variant="accent" className="gap-1.5" onClick={() => setRetryConfirm(true)}>
                <RotateCcw />Retry Send
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* SMS body preview */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Message Body</h3>
              <div className="relative max-w-md">
                <div className="bg-brand-yellow/5 border border-brand-yellow/30 rounded-2xl rounded-bl-sm p-4">
                  <div className="text-2xs uppercase font-semibold text-brand-yellow mb-2 tracking-wider">VIZO (Sender ID)</div>
                  <p className="text-sm text-navy-900 dark:text-white whitespace-pre-wrap">{sms.body}</p>
                </div>
                <div className="text-2xs text-slate-500 dark:text-slate-400 mt-2 ml-2">
                  {sms.body.length} chars · {segments} SMS segment{segments === 1 ? "" : "s"}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Delivery timeline */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Delivery Timeline</h3>
              <div className="space-y-4">
                <TimelineEvent icon={Send} variant="info" time={sms.sentAt} title="Queued for delivery" subtitle={`Routed via ${sms.gateway}`} />
                {sms.providerMsgId && (
                  <TimelineEvent icon={Wifi} variant="info" time={sms.sentAt} title="Accepted by gateway" subtitle={`Provider ID: ${sms.providerMsgId}`} />
                )}
                {sms.status === "DELIVERED" && sms.deliveredAt && (
                  <TimelineEvent icon={CheckCircle2} variant="success" time={sms.deliveredAt} title="Delivered to handset" subtitle="Confirmed by carrier" />
                )}
                {sms.status === "SENT" && (
                  <TimelineEvent icon={CheckCircle2} variant="info" time={sms.sentAt} title="Sent to network" subtitle="Awaiting carrier delivery confirmation" />
                )}
                {sms.status === "FAILED" && (
                  <TimelineEvent icon={XCircle} variant="danger" time={sms.sentAt} title="Delivery failed" subtitle={sms.failureReason ?? "Unknown error"} />
                )}
                {sms.attempts > 1 && (
                  <TimelineEvent icon={RotateCcw} variant="warning" time={sms.sentAt} title={`${sms.attempts} attempts made`} subtitle="Multi-gateway failover triggered" />
                )}
              </div>
            </CardBody>
          </Card>

          {sms.status === "FAILED" && (
            <Card className="bg-danger/5 border-danger/30">
              <CardBody>
                <div className="flex items-start gap-3">
                  <XCircle className="size-5 text-danger flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-danger-dark dark:text-danger-light">Failure reason</h4>
                    <p className="text-sm text-danger-dark/80 dark:text-danger-light/80 mt-1">{sms.failureReason ?? "Gateway returned an error after all retry attempts."}</p>
                    <p className="text-xs text-danger-dark/70 dark:text-danger-light/70 mt-2">Retried {sms.attempts} times across all healthy gateways.</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Recipient</h3>
              <div className="font-semibold text-navy-900 dark:text-white">{sms.toName}</div>
              <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                <Phone className="size-3 text-slate-400" />
                <span className="tabular">{sms.to}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Details</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="Template" value={<Badge variant="muted">{sms.templateCode}</Badge>} />
                <Meta label="Gateway" value={sms.gateway} />
                <Meta label="Sent" icon={Calendar} value={sms.sentAt} />
                {sms.deliveredAt && <Meta label="Delivered" icon={CheckCircle2} value={sms.deliveredAt} />}
                <Meta label="Attempts" value={<span className="tabular">{sms.attempts}</span>} />
                <Meta label="Cost" value={<span className="tabular">PKR {totalCost.toFixed(2)}</span>} />
                {sms.providerMsgId && <Meta label="Provider ID" value={<span className="tabular text-2xs">{sms.providerMsgId}</span>} />}
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={retryConfirm}
        onOpenChange={setRetryConfirm}
        title="Retry sending this SMS?"
        description="The message will be re-queued and routed through all healthy gateways."
        variant="info"
        confirmLabel="Retry"
        onConfirm={() => { toast.success("SMS re-queued for delivery"); setRetryConfirm(false); }}
      />
    </>
  );
}

function TimelineEvent({ icon: Icon, variant, time, title, subtitle }: { icon: typeof Send; variant: "info" | "success" | "warning" | "danger"; time: string; title: string; subtitle: string }) {
  const colors = {
    info: "bg-info/10 text-info",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
  };
  return (
    <div className="flex gap-3">
      <div className={`size-9 rounded-full ${colors[variant]} flex items-center justify-center flex-shrink-0`}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 pb-2">
        <div className="text-sm font-semibold text-navy-900 dark:text-white">{title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div>
        <div className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">{time}</div>
      </div>
    </div>
  );
}

function Meta({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: typeof Phone }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5 text-slate-400" />}
        {label}
      </dt>
      <dd className="text-sm font-medium text-navy-900 dark:text-white">{value}</dd>
    </div>
  );
}
