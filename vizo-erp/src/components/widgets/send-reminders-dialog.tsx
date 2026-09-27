"use client";

import * as React from "react";
import axios from "axios";
import { BellRing, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney } from "@/lib/format";

export type ReminderCandidate = {
  customerId: number;
  customerName: string;
  overdue: number;
  outstanding: number;
  daysOverdue: number;
  salesPerson: string | null;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/**
 * "Send Reminders" on AR Aging -- POST /reports/aging/customer/reminders.
 *
 * It used to be a toast saying an SMS provider was needed. The people who
 * chase the money are already in the app: each customer's salesperson gets one
 * in-app + push message listing his overdue customers with amounts and days,
 * the Super Admin and the accountant get the summary, and every customer
 * reminded goes into the activity log. The customers themselves are reached by
 * the WhatsApp button on each row of the report.
 *
 * Everybody past due is ticked to start with; untick anyone already spoken to.
 */
export function SendRemindersDialog({
  open, onOpenChange, candidates, asOf,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidates: ReminderCandidate[];
  asOf: string;
}) {
  const [picked, setPicked] = React.useState<Set<number>>(
    () => new Set(candidates.filter((c) => c.overdue > 0).map((c) => c.customerId)));
  const [sending, setSending] = React.useState(false);

  const chosen = candidates.filter((c) => picked.has(c.customerId));
  const total = chosen.reduce((s, c) => s + (c.overdue > 0 ? c.overdue : c.outstanding), 0);
  const noRep = chosen.filter((c) => !c.salesPerson).length;

  function toggle(id: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function send() {
    setSending(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/reports/aging/customer/reminders`,
        { customerIds: chosen.map((c) => c.customerId), asOf },
        { headers: authHeader() }
      );
      toast.success("Reminders sent", { description: res.data.message });
      onOpenChange(false);
    } catch (e) {
      toast.error("Reminders not sent", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="w-[calc(100%-1.5rem)]">
        <DialogHeader>
          <DialogTitle>Send payment reminders</DialogTitle>
          <DialogDescription>
            Each salesperson is told which of his customers owe, how much and how late — in the app and
            on his phone. The Super Admin and accounts get the summary.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>{chosen.length} of {candidates.length} selected · {formatMoney(total)}</span>
            <button type="button" className="hover:text-brand-yellow"
              onClick={() => setPicked(chosen.length === candidates.length ? new Set() : new Set(candidates.map((c) => c.customerId)))}>
              {chosen.length === candidates.length ? "Select none" : "Select all"}
            </button>
          </div>
          <div className="max-h-[50vh] overflow-y-auto scrollbar-thin rounded-lg border border-slate-200 dark:border-navy-700 divide-y divide-slate-100 dark:divide-navy-700">
            {candidates.map((c) => (
              <label key={c.customerId} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-navy-700/50">
                <Checkbox checked={picked.has(c.customerId)} onCheckedChange={() => toggle(c.customerId)} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{c.customerName}</div>
                  <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">
                    {c.salesPerson ? `to ${c.salesPerson}` : <span className="text-warning">no salesperson assigned</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">
                    {formatMoney(c.overdue > 0 ? c.overdue : c.outstanding)}
                  </div>
                  <div className={c.overdue > 0 ? "text-2xs text-danger" : "text-2xs text-slate-400"}>
                    {c.overdue > 0 ? `${c.daysOverdue} days late` : "not yet due"}
                  </div>
                </div>
              </label>
            ))}
          </div>
          {noRep > 0 && (
            <p className="text-2xs text-warning mt-2">
              {noRep} selected {noRep === 1 ? "customer has" : "customers have"}{" "}no salesperson — only the back office will be told.
              Assign one on the customer&apos;s page.
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button variant="accent" className="gap-1.5" disabled={chosen.length === 0 || sending} onClick={() => void send()}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
            Send {chosen.length} reminder{chosen.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
