"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus, Search, PackageX, Send, Clock, TrendingDown, AlertTriangle, ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/widgets/stat-card";
import { ClaimInDialog } from "@/components/dialogs/claim-in-dialog";
import axios from "axios";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /claims -> { openCount, openValue, totalValue, items }.

   The stage and outcome maps used to be imported from @/data/claims, which
   dragged the whole mock claim array into the bundle for three lookup
   tables (AGENTS.md rule 5), so they are inlined here. The keys are the real
   "ClaimStage".StageKey and "ClaimOutcome".OutcomeKey values.

   TODAY came from the mock reminders module; the API already returns
   daysWithSupplier, so nothing here has to know what day it is. */
type ClaimStage =
  | "RECEIVED" | "SENT" | "REPLACED" | "CREDITED" | "REJECTED" | "WRITTEN_OFF";

type CustomerOutcome = "REPLACED_NOW" | "CREDIT_NOTE" | "WAITING";

const CLAIM_STAGE_VARIANT: Record<ClaimStage, "success" | "warning" | "danger" | "info" | "muted"> = {
  RECEIVED: "warning",
  SENT: "info",
  REPLACED: "success",
  CREDITED: "success",
  REJECTED: "danger",
  WRITTEN_OFF: "muted",
};

const CLAIM_STAGE_LABEL: Record<ClaimStage, string> = {
  RECEIVED: "In claim stock",
  SENT: "With supplier",
  REPLACED: "Replaced",
  CREDITED: "Credited",
  REJECTED: "Refused",
  WRITTEN_OFF: "Written off",
};

const OUTCOME_LABEL: Record<CustomerOutcome, string> = {
  REPLACED_NOW: "Replaced on the spot",
  CREDIT_NOTE: "Credit given",
  WAITING: "Customer waiting",
};

type Claim = {
  id: number;
  claimNo: string;
  customerId: number;
  customerName: string;
  customerInitials: string;
  receivedOn: string;
  receivedBy: string;
  productId: number;
  productName: string;
  sku: string;
  qty: number;
  unitCost: number;
  value: number;
  reason: string;
  reasonLabel: string;
  usuallyAccepted: boolean;
  note: string | null;
  originalOrderNo: string | null;
  customerOutcome: CustomerOutcome;
  customerOutcomeLabel: string;
  stage: ClaimStage;
  stageLabel: string;
  isOpen: boolean;
  supplierId: number | null;
  supplierName: string | null;
  sentOn: string | null;
  settledOn: string | null;
  supplierNote: string | null;
  remindersSent: number;
  daysWithSupplier: number | null;
};

/* The "claim" group out of AppSetting, served by GET /claims/lookups. It used
   to be a hard-coded object in src/data/settings; a Super Admin editing the
   reminder periods at /admin/settings now actually changes what this screen
   calls overdue. */
type ClaimPolicy = {
  windowDays: number;
  remindSupplierAfterDays: number;
  remindEveryHours: number;
  remindUnsentAfterDays: number;
  replaceUpfront: boolean;
  writeOffAccount: string;
};

const POLICY_FALLBACK: ClaimPolicy = {
  windowDays: 180,
  remindSupplierAfterDays: 14,
  remindEveryHours: 48,
  remindUnsentAfterDays: 3,
  replaceUpfront: true,
  writeOffAccount: "Warranty & Claims",
};

type ClaimsResponse = {
  openCount: number;
  openValue: number;
  totalValue: number;
  items: Claim[];
};

type SupplierCard = {
  supplierId: number;
  supplierName: string;
  supplierInitials: string;
  total: number;
  sent: number;
  settled: number;
  refused: number;
  open: number;
  avgDays: number;
  honourRate: number;
  valueOpen: number;
  valueTotal: number;
};

type WorstItem = {
  productId: number;
  productName: string;
  sku: string;
  claims: number;
  qty: number;
  value: number;
};

const claimValue = (list: Claim[]) => list.reduce((sum, c) => sum + c.value, 0);

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

import { formatMoney, formatCompact, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS: { key: ClaimStage | "ALL" | "OPEN"; label: string }[] = [
  { key: "OPEN", label: "Open" },
  { key: "RECEIVED", label: "On the shelf" },
  { key: "SENT", label: "With supplier" },
  { key: "REPLACED", label: "Replaced" },
  { key: "REJECTED", label: "Refused" },
  { key: "ALL", label: "All" },
];

/* The mock pinned "today" to a constant so the demo data always looked fresh.
   Against a real database the real date is the right one. */
function daysSince(iso: string) {
  return Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function ClaimsPage() {
  const [claims, setClaims] = React.useState<Claim[]>([]);
  const [scorecard, setScorecard] = React.useState<SupplierCard[]>([]);
  const [policy, setPolicy] = React.useState<ClaimPolicy>(POLICY_FALLBACK);
  const [worst, setWorst] = React.useState<WorstItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<ClaimStage | "ALL" | "OPEN">("OPEN");
  const [search, setSearch] = React.useState("");
  const [receiving, setReceiving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      /* Three independent reads, so fire them together rather than in
         sequence -- the scorecard does not depend on the list. */
      const [list, cards, items, lookups] = await Promise.all([
        axios.get<ClaimsResponse>(`${API_BASE_URL}/claims`, { headers: authHeader() }),
        axios.get<SupplierCard[]>(`${API_BASE_URL}/claims/supplier-scorecard`, { headers: authHeader() }),
        axios.get<WorstItem[]>(`${API_BASE_URL}/claims/worst-items`, {
          params: { limit: 5 },
          headers: authHeader(),
        }),
        axios.get<{ policy: ClaimPolicy }>(`${API_BASE_URL}/claims/lookups`, { headers: authHeader() }),
      ]);
      setClaims(list.data.items);
      setError(null);
      setScorecard(cards.data);
      setWorst(items.data);
      setPolicy(lookups.data.policy);
    } catch (e) {
      setError(apiMessage(e, "Could not load the claims."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. Disabled here rather
       than globally so the rule still catches the cases worth fixing. */
    void load();
  }, [load]);

  const rows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims.filter((c) => {
      if (tab === "OPEN" && !["RECEIVED", "SENT"].includes(c.stage)) return false;
      if (tab !== "OPEN" && tab !== "ALL" && c.stage !== tab) return false;
      if (!q) return true;
      return (
        c.claimNo.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.productName.toLowerCase().includes(q) ||
        c.sku.includes(q)
      );
    });
  }, [claims, tab, search]);

  const open = React.useMemo(() => claims.filter((c) => c.isOpen), [claims]);
  const onShelf = claims.filter((c) => c.stage === "RECEIVED");
  const withSupplier = claims.filter((c) => c.stage === "SENT");
  const lost = claims.filter((c) => c.stage === "REJECTED" || c.stage === "WRITTEN_OFF");

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Daily Work" }, { label: "Claims" }]}
        title="Claims & Warranty"
        subtitle="Faulty pieces back from shops, and what the supplier did about them."
        actions={
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => setReceiving(true)}>
            <Plus />
            <span>Receive Claim</span>
          </Button>
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


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <StatCard
          label="On the claim shelf"
          value={String(onShelf.length)}
          icon={PackageX}
          iconBg="warning"
          footer={<span className="text-xs text-slate-500">{formatCompact(claimValue(onShelf))} not yet sent</span>}
        />
        <StatCard
          label="With supplier"
          value={String(withSupplier.length)}
          icon={Send}
          iconBg="info"
          footer={<span className="text-xs text-slate-500">{formatCompact(claimValue(withSupplier))} awaiting a decision</span>}
        />
        <StatCard
          label="Money tied up"
          value={formatCompact(claimValue(open))}
          icon={Clock}
          iconBg="yellow"
          footer={<span className="text-xs text-slate-500">across {open.length} open claims</span>}
        />
        <StatCard
          label="Written off"
          value={formatCompact(claimValue(lost))}
          icon={TrendingDown}
          iconBg="danger"
          footer={<span className="text-xs text-slate-500">{lost.length} refused by suppliers</span>}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3 mb-5">
        {/* Which supplier actually honours claims */}
        <Card className="lg:col-span-2">
          <CardBody>
            <h2 className="text-base font-semibold text-navy-900 dark:text-white">
              How each supplier settles
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
              Worth a look before the next purchase order — a cheap supplier who refuses
              half your claims is not cheap.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-navy-700 text-left">
                    <th className="pb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400">Supplier</th>
                    <th className="pb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Sent</th>
                    <th className="pb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Refused</th>
                    <th className="pb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Honoured</th>
                    <th className="pb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Avg days</th>
                    <th className="pb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Stuck</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
                  {scorecard.map((s) => (
                    <tr key={s.supplierId}>
                      <td className="py-2.5 text-sm text-navy-900 dark:text-white">{s.supplierName}</td>
                      <td className="py-2.5 text-right tabular text-sm">{s.sent}</td>
                      <td className="py-2.5 text-right tabular text-sm text-danger">{s.refused}</td>
                      <td className="py-2.5 text-right">
                        <span
                          className={cn(
                            "tabular text-sm font-semibold",
                            s.honourRate >= 80 ? "text-success" : s.honourRate >= 50 ? "text-warning" : "text-danger"
                          )}
                        >
                          {s.honourRate}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right tabular text-sm text-slate-600 dark:text-slate-300">
                        {s.avgDays || "—"}
                      </td>
                      <td className="py-2.5 text-right tabular text-sm text-slate-600 dark:text-slate-300">
                        {s.valueOpen > 0 ? formatCompact(s.valueOpen) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Which items keep coming back */}
        <Card>
          <CardBody>
            <h2 className="text-base font-semibold text-navy-900 dark:text-white">
              What comes back most
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
              A line that sells well and returns often is losing money quietly.
            </p>
            <div className="space-y-2.5">
              {worst.map((w, i) => (
                <div key={w.productId} className="flex items-center gap-2.5">
                  <span className="tabular text-2xs font-bold text-slate-400 w-4">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-navy-900 dark:text-white truncate">
                      {w.productName}
                    </div>
                    <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                      {w.sku} · {w.qty} pcs over {w.claims} claims
                    </div>
                  </div>
                  <span className="tabular text-xs font-semibold text-danger">
                    {formatCompact(w.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs + search */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {TABS.map((t) => {
          const count =
            t.key === "ALL"
              ? claims.length
              : t.key === "OPEN"
                ? open.length
                : claims.filter((c) => c.stage === t.key).length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                tab === t.key
                  ? "bg-navy-900 text-brand-yellow dark:bg-navy-800"
                  : "bg-white dark:bg-navy-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-navy-700 hover:border-slate-300"
              )}
            >
              {t.label} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Claim number, customer, item or code…"
              className="pl-9"
            />
          </div>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={PackageX} title="Nothing here" description="No claims match this filter." />
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((c) => <ClaimRow key={c.id} claim={c} policy={policy} />)}
        </div>
      )}

      <ClaimInDialog open={receiving} onOpenChange={setReceiving} onCreated={() => { void load(); }} />
    </>
  );
}

function ClaimRow({ claim, policy }: { claim: Claim; policy: ClaimPolicy }) {
  const age = daysSince(claim.stage === "SENT" && claim.sentOn ? claim.sentOn : claim.receivedOn);
  const overdue =
    (claim.stage === "RECEIVED" && age >= policy.remindUnsentAfterDays) ||
    (claim.stage === "SENT" && age >= policy.remindSupplierAfterDays);

  return (
    <Card className={cn("hover:border-brand-yellow/40 transition-colors", overdue && "border-warning/40")}>
      <CardBody className="py-3">
        <Link href={`/claims/${claim.id}`} className="flex flex-col lg:flex-row lg:items-center gap-3 group">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar initials={claim.customerInitials} size="md" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-navy-900 dark:text-white truncate group-hover:text-brand-yellow transition-colors">
                {claim.qty} × {claim.productName}
              </div>
              <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                {claim.claimNo} · {claim.sku} · {claim.customerName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusPill variant={CLAIM_STAGE_VARIANT[claim.stage]}>
              {CLAIM_STAGE_LABEL[claim.stage]}
            </StatusPill>
            <Badge variant="muted">{claim.reasonLabel}</Badge>
            {claim.customerOutcome === "WAITING" && (
              <Badge variant="warning">customer waiting</Badge>
            )}
            {overdue && (
              <span className="inline-flex items-center gap-1 text-2xs text-warning font-medium">
                <AlertTriangle className="size-3" />
                {age} days
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 lg:w-48 lg:justify-end">
            <div className="text-right">
              <div className="tabular text-sm font-bold text-navy-900 dark:text-white">
                {formatMoney(claim.qty * claim.unitCost)}
              </div>
              <div className="text-2xs text-slate-500 dark:text-slate-400">
                {claim.supplierName ? claim.supplierName.split(" ")[0] : formatDate(claim.receivedOn)}
              </div>
            </div>
            <ChevronRight className="size-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
      </CardBody>
    </Card>
  );
}
