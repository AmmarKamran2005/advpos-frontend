"use client";

import * as React from "react";
import axios from "axios";
import Link from "next/link";
import { Plus, ArrowRight, Truck, Package, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

/* GET /inventory/transfers. These are the real "TransferStatus".StatusKey
   values. The page used to render six hardcoded rows. */
type Transfer = {
  id: number;
  transferNo: string;
  fromLocationId: number;
  fromLocation: string;
  toLocationId: number;
  toLocation: string;
  transferDate: string;
  receivedOn: string | null;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "IN_TRANSIT" | "RECEIVED" | "REJECTED";
  statusName: string;
  initiatedBy: string;
  approvedBy: string | null;
  notes: string | null;
  itemCount: number;
  totalUnits: number;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const STATUS_META: Record<Transfer["status"], { label: string; color: string; icon: typeof Clock }> = {
  DRAFT:            { label: "Draft",            color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-navy-700 dark:text-slate-300 dark:border-navy-600", icon: Clock },
  PENDING_APPROVAL: { label: "Pending Approval", color: "bg-warning-light text-warning-dark border-warning/30 dark:bg-warning/10 dark:text-warning-light",          icon: Clock },
  APPROVED:         { label: "Approved",         color: "bg-info-light text-info-dark border-info/30 dark:bg-info/10 dark:text-info-light",                        icon: CheckCircle },
  IN_TRANSIT:       { label: "In Transit",       color: "bg-brand-yellow-50 text-brand-yellow-700 border-brand-yellow/30 dark:bg-brand-yellow/10 dark:text-brand-yellow", icon: Truck },
  RECEIVED:         { label: "Received",         color: "bg-success-light text-success-dark border-success/30 dark:bg-success/10 dark:text-success-light",          icon: Package },
  REJECTED:         { label: "Rejected",         color: "bg-danger-light text-danger-dark border-danger/30 dark:bg-danger/10 dark:text-danger-light",                icon: AlertCircle },
};


export default function TransfersPage() {
  const [view, setView] = React.useState<"kanban" | "list">("kanban");
  const [TRANSFERS, setTransfers] = React.useState<Transfer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [receiving, setReceiving] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Transfer[]>(`${API_BASE_URL}/inventory/transfers`, {
        headers: authHeader(),
      });
      setTransfers(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the stock transfers."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  /* Receiving is the moment stock lands on the destination shelf -- the server
     writes a TRANSFER_IN movement per line, so reload rather than patch. */
  const receive = React.useCallback(async (id: number) => {
    setReceiving(id);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/inventory/transfers/${id}/receive`, {}, { headers: authHeader() });
      toast.success(res.data.message);
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "Could not receive the transfer."));
    } finally {
      setReceiving(null);
    }
  }, [load]);

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

      {error && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      ) : view === "kanban" ? (
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
                              <span className="text-2xs text-slate-500 dark:text-slate-400">{formatDate(t.transferDate)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 mb-2">
                              <span className="truncate flex-1">{t.fromLocation}</span>
                              <ArrowRight className="size-3 text-brand-yellow flex-shrink-0" />
                              <span className="truncate flex-1">{t.toLocation}</span>
                            </div>
                            <div className="flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400">
                              <span className="tabular">{t.itemCount} items · {t.totalUnits} units</span>
                              <span>{t.initiatedBy.split(" ")[0]}</span>
                            </div>
                            {t.status === "IN_TRANSIT" && (
                              /* Stock left the source shelf when the transfer
                                 was sent; it only lands here. */
                              <Button
                                variant="accent"
                                size="sm"
                                className="w-full mt-2"
                                disabled={receiving === t.id}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); void receive(t.id); }}
                              >
                                {receiving === t.id ? "Receiving…" : "Receive"}
                              </Button>
                            )}
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
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatDate(t.transferDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                        <span>{t.fromLocation}</span>
                        <ArrowRight className="size-3 text-brand-yellow" />
                        <span>{t.toLocation}</span>
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
