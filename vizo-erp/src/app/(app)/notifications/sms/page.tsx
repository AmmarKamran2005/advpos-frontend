"use client";

import * as React from "react";
import { Plus, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { formatDate } from "@/lib/format";

type SMS = {
  id: number;
  templateCode: string;
  to: string;
  toName: string;
  body: string;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
  gateway: string;
  cost: number;
  sentAt: string;
};

const SMS_DATA: SMS[] = [
  { id: 1, templateCode: "ORDER_DISPATCHED",     to: "0300 4567890", toName: "Hafeez Center #28", body: "Dear Hafeez Center #28, your order ORD-KHI-26-0142 has been dispatched. Invoice: INV-KHI-26-0142", status: "DELIVERED", gateway: "Jazz BizSMS",  cost: 1.2,  sentAt: "30 Apr · 11:42 AM" },
  { id: 2, templateCode: "INVOICE_ISSUED",       to: "0345 6789012", toName: "Margalla Distrib.",  body: "Dear customer, invoice INV-ISB-26-0034 of PKR 218,000 issued. Due: 30-May",                  status: "DELIVERED", gateway: "Jazz BizSMS",  cost: 1.2,  sentAt: "30 Apr · 11:35 AM" },
  { id: 3, templateCode: "PAYMENT_RECEIVED",     to: "0300 4567890", toName: "Hafeez Center #28", body: "Thank you! Payment of PKR 100,000 received against INV-128.",                                  status: "DELIVERED", gateway: "Jazz BizSMS",  cost: 1.2,  sentAt: "29 Apr · 02:14 PM" },
  { id: 4, templateCode: "PAYMENT_OVERDUE",      to: "0321 1234567", toName: "Mobile Zone Lahore", body: "Reminder: Invoice INV-LHR-26-0072 of PKR 38,500 is overdue by 30 days. Please pay urgently.", status: "DELIVERED", gateway: "Telenor Tameer", cost: 1.5,  sentAt: "28 Apr · 09:00 AM" },
  { id: 5, templateCode: "ORDER_CONFIRMED",      to: "0322 9988776", toName: "Tech Bazaar",        body: "Order confirmed. Will be dispatched in 24 hours.",                                            status: "SENT",      gateway: "Jazz BizSMS",  cost: 1.2,  sentAt: "30 Apr · 12:15 PM" },
  { id: 6, templateCode: "PAYMENT_DUE_TOMORROW", to: "0334 6677889", toName: "Mobile Mart Multan", body: "Reminder: Invoice INV-MM-024 of PKR 64,500 is due tomorrow.",                                 status: "FAILED",    gateway: "Jazz BizSMS",  cost: 0,    sentAt: "30 Apr · 09:00 AM" },
  { id: 7, templateCode: "ORDER_DELIVERED",      to: "0322 3344556", toName: "Faisal Mobile Mart", body: "Your order ORD-LHR-26-0088 has been delivered. Thank you for your business!",                 status: "DELIVERED", gateway: "Telenor Tameer", cost: 1.5,  sentAt: "29 Apr · 04:30 PM" },
];

export default function SMSHistoryPage() {
  const [search, setSearch] = React.useState("");

  const filtered = SMS_DATA.filter((s) =>
    !search || s.toName.toLowerCase().includes(search.toLowerCase()) || s.to.includes(search) || s.body.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<SMS>[] = [
    { key: "to", header: "Recipient", cell: (s) => (
        <div>
          <div className="text-sm font-medium text-navy-900 dark:text-white">{s.toName}</div>
          <div className="tabular text-xs text-slate-500 dark:text-slate-400">{s.to}</div>
        </div>
      )
    },
    { key: "templateCode", header: "Template", cell: (s) => <Badge variant="muted">{s.templateCode}</Badge> },
    { key: "body", header: "Body", cell: (s) => <span className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-md">{s.body}</span> },
    { key: "gateway", header: "Gateway", cell: (s) => <span className="text-xs text-slate-600 dark:text-slate-300">{s.gateway}</span> },
    { key: "cost", header: "Cost", align: "right", cell: (s) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">PKR {s.cost.toFixed(2)}</span> },
    { key: "sentAt", header: "Sent", cell: (s) => <span className="text-xs text-slate-500 dark:text-slate-400">{s.sentAt}</span> },
    { key: "status", header: "Status", cell: (s) => (
        <StatusPill variant={s.status === "DELIVERED" ? "success" : s.status === "SENT" ? "info" : s.status === "QUEUED" ? "warning" : "danger"}>
          {s.status}
        </StatusPill>
      )
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "SMS / Notifications" }, { label: "SMS History" }]}
        title="SMS History"
        subtitle="Outbound SMS sent to customers and suppliers"
        actions={
          <Button variant="accent" size="md" className="gap-1.5"><Plus /><span>Send SMS</span></Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Sent (Today)</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">142</div>
            </div>
            <Send className="size-5 text-info" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Delivered</div>
              <div className="text-2xl tabular font-bold text-success mt-1">138</div>
              <div className="text-2xs text-slate-500 dark:text-slate-400">97.2%</div>
            </div>
            <CheckCircle2 className="size-5 text-success" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Failed</div>
              <div className="text-2xl tabular font-bold text-danger mt-1">4</div>
            </div>
            <XCircle className="size-5 text-danger" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Cost (Month)</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">PKR 5,420</div>
            </div>
            <Clock className="size-5 text-warning" />
          </div>
        </Card>
      </div>

      <FilterBar searchPlaceholder="Search by recipient, number, or message…" searchValue={search} onSearchChange={setSearch} />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} pageSize={15} />
      </Card>
    </>
  );
}
