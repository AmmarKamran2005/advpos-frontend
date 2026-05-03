"use client";

import * as React from "react";
import { Filter, Download, Calendar } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FilterBar } from "@/components/ui/filter-bar";
import { initials, formatDate } from "@/lib/format";

const ACTIONS = [
  { id: 1, user: "Sara Khan",     action: "DISPATCHED", entity: "Order ORD-KHI-26-0142",     time: "2 min ago",    ip: "182.181.45.22", branch: "Karachi",    severity: "info" as const },
  { id: 2, user: "System",        action: "AUTO-POST",  entity: "Journal Entry JE-26-1042",  time: "2 min ago",    ip: "internal",      branch: "Karachi",    severity: "muted" as const },
  { id: 3, user: "Hassan Raza",   action: "OVERRIDDEN", entity: "Credit Hold ORD-LHR-26-0089", time: "15 min ago", ip: "182.181.45.30", branch: "Lahore",     severity: "warning" as const },
  { id: 4, user: "Bilal Ahmed",   action: "POSTED",     entity: "GRN-KHI-26-0089",            time: "1 hour ago",  ip: "182.181.45.45", branch: "Karachi",    severity: "info" as const },
  { id: 5, user: "Hassan Raza",   action: "CREATED",    entity: "Voucher VCH-KHI-26-0089",    time: "2 hours ago", ip: "182.181.45.30", branch: "Karachi",    severity: "info" as const },
  { id: 6, user: "Umer Memon",    action: "UPDATED",    entity: "Party VZ-C-0008 (credit limit)", time: "3 hours ago", ip: "182.181.45.10", branch: "Karachi", severity: "warning" as const },
  { id: 7, user: "Umer Memon",    action: "CREATED",    entity: "Customer VZ-C-0024",         time: "3 hours ago", ip: "182.181.45.10", branch: "Karachi",    severity: "info" as const },
  { id: 8, user: "Sara Khan",     action: "LOGIN",      entity: "User session",                time: "5 hours ago", ip: "182.181.45.22", branch: "Lahore",     severity: "muted" as const },
  { id: 9, user: "Asad Ali",      action: "LOGIN_FAIL", entity: "Failed authentication",       time: "Yesterday",   ip: "39.40.123.55",  branch: "—",           severity: "danger" as const },
  { id: 10, user: "Umer Memon",   action: "DELETED",    entity: "Product VZ-OLD-005",          time: "Yesterday",   ip: "182.181.45.10", branch: "Karachi",    severity: "danger" as const },
];

const SEVERITY_COLOR = {
  muted:   "bg-slate-100 text-slate-600 dark:bg-navy-700 dark:text-slate-300",
  info:    "bg-info-light text-info-dark dark:bg-info/15 dark:text-info-light",
  warning: "bg-warning-light text-warning-dark dark:bg-warning/15 dark:text-warning-light",
  danger:  "bg-danger-light text-danger-dark dark:bg-danger/15 dark:text-danger-light",
};

export default function AuditLogPage() {
  const [search, setSearch] = React.useState("");

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Audit Log" }]}
        title="Audit Log"
        subtitle="Complete trail of every action across the system"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5">
              <Calendar />
              <span className="hidden sm:inline">Last 30 days</span>
            </Button>
            <Button variant="secondary" size="md" className="gap-1.5">
              <Download />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Events Today</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">142</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Failed Logins</div>
          <div className="text-2xl tabular font-bold text-danger mt-1">3</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Permission Changes</div>
          <div className="text-2xl tabular font-bold text-warning mt-1">2</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Active Sessions</div>
          <div className="text-2xl tabular font-bold text-success mt-1">8</div>
        </Card>
      </div>

      <FilterBar
        searchPlaceholder="Search by user, action, entity…"
        searchValue={search}
        onSearchChange={setSearch}
        extraActions={<Button variant="secondary" size="md" className="gap-1.5"><Filter /><span className="hidden sm:inline">Severity</span></Button>}
      />

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-navy-700">
          {ACTIONS.map((a) => (
            <div key={a.id} className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">
              <Avatar initials={a.user === "System" ? "SY" : initials(a.user)} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-navy-900 dark:text-white">{a.user}</span>
                  <Badge variant={a.severity}>{a.action}</Badge>
                  <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{a.entity}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-2xs text-slate-500 dark:text-slate-400">
                  <span>{a.time}</span>
                  <span>·</span>
                  <span className="tabular">{a.ip}</span>
                  {a.branch !== "—" && (
                    <>
                      <span>·</span>
                      <span>{a.branch}</span>
                    </>
                  )}
                </div>
              </div>
              <button className="text-xs text-brand-yellow hover:underline font-medium flex-shrink-0">
                View details
              </button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
