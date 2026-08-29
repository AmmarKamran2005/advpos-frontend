"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentActions } from "@/components/widgets/document-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /parties/{id}/statement?from=&to=
   Everything here used to be assembled in the browser out of src/data —
   getParty, the orders array, collectionsFor() and a hard-coded `company`
   object. The running balance is now computed server-side off POSTED journal
   lines, and the letterhead comes from the Company row, so a change made at
   /admin/settings reaches the paper a customer actually receives. */
type StatementLine = {
  id: number; date: string; entryNo: string; entryType: string;
  reference: string | null; narration: string | null;
  debit: number; credit: number; balance: number;
};

type Statement = {
  party: {
    id: number; partyCode: string; name: string; initials: string;
    phone: string | null; city: string | null;
    creditLimit: number; creditDays: number;
  };
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  lines: StatementLine[];
  company: {
    name: string; legalName: string; ntn: string; strn: string;
    email: string; phone: string; city: string; country: string;
    addressLine: string; currencySymbol: string;
  } | null;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function PartyStatementPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);

  const [data, setData] = React.useState<Statement | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [from, setFrom] = React.useState(() => new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0, 10));

  const load = React.useCallback(async () => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    try {
      const res = await axios.get<Statement>(`${API_BASE_URL}/parties/${id}/statement`, {
        params: { from, to },
        headers: authHeader(),
      });
      setData(res.data);
      setNotFound(false);
      setError(null);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true);
      else setError(apiMessage(e, "Could not load this statement."));
    } finally {
      setLoading(false);
    }
  }, [id, from, to]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  if (notFound) {
    return (
      <EmptyState icon={AlertCircle} title="Party not found" description={`No party with id ${id}.`}
        action={<Button variant="accent" asChild><Link href="/parties">Back to Parties</Link></Button>} />
    );
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "People" },
          { label: "Parties", href: "/parties" },
          { label: data?.party.name ?? "Party", href: `/parties/${id}` },
          { label: "Statement" },
        ]}
        title="Account Statement"
        subtitle={data ? `${data.party.name} · ${data.party.partyCode}` : "Loading…"}
        actions={
          <>
            <Button variant="ghost" className="gap-1.5" asChild>
              <Link href={`/parties/${id}`}><ArrowLeft />Back</Link>
            </Button>
            <Button variant="ghost" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" />Refresh
            </Button>
            <DocumentActions kind="party-statement" id={id} label="statement" />
          </>
        }
      />

      {error && (
        <Card className="mb-4 print:hidden">
          <CardBody className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy-900 dark:text-white">{error}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">The API must be running on {API_BASE_URL}.</div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" /> Try again
            </Button>
          </CardBody>
        </Card>
      )}

      <Card className="mb-4 print:hidden">
        <CardBody className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div>
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} className="mt-1.5"
              onChange={(e) => { setLoading(true); setFrom(e.target.value); }} />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} className="mt-1.5"
              onChange={(e) => { setLoading(true); setTo(e.target.value); }} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 sm:ml-auto">
            Only POSTED entries appear on a statement — a draft is not money owed.
          </p>
        </CardBody>
      </Card>

      {loading ? (
        <Card><CardBody className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
        </CardBody></Card>
      ) : !data ? null : (
        <Card>
          <CardBody className="p-6 sm:p-8">
            {/* ── Letterhead ─────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200 dark:border-navy-700">
              <div>
                <div className="text-lg font-bold text-navy-900 dark:text-white">
                  {data.company?.name ?? "—"}
                </div>
                {data.company && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
                    <div>{data.company.legalName}</div>
                    <div>{[data.company.addressLine, data.company.city, data.company.country].filter(Boolean).join(", ")}</div>
                    <div className="tabular">{data.company.phone}{data.company.email ? ` · ${data.company.email}` : ""}</div>
                    {data.company.ntn && <div className="tabular">NTN {data.company.ntn}{data.company.strn ? ` · STRN ${data.company.strn}` : ""}</div>}
                  </div>
                )}
              </div>
              <div className="sm:text-right">
                <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Statement of Account</div>
                <div className="text-sm font-semibold text-navy-900 dark:text-white mt-1">{data.party.name}</div>
                <div className="tabular text-xs text-slate-500 dark:text-slate-400">{data.party.partyCode}</div>
                {data.party.phone && <div className="tabular text-xs text-slate-500 dark:text-slate-400">{data.party.phone}</div>}
                {data.party.city && <div className="text-xs text-slate-500 dark:text-slate-400">{data.party.city}</div>}
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {formatDate(from)} – {formatDate(to)}
                </div>
              </div>
            </div>

            {/* ── Summary ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-5 border-b border-slate-200 dark:border-navy-700">
              <Fig label="Opening" value={formatMoney(data.openingBalance)} />
              <Fig label="Charged" value={formatMoney(data.totalDebit)} />
              <Fig label="Paid" value={formatMoney(data.totalCredit)} tone="text-success" />
              <Fig label="Closing balance" value={formatMoney(data.closingBalance)} strong />
            </div>

            {/* ── Lines ──────────────────────────────────────────────── */}
            {data.lines.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={AlertCircle}
                  title="Nothing posted in this range"
                  description="This party has no posted entries between the two dates. Widen the range above."
                />
              </div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-200 dark:border-navy-700">
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 py-2 pr-3">Date</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 py-2 px-3">Entry</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 py-2 px-3">Reference</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 py-2 px-3">Description</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 py-2 px-3 text-right">Charged</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 py-2 px-3 text-right">Paid</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 py-2 pl-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    <tr>
                      <td className="py-2.5 pr-3 text-xs text-slate-500 dark:text-slate-400">{formatDate(from)}</td>
                      <td className="py-2.5 px-3" colSpan={3}>
                        <span className="text-sm italic text-slate-500 dark:text-slate-400">Opening balance</span>
                      </td>
                      <td className="py-2.5 px-3" /><td className="py-2.5 px-3" />
                      <td className="py-2.5 pl-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">
                        {formatMoney(data.openingBalance)}
                      </td>
                    </tr>
                    {data.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2.5 pr-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(l.date)}</td>
                        <td className="py-2.5 px-3 tabular text-xs font-medium text-navy-900 dark:text-white whitespace-nowrap">{l.entryNo}</td>
                        <td className="py-2.5 px-3 tabular text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">{l.reference ?? "—"}</td>
                        <td className="py-2.5 px-3 text-sm text-slate-600 dark:text-slate-300">{l.narration ?? l.entryType}</td>
                        <td className="py-2.5 px-3 text-right tabular text-sm">
                          {l.debit > 0 ? formatMoney(l.debit) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular text-sm text-success">
                          {l.credit > 0 ? formatMoney(l.credit) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-2.5 pl-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">
                          {formatMoney(l.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 dark:border-navy-600">
                      <td className="py-3 pr-3" colSpan={4}>
                        <span className="text-sm font-bold text-navy-900 dark:text-white">Closing balance</span>
                      </td>
                      <td className="py-3 px-3 text-right tabular text-sm font-semibold">{formatMoney(data.totalDebit)}</td>
                      <td className="py-3 px-3 text-right tabular text-sm font-semibold text-success">{formatMoney(data.totalCredit)}</td>
                      <td className="py-3 pl-3 text-right tabular text-base font-bold text-navy-900 dark:text-white">
                        {formatMoney(data.closingBalance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-navy-700 text-2xs text-slate-500 dark:text-slate-400">
              Credit limit {formatMoney(data.party.creditLimit)} · {data.party.creditDays} days.
              Please quote the entry number when settling. Raised from AdvPOS.
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}

function Fig({ label, value, tone, strong }: { label: string; value: string; tone?: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cn("tabular font-bold mt-1", strong ? "text-2xl" : "text-lg", tone ?? "text-navy-900 dark:text-white")}>
        {value}
      </div>
    </div>
  );
}
