"use client";

import * as React from "react";
import axios from "axios";
import { MessageSquare, AlertCircle, BellRing } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { AiInsight } from "@/components/widgets/ai-insight";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import { SendRemindersDialog } from "@/components/widgets/send-reminders-dialog";
import { overdueMessage, whatsappUrl } from "@/lib/whatsapp";
import { todayISO } from "@/lib/dates";

/* GET /reports/aging/customer?asOf=YYYY-MM-DD

   The buckets are real: the API ages each open invoice from its DUE date, not
   the invoice date, so an invoice on 60-day terms is not counted overdue on
   day 31. The mock this replaced fabricated the buckets with `i % 4`
   arithmetic off the customer balance -- the numbers looked plausible and meant
   nothing. */
type AgingRow = {
  customerId: number;
  customerName: string;
  customerInitials: string;
  creditDays: number;
  creditLimit: number;
  invoiceCount: number;
  current: number;
  d0_30: number;
  d31_60: number;
  d61_90: number;
  d90plus: number;
  outstanding: number;
  overLimit: boolean;
  /* Since 27 Sep (round E): who to message, whose customer he is, and the
     part that is actually past due with how late the oldest of it is. */
  phone: string | null;
  salesPerson: string | null;
  overdue: number;
  daysOverdue: number;
};

type AgingResponse = {
  asOf: string;
  customerCount: number;
  current: number;
  d0_30: number;
  d31_60: number;
  d61_90: number;
  d90plus: number;
  totalOutstanding: number;
  overLimitCount: number;
  items: AgingRow[];
};

const EMPTY: AgingResponse = {
  asOf: "", customerCount: 0, current: 0, d0_30: 0, d31_60: 0, d61_90: 0,
  d90plus: 0, totalOutstanding: 0, overLimitCount: 0, items: [],
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function CustomerAgingPage() {
  /* The LOCAL date -- toISOString() is UTC, which is yesterday before 5 am
     in Pakistan (HANDOFF trap 19). */
  const [asOf, setAsOf] = React.useState(() => todayISO());
  const [reminding, setReminding] = React.useState(false);
  const [lang, setLang] = React.useState<"en" | "ur">("en");
  const [locationId, setLocationId] = React.useState<number | null>(null);
  const [data, setData] = React.useState<AgingResponse>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<AgingResponse>(`${API_BASE_URL}/reports/aging/customer`, {
        params: { asOf },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not build the receivables ageing report."));
    } finally {
      setLoading(false);
    }
  }, [asOf]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  /* Past its DUE date at all -- the same test the API uses when it sends. */
  const overdueCount = data.items.filter((r) => r.overdue > 0).length;

  /* The WhatsApp handoff, per customer. wa.me only opens the chat with the
     text in it; nothing leaves until somebody presses Send. The opening is
     recorded in the activity log, so "what was sent" covers these too. The
     tab is opened INSIDE the click (a popup opened after an await is blocked
     -- HANDOFF trap 15) and the log call goes out after. */
  function whatsApp(r: AgingRow) {
    const url = r.phone ? whatsappUrl(r.phone, overdueMessage({
      customerName: r.customerName, overdue: r.overdue, outstanding: r.outstanding,
      daysOverdue: r.daysOverdue, salesPerson: r.salesPerson, language: lang,
    })) : null;
    if (!url) {
      toast.error("No WhatsApp number", { description: `${r.customerName} has no usable phone number on file.` });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    void axios.post(`${API_BASE_URL}/reports/aging/customer/reminders/whatsapp`,
      { customerId: r.customerId, asOf, language: lang }, { headers: authHeader() })
      .catch(() => { /* the chat opened; a missed log line is not worth an error */ });
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "AR Aging" }]}
        title="Accounts Receivable Aging"
        subtitle={`Outstanding by age bucket — as of ${asOf}`}
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              className="gap-1.5"
              disabled={data.items.length === 0}
              onClick={() => setReminding(true)}
              title={`${overdueCount} customer(s) past due`}
            >
              <BellRing />
              <span className="hidden sm:inline">Send Reminders</span>
              {overdueCount > 0 && <span className="tabular text-2xs font-bold text-danger">{overdueCount}</span>}
            </Button>
            <ReportToolbar
              mode="asOf"
              reportName="AR Aging"
              asOfDate={asOf}
              onAsOfChange={setAsOf}
              locationId={locationId}
              onLocationChange={setLocationId}
              doc={{ family: "report", key: "aging-customer" }}
            />
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

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <BucketCard label="Total AR"  value={data.totalOutstanding} color="text-navy-900 dark:text-white" loading={loading} />
        <BucketCard label="Current"   value={data.current}          color="text-success" loading={loading} />
        <BucketCard label="1-30 Days" value={data.d0_30}            color="text-info" loading={loading} />
        <BucketCard label="31-60 Days" value={data.d31_60}          color="text-warning" loading={loading} />
        <BucketCard label="61-90 Days" value={data.d61_90}          color="text-warning" loading={loading} />
        <BucketCard label="90+ Days"  value={data.d90plus}          color="text-danger" loading={loading} />
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Nothing outstanding as of {asOf}. Every invoice is settled.
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-navy-700/50 border-b border-slate-200 dark:border-navy-700">
                  <th className="text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Customer</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">Current</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">1-30</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">31-60</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">61-90</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">90+</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5">Total</th>
                  <th className="text-right text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-brand-yellow normal-case"
                      onClick={() => setLang((l) => (l === "en" ? "ur" : "en"))}
                      title="Language of the WhatsApp message">
                      WhatsApp · {lang === "en" ? "English" : "اردو"}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {data.items.map((r) => (
                  <tr key={r.customerId} className="hover:bg-slate-50 dark:hover:bg-navy-800">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={r.customerInitials} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-navy-900 dark:text-white">
                            {r.customerName}
                          </div>
                          <div className="text-2xs text-slate-500 dark:text-slate-400">
                            {r.salesPerson ? `${r.salesPerson} · ` : ""}NET {r.creditDays} · {r.invoiceCount} open
                            {r.overdue > 0 && <span className="text-danger"> · {r.daysOverdue}d late</span>}
                            {r.overLimit && (
                              <span className="text-danger font-semibold"> · over limit</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <Cell value={r.current} className="text-success" />
                    <Cell value={r.d0_30} className="text-info" />
                    <Cell value={r.d31_60} className="text-warning" bold />
                    <Cell value={r.d61_90} className="text-warning" bold />
                    <Cell value={r.d90plus} className="text-danger" bold />
                    <td className="px-4 py-2.5 text-right tabular text-sm font-bold text-navy-900 dark:text-white">
                      {formatMoney(r.outstanding)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button size="sm" variant="ghost" className="gap-1 text-success" disabled={!r.phone}
                        title={r.phone ? `Open WhatsApp to ${r.phone}` : "No phone number on file"}
                        onClick={() => whatsApp(r)}>
                        <MessageSquare className="size-3.5" /> Remind
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-navy-900 text-white">
                  <td className="px-4 py-3 text-sm font-bold uppercase tracking-wider">Totals</td>
                  <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(data.current)}</td>
                  <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(data.d0_30)}</td>
                  <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(data.d31_60)}</td>
                  <td className="px-3 py-3 text-right tabular text-sm font-bold">{formatMoney(data.d61_90)}</td>
                  <td className="px-3 py-3 text-right tabular text-sm font-bold text-brand-yellow">{formatMoney(data.d90plus)}</td>
                  <td className="px-4 py-3 text-right tabular text-base font-bold text-brand-yellow">{formatMoney(data.totalOutstanding)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {reminding && (
        <SendRemindersDialog
          open
          onOpenChange={setReminding}
          asOf={asOf}
          candidates={data.items.map((r) => ({
            customerId: r.customerId, customerName: r.customerName, overdue: r.overdue,
            outstanding: r.outstanding, daysOverdue: r.daysOverdue, salesPerson: r.salesPerson,
          }))}
        />
      )}

      {/* Feature #6. Ordered by who is likely to pay rather than who is
          oldest, and it drafts the WhatsApp message for the first name. */}
      <AiInsight
        className="mt-6"
        endpoint="/reports/recovery-priority"
        label="Who should I call first?"
        hint="Weighs the amount, how late it is, and whether they have paid before -- not simply oldest first."
      />
    </>
  );
}

function Cell({ value, className, bold }: { value: number; className: string; bold?: boolean }) {
  return (
    <td
      className={cn(
        "px-3 py-2.5 text-right tabular text-sm",
        bold && "font-semibold",
        value > 0 ? className : "text-slate-300 dark:text-slate-600"
      )}
    >
      {value > 0 ? formatMoney(value) : "—"}
    </td>
  );
}

function BucketCard({
  label, value, color, loading,
}: { label: string; value: number; color: string; loading: boolean }) {
  return (
    <Card className="p-3">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      {loading ? (
        <Skeleton className="h-6 w-20 mt-1" />
      ) : (
        <div className={`text-lg tabular font-bold mt-1 ${color}`}>
          {formatCompact(value, false)}
        </div>
      )}
    </Card>
  );
}
