"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, ArrowRight, Truck, Package, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Transfer = {
  id: number;
  transferNo: string;
  date: string;
  fromWh: string;
  toWh: string;
  itemCount: number;
  totalUnits: number;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "IN_TRANSIT" | "RECEIVED" | "REJECTED";
  initiatedBy: string;
};

const STATUS_META: Record<Transfer["status"], { label: string; color: string; icon: typeof Clock }> = {
  DRAFT:            { label: "Draft",            color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-navy-700 dark:text-slate-300 dark:border-navy-600", icon: Clock },
  PENDING_APPROVAL: { label: "Pending Approval", color: "bg-warning-light text-warning-dark border-warning/30 dark:bg-warning/10 dark:text-warning-light",          icon: Clock },
  APPROVED:         { label: "Approved",         color: "bg-info-light text-info-dark border-info/30 dark:bg-info/10 dark:text-info-light",                        icon: CheckCircle },
  IN_TRANSIT:       { label: "In Transit",       color: "bg-brand-yellow-50 text-brand-yellow-700 border-brand-yellow/30 dark:bg-brand-yellow/10 dark:text-brand-yellow", icon: Truck },
  RECEIVED:         { label: "Received",         color: "bg-success-light text-success-dark border-success/30 dark:bg-success/10 dark:text-success-light",          icon: Package },
  REJECTED:         { label: "Rejected",         color: "bg-danger-light text-danger-dark border-danger/30 dark:bg-danger/10 dark:text-danger-light",                icon: AlertCircle },
};

const TRANSFERS: Transfer[] = [
  { id: 1, transferNo: "TRF-26-0014", date: "2026-04-30", fromWh: "Karachi Main",       toWh: "Lahore Distribution", itemCount: 8, totalUnits: 240, status: "IN_TRANSIT",       initiatedBy: "Hassan Raza" },
  { id: 2, transferNo: "TRF-26-0013", date: "2026-04-29", fromWh: "Karachi Main",       toWh: "Islamabad Hub",       itemCount: 5, totalUnits: 150, status: "RECEIVED",         initiatedBy: "Bilal Ahmed" },
  { id: 3, transferNo: "TRF-26-0012", date: "2026-04-29", fromWh: "Karachi Main",       toWh: "Lahore Distribution", itemCount: 4, totalUnits: 100, status: "RECEIVED",         initiatedBy: "Hassan Raza" },
  { id: 4, transferNo: "TRF-26-0008", date: "2026-04-28", fromWh: "Lahore Distribution", toWh: "Islamabad Hub",       itemCount: 3, totalUnits: 60,  status: "APPROVED",         initiatedBy: "Sara Khan" },
  { id: 5, transferNo: "TRF-26-0011", date: "2026-04-25", fromWh: "Karachi Main",       toWh: "Lahore Distribution", itemCount: 6, totalUnits: 180, status: "PENDING_APPROVAL", initiatedBy: "Hassan Raza" },
  { id: 6, transferNo: "TRF-26-0010", date: "2026-04-24", fromWh: "Karachi Main",       toWh: "Islamabad Hub",       itemCount: 2, totalUnits: 50,  status: "REJECTED",         initiatedBy: "Hassan Raza" },
];

export default function TransfersPage() {
  const [view, setView] = React.useState<"kanban" | "list">("kanban");

  const STATUSES: Transfer["status"][] = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "IN_TRANSIT", "RECEIVED"];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Stock Transfers" }]}
        title="Stock Transfers"
        subtitle="Move inventory between locations"
        actions={
          <>
            <div className="flex items-center bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-lg p-0.5">
              <button
                onClick={() => setView("kanban")}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  view === "kanban"
                    ? "bg-navy-900 text-brand-yellow dark:bg-navy-700"
                    : "text-slate-500 hover:text-navy-900 dark:hover:text-white"
                )}
              >
                Kanban
              </button>
              <button
                onClick={() => setView("list")}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  view === "list"
                    ? "bg-navy-900 text-brand-yellow dark:bg-navy-700"
                    : "text-slate-500 hover:text-navy-900 dark:hover:text-white"
                )}
              >
                List
              </button>
            </div>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/inventory/transfers/new">
                <Plus />
                <span>New Transfer</span>
              </Link>
            </Button>
          </>
        }
      />

      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {STATUSES.map((status) => {
            const meta = STATUS_META[status];
            const Icon = meta.icon;
            const list = TRANSFERS.filter((t) => t.status === status);
            return (
              <div key={status} className="min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-slate-500" />
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-600 dark:text-slate-400">{meta.label}</span>
                  </div>
                  <Badge variant="muted">{list.length}</Badge>
                </div>
                <div className="space-y-3">
                  {list.length === 0 ? (
                    <div className="text-xs text-slate-400 text-center py-8 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg">
                      No transfers
                    </div>
                  ) : (
                    list.map((t) => (
                      <Link key={t.id} href={`/inventory/transfers/${t.id}`}>
                        <Card className="cursor-pointer hover:border-brand-yellow/40 transition-colors">
                          <CardBody className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="tabular text-xs font-bold text-navy-900 dark:text-white">{t.transferNo}</span>
                              <span className="text-2xs text-slate-500 dark:text-slate-400">{formatDate(t.date)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 mb-2">
                              <span className="truncate flex-1">{t.fromWh}</span>
                              <ArrowRight className="size-3 text-brand-yellow flex-shrink-0" />
                              <span className="truncate flex-1">{t.toWh}</span>
                            </div>
                            <div className="flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400">
                              <span className="tabular">{t.itemCount} items · {t.totalUnits} units</span>
                              <span>{t.initiatedBy.split(" ")[0]}</span>
                            </div>
                          </CardBody>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-navy-700/50 border-b border-slate-200 dark:border-navy-700">
                <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Transfer #</th>
                <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Date</th>
                <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Route</th>
                <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Items</th>
                <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Status</th>
                <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
              {TRANSFERS.map((t) => {
                const meta = STATUS_META[t.status];
                const Icon = meta.icon;
                return (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-navy-800 cursor-pointer" onClick={() => { window.location.href = `/inventory/transfers/${t.id}`; }}>
                    <td className="px-4 py-3 tabular text-sm font-medium text-navy-900 dark:text-white">{t.transferNo}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatDate(t.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                        <span>{t.fromWh}</span>
                        <ArrowRight className="size-3 text-brand-yellow" />
                        <span>{t.toWh}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular text-sm text-slate-600 dark:text-slate-300">{t.itemCount} ({t.totalUnits} units)</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border", meta.color)}>
                        <Icon className="size-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{t.initiatedBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
