"use client";

import * as React from "react";
import { Filter, Globe, Building2, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FilterBar } from "@/components/ui/filter-bar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

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

type Action = (typeof ACTIONS)[number];
const SEVERITY_LABELS = ["all", "info", "warning", "danger"] as const;
type SeverityFilter = (typeof SEVERITY_LABELS)[number];

export default function AuditLogPage() {
  const [search, setSearch] = React.useState("");
  const [from, setFrom] = React.useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [severity, setSeverity] = React.useState<SeverityFilter>("all");
  const [selected, setSelected] = React.useState<Action | null>(null);

  const filtered = ACTIONS.filter((a) => {
    if (severity !== "all" && a.severity !== severity) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return a.user.toLowerCase().includes(q) || a.action.toLowerCase().includes(q) || a.entity.toLowerCase().includes(q);
  });

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Audit Log" }]}
        title="Audit Log"
        subtitle="Complete trail of every action across the system"
        actions={
          <ReportToolbar mode="range" reportName="Audit Log" fromDate={from} toDate={to} onRangeChange={(f, t) => { setFrom(f); setTo(t); }} />
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
        extraActions={
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="md" className="gap-1.5">
                <Filter />
                <span className="hidden sm:inline">Severity{severity !== "all" && `: ${severity}`}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1">
              {SEVERITY_LABELS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={cn(
                    "w-full text-left px-2.5 py-2 text-sm rounded-md hover:bg-slate-50 dark:hover:bg-navy-700 capitalize",
                    s === severity && "text-brand-yellow font-semibold"
                  )}
                >
                  {s}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        }
      />

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-navy-700">
          {filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className="w-full flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors text-left"
            >
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
              <span className="text-xs text-brand-yellow font-medium flex-shrink-0">View details →</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">No events match the current filters.</div>
          )}
        </div>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar initials={selected?.user === "System" ? "SY" : initials(selected?.user ?? "")} size="sm" />
              <span>{selected?.user}</span>
              {selected && <Badge variant={selected.severity}>{selected.action}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 mt-2">
              <div className="text-sm text-slate-700 dark:text-slate-200">
                <span className="font-semibold">Entity:</span> {selected.entity}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <Meta icon={Clock} label="When" value={selected.time} />
                <Meta icon={Globe} label="IP Address" value={selected.ip} />
                <Meta icon={Building2} label="Branch" value={selected.branch} />
                <Meta icon={Filter} label="Severity" value={selected.severity} />
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-navy-800 p-3 text-xs font-mono text-slate-600 dark:text-slate-300 max-h-40 overflow-auto">
                <div className="text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Request payload (sample)</div>
                {`{\n  "user_id": "${selected.user.replace(/\s+/g, '_').toLowerCase()}",\n  "action": "${selected.action}",\n  "entity": "${selected.entity}",\n  "ip_address": "${selected.ip}",\n  "user_agent": "Mozilla/5.0 (Windows NT 10.0)…",\n  "session_id": "sess_${selected.id}9c4f2a"\n}`}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Meta({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div>
      <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
        <Icon className="size-3.5 text-slate-400" />
        {label}
      </dt>
      <dd className="text-sm font-medium text-navy-900 dark:text-white mt-1 capitalize">{value}</dd>
    </div>
  );
}
